import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, RefreshCw, X } from 'lucide-react';

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000';

export default function TaskChat({ task, currentUser, connectedWith, onTaskUpdated, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const resp = await axios.get(`${API_URL}/tasks/${task.id}/messages`);
      setMessages(resp.data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current) {
        wsRef.current.close();
    }
    
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
    }
    
    const ws = new WebSocket(`${WS_URL}/ws/tasks/${task.id}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      // Send required auth
      ws.send(JSON.stringify({
        type: "auth",
        user_id: currentUser.id
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "chat_message") {
          setMessages(prev => [...prev, payload.data]);
        } else if (payload.type === "task_updated") {
          if (onTaskUpdated) onTaskUpdated(payload.data);
        }
      } catch (err) {
        console.error("Error parsing WS message", err);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
      }, 3000);
    };
    
    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      setIsConnected(false);
    };
    
    wsRef.current = ws;
  };

  useEffect(() => {
    fetchMessages();
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
          wsRef.current.close();
      }
    };
  }, [task.id, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !isConnected) return;
    
    wsRef.current.send(JSON.stringify({
      type: "chat_message",
      content: inputText.trim()
    }));
    
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
      <div className="h-16 px-5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Task Discussion</h4>
          <p className="text-xs text-slate-500 mt-0.5">Connected with {connectedWith}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
             <button onClick={connectWebSocket} className="text-[11px] text-blue-600 flex items-center gap-1 hover:underline font-medium">
               <RefreshCw size={10} /> Reconnecting...
             </button>
          )}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} title={isConnected ? "Connected" : "Disconnected"} />
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close chat panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar bg-slate-50/70 leading-tight">
        {messages.length === 0 ? (
          <p className="text-xs text-center text-slate-400 mt-8 italic">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                }`}>
                  <p>{msg.content}</p>
                </div>
                {!isMe && msg.sender && (
                  <span className="text-[10px] text-slate-400 font-medium ml-1 mt-1">{msg.sender.username}</span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="relative px-4 py-3 border-t border-slate-200 bg-white flex items-center">
        <input 
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={!isConnected}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          className="w-full bg-white border border-slate-300 rounded-full pl-4 pr-11 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 transition-all font-medium"
        />
        <button 
          type="submit" 
          disabled={!inputText.trim() || !isConnected}
          className="absolute right-5 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-200"
        >
          <Send size={14} className="ml-0.5" />
        </button>
      </form>
    </div>
  );
}
