import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MessageSquare } from 'lucide-react';
import TaskChat from './TaskChat';

const API_URL = 'http://localhost:8000';

export default function ChatWorkspace({ currentUser, preferredMemberId, onPreferredMemberHandled }) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isManager = currentUser?.role === 'MANAGER';

  const fetchMembers = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const resp = await axios.get(`${API_URL}/chat/members?user_id=${currentUser.id}`);
      setMembers(resp.data || []);
    } catch (err) {
      console.error('Failed to fetch chat members', err);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!members.length) {
      setSelectedMember(null);
      return;
    }

    if (preferredMemberId) {
      const preferred = members.find((m) => m.member.id === preferredMemberId);
      if (preferred) {
        setSelectedMember(preferred.member);
        if (onPreferredMemberHandled) onPreferredMemberHandled();
        return;
      }
    }

    if (!selectedMember || !members.some((m) => m.member.id === selectedMember.id)) {
      setSelectedMember(members[0].member);
    }
  }, [members, preferredMemberId, selectedMember, onPreferredMemberHandled]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aTs = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTs = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTs - aTs;
    });
  }, [members]);

  if (!currentUser) return null;

  return (
    <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm min-h-[520px] max-h-[600px] flex overflow-hidden">
      {isManager && (
        <aside className="w-[280px] border-r border-slate-200 bg-slate-50/70 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide">Team Chat</h3>
            <p className="text-xs text-slate-500 mt-1">Select a team member to open a thread.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {isLoading && <p className="text-xs text-slate-400 px-2 py-3">Loading members...</p>}
            {!isLoading && sortedMembers.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-3">No employee threads available.</p>
            )}
            {sortedMembers.map((item) => {
              const active = selectedMember?.id === item.member.id;
              return (
                <button
                  key={item.member.id}
                  onClick={() => setSelectedMember(item.member)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    active
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{item.member.username}</p>
                    {item.last_message_at && (
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(item.last_message_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{item.last_message_preview || 'No messages yet'}</p>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      <section className="flex-1 min-w-0">
        {selectedMember ? (
          <TaskChat currentUser={currentUser} selectedMember={selectedMember} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
            <MessageSquare size={36} className="mb-3" />
            <p className="text-sm font-semibold text-slate-600">No conversation selected</p>
            <p className="text-xs mt-1">
              {isManager
                ? 'Choose a team member from the list to open chat.'
                : 'Manager chat will appear here when available.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
