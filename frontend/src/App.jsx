import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Home, 
  Briefcase, 
  Settings, 
  ListTodo, 
  Activity, 
  Mic, 
  Send, 
  ChevronDown, 
  User as UserIcon,
  LayoutDashboard,
  Users as UsersIcon,
  FolderKanban,
  Zap,
  Trash2
} from 'lucide-react';
import TaskStatus from './components/TaskStatus';
import KanbanBoard from './components/KanbanBoard';

const API_URL = 'http://localhost:8000';

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pipelineTrace, setPipelineTrace] = useState(null);
  const [showTrace, setShowTrace] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [backendError, setBackendError] = useState(null);

  const fetchUsers = async () => {
    try {
      console.log("Fetching users from:", `${API_URL}/users`);
      const response = await axios.get(`${API_URL}/users`);
      console.log("Fetched users response:", response);
      
      const userData = response.data;
      if (userData && Array.isArray(userData)) {
        setUsers(userData);
        setBackendError(null);
        if (userData.length > 0 && !currentUser) {
          setCurrentUser(userData[0]);
          console.log("Setting initial currentUser:", userData[0]);
        } else if (userData.length === 0) {
          setBackendError("No users found in database. Seed logic might have failed.");
        }
      } else {
        console.error("Malformed user data received:", userData);
        setBackendError("Received malformed data from server. Please check backend logs.");
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
      const msg = error.response ? `Server Error: ${error.response.status}` : error.message;
      setBackendError(`Backend Connection Failed: ${msg}. Is the server running on port 8000?`);
    }
  };

  const fetchTasks = async (userId) => {
    try {
      const url = userId ? `${API_URL}/tasks?user_id=${userId}` : `${API_URL}/tasks`;
      const response = await axios.get(url);
      setTasks(response.data);
      setBackendError(null);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setBackendError(`Task Fetch Failed: ${error.message}`);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/notes`);
      setNotes(response.data);
    } catch (error) {
      console.error("Failed to fetch notes", error);
    }
  };

  const fetchNoteData = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/notes/${id}`);
      const note = response.data;
      setPipelineTrace(note.pipeline_trace || null);
      setSelectedNoteId(id);
      // Refresh the notes list to update status
      fetchNotes();
    } catch (error) {
      console.error("Failed to fetch note data", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchNotes();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTasks(currentUser.id);
      if (currentUser.role === 'MANAGER') {
        fetchNotes();
      }
    }
  }, [currentUser]);

  const handleTaskUpdate = async (id, updateData) => {
    try {
      await axios.patch(`${API_URL}/tasks/${id}`, updateData);
      fetchTasks(currentUser?.id);
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  const handleTaskDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      fetchTasks(currentUser?.id);
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const handleNoteDelete = async (e, id) => {
    e.stopPropagation(); // Don't trigger note selection
    if (!window.confirm("Delete this input from history? (Tasks will remain untouched)")) return;
    
    try {
      await axios.delete(`${API_URL}/notes/${id}`);
      // Optimistically update UI
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setPipelineTrace(null);
        setShowTrace(false);
      }
    } catch (error) {
      console.error("Failed to delete note", error);
    }
  };

  const handleJobComplete = async () => {
    setIsProcessing(false);
    fetchTasks(currentUser?.id);
    fetchNotes();
    if (noteId) {
      await fetchNoteData(noteId);
    }
  };

  const onProcessingStarted = (data) => {
    setJobId(data.job_id);
    setNoteId(data.note_id);
    setIsProcessing(true);
    setPipelineTrace(null);
    setShowTrace(false);
    fetchNotes(); // Refresh list to show the new pending note
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || !currentUser) return;

    const formData = new FormData();
    formData.append('user_id', currentUser.id.toString());
    formData.append('text', textInput.trim());

    try {
      const response = await axios.post(`${API_URL}/process-input`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data) {
        onProcessingStarted(response.data);
        setTextInput('');
      }
    } catch (err) {
      console.error("Error submitting text", err);
    }
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  if (backendError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-rose-50 p-6">
        <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-rose-100 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
             <Activity size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Backend Unreachable</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            {backendError}
          </p>
          <button 
            onClick={() => { setBackendError(null); fetchUsers(); }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400 font-bold animate-pulse">Loading Cartana...</div>;

  const isManager = currentUser.role === 'MANAGER';

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-slate-900 font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 mb-2 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-200">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Cartana <span className="text-indigo-600 text-sm font-medium ml-1">AI</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <SidebarLink icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          {isManager && <SidebarLink icon={<FolderKanban size={20} />} label="Workspace" />}
          {isManager && <SidebarLink icon={<UsersIcon size={20} />} label="Team" />}
          <div className="pt-4 pb-2 px-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project Tools</p>
          </div>
          <SidebarLink icon={<ListTodo size={20} />} label="My Tasks" />
          <SidebarLink icon={<Activity size={20} />} label="Analytics" soon />
          <SidebarLink icon={<Settings size={20} />} label="Settings" soon />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="bg-indigo-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-indigo-700 mb-1 font-mono">MVP STATUS</p>
            <p className="text-[11px] text-indigo-600 leading-relaxed">
              Phase 1.0 Complete. <br/>Ready for Phase 1.5.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <header className="h-18 min-h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Active Workspace</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-full hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm uppercase">
                  {currentUser.username.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter -mb-1">View as:</p>
                  <p className="text-sm font-semibold text-slate-700">{currentUser.username}</p>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setCurrentUser(user);
                          setIsUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-colors ${
                          currentUser.id === user.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                          currentUser.id === user.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {user.username.charAt(0)}
                        </div>
                        {user.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-6 w-px bg-slate-200"></div>

            <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <UserIcon size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-10">
            
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Main Dashboard</h1>
              <p className="text-slate-500 font-medium">Capture ideas and orchestrate your tasks with AI.</p>
            </div>

            {/* Input Section - Refined Card */}
            {isManager && (
              <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-1 overflow-hidden transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
                <div className="p-8">
                  <div className="flex items-center gap-2 mb-6 text-indigo-600">
                      <Zap size={20} className="fill-current" />
                      <span className="text-sm font-bold uppercase tracking-[2px]">Quick Ingest</span>
                  </div>

                  <div className="relative group">
                    <textarea
                      id="text-input"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={handleTextKeyDown}
                      placeholder="Describe your meeting or project needs here... Cartana will extract the magic details."
                      className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-6 text-lg text-slate-800 placeholder-slate-400 resize-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                      rows={4}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 gap-4">
                    <div className="flex items-center gap-3">
                      <AudioRecorderButton onStarted={onProcessingStarted} disabled={isProcessing} currentUserId={currentUser.id} />
                    </div>
                    
                    <button
                      id="submit-text-btn"
                      onClick={handleTextSubmit}
                      disabled={isProcessing || !textInput.trim()}
                      className="h-12 px-8 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_14px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] active:scale-[0.98] flex items-center gap-2"
                    >
                      Extract Tasks <Send size={16} />
                    </button>
                  </div>
                </div>

                {/* Status Overlay */}
                {jobId && isProcessing && (
                  <div className="bg-slate-50/80 border-t border-slate-100 p-6">
                    <TaskStatus jobId={jobId} onComplete={handleJobComplete} />
                  </div>
                )}
              </div>
            )}

            {/* Input History - Recent Activity */}
            {isManager && notes.length > 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Activity size={20} className="text-indigo-600" />
                    Recent Activity
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notes.length} Inputs Total</span>
                </div>
                
                <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                    <div className="divide-y divide-slate-100">
                      {notes.map((note) => (
                        <div 
                          key={note.id} 
                          onClick={() => fetchNoteData(note.id)}
                          className={`p-4 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between group ${selectedNoteId === note.id ? 'bg-indigo-50/50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-indigo-700 transition-colors">
                              {note.raw_text}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-2">
                              {new Date(note.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              note.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 
                              note.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {note.status}
                            </span>
                            <button 
                              onClick={(e) => handleNoteDelete(e, note.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Delete from history"
                            >
                              <Trash2 size={14} />
                            </button>
                            <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${selectedNoteId === note.id ? 'rotate-180 text-indigo-500' : ''}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Board Section */}
            <div className="space-y-6 pb-20">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    {isManager ? 'Workspace Kanban' : 'My Tasks'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {isManager ? 'Viewing all tasks across the organization.' : `Viewing tasks assigned to ${currentUser.username}.`}
                  </p>
                </div>

                {pipelineTrace && (
                  <button
                    onClick={() => setShowTrace(!showTrace)}
                    className={`h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border ${
                      showTrace 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    <Activity size={16} />
                    {showTrace ? 'Hide Trace' : 'View Pipeline Trace'}
                  </button>
                )}
              </div>

              {/* Pipeline Trace Collapsible - Styled */}
              {showTrace && pipelineTrace && (
                <div className="bg-slate-900 rounded-[20px] p-6 overflow-hidden shadow-2xl border border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <span className="text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">Debug: Internal Pipeline Trace</span>
                    <span className="text-slate-600 text-[10px] font-mono">v1.2.0-MVP</span>
                  </div>
                  <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <pre className="text-emerald-400/90 font-mono text-sm leading-relaxed p-2">
                       {JSON.stringify(pipelineTrace, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Kanban Board Container */}
              <div className="mt-8 transition-all">
                <KanbanBoard
                  tasks={tasks}
                  users={users}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────

function SidebarLink({ icon, label, active = false, soon = false }) {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
        active 
        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' 
        : soon 
          ? 'text-slate-400 cursor-not-allowed grayscale' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
      }`}
    >
      <span className={`${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      <span className="text-[14px]">{label}</span>
      {soon && (
        <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md ml-auto mt-0.5 tracking-tighter">SOON</span>
      )}
    </a>
  );
}

// ─── Audio Recorder Button ──────────────────────────────────────────
function AudioRecorderButton({ onStarted, disabled, currentUserId }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await uploadAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAudio = async (blob) => {
    const formData = new FormData();
    formData.append('user_id', currentUserId.toString());
    formData.append('file', blob, 'recording.webm');

    try {
      const response = await axios.post(`${API_URL}/process-input`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data) {
        onStarted(response.data);
      }
    } catch (err) {
      console.error("Error uploading audio", err);
    }
  };

  return (
    <button
      id="audio-record-btn"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled && !isRecording}
      className={`h-12 px-6 rounded-xl font-bold text-sm transition-all flex items-center gap-3 border-2 ${
        isRecording
        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-[0_0_20px_rgba(225,29,72,0.15)] animate-pulse'
        : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-rose-600 animate-ping' : 'bg-slate-300'}`}></div>
      {isRecording ? 'Stop Recording' : 'Record Audio'}
      <Mic size={18} className={isRecording ? 'text-rose-600' : 'text-slate-400'} />
    </button>
  );
}
