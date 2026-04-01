import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Activity,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Mic,
  Send,
  Settings,
  Trash2,
  User as UserIcon,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import TaskStatus from "./TaskStatus";
import KanbanBoard from "./KanbanBoard";
import ChatWorkspace from "./ChatWorkspace";

const API_URL = "http://localhost:8000";

export default function ManagerDashboard({ onBackToLanding }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pipelineTrace, setPipelineTrace] = useState(null);
  const [showTrace, setShowTrace] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState([]);
  const [noteHeights, setNoteHeights] = useState({});
  const [backendError, setBackendError] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [preferredChatMemberId, setPreferredChatMemberId] = useState(null);

  const noteContentRefs = useRef({});
  const isManager = currentUser?.role === "MANAGER";

  const measureExpandedHeights = () => {
    setNoteHeights((prev) => {
      const next = { ...prev };
      expandedNoteIds.forEach((id) => {
        const element = noteContentRefs.current[id];
        if (element) {
          next[id] = element.scrollHeight;
        }
      });
      return next;
    });
  };

  const toggleNoteExpansion = (id) => {
    setExpandedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((noteIdValue) => noteIdValue !== id) : [...prev, id]
    );
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      const userData = response.data;

      if (Array.isArray(userData)) {
        setUsers(userData);
        setBackendError(null);

        if (!currentUser && userData.length > 0) {
          const managerUser = userData.find((user) => user.role === "MANAGER");
          setCurrentUser(managerUser || userData[0]);
        }

        if (userData.length === 0) {
          setBackendError("No users found in database.");
        }
      } else {
        setBackendError("Received malformed user data from backend.");
      }
    } catch (error) {
      const message = error.response ? `Server Error: ${error.response.status}` : error.message;
      setBackendError(`Backend Connection Failed: ${message}`);
    }
  };

  const fetchTasks = async (userId) => {
    try {
      const url = userId ? `${API_URL}/tasks?user_id=${userId}` : `${API_URL}/tasks`;
      const response = await axios.get(url);
      setTasks(response.data || []);
      setBackendError(null);
    } catch (error) {
      setBackendError(`Task Fetch Failed: ${error.message}`);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/notes`);
      setNotes(response.data || []);
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
      if (currentUser.role === "MANAGER") {
        fetchNotes();
      }
      setPreferredChatMemberId(null);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isManager) {
      setPipelineTrace(null);
      setShowTrace(false);
      return;
    }

    if (!notes.length) {
      setPipelineTrace(null);
      return;
    }

    const hasTrace = (trace) => Boolean(trace && typeof trace === "object" && Object.keys(trace).length > 0);

    if (selectedNoteId) {
      const selectedNote = notes.find((note) => note.id === selectedNoteId);
      if (selectedNote) {
        setPipelineTrace(hasTrace(selectedNote.pipeline_trace) ? selectedNote.pipeline_trace : null);
        return;
      }
    }

    const latestNoteWithTrace = [...notes]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .find((note) => hasTrace(note.pipeline_trace));

    setPipelineTrace(latestNoteWithTrace ? latestNoteWithTrace.pipeline_trace : null);
  }, [notes, selectedNoteId, isManager]);

  useEffect(() => {
    measureExpandedHeights();
  }, [expandedNoteIds, notes]);

  useEffect(() => {
    const handleResize = () => measureExpandedHeights();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expandedNoteIds]);

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

  const handleNoteDelete = async (event, id) => {
    event.stopPropagation();
    if (!window.confirm("Delete this input from history? (Tasks will remain untouched)")) return;

    try {
      await axios.delete(`${API_URL}/notes/${id}`);
      setNotes((prev) => prev.filter((note) => note.id !== id));
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
    fetchNotes();
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || !currentUser) return;

    const formData = new FormData();
    formData.append("user_id", currentUser.id.toString());
    formData.append("text", textInput.trim());

    try {
      const response = await axios.post(`${API_URL}/process-input`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data) {
        onProcessingStarted(response.data);
        setTextInput("");
      }
    } catch (error) {
      console.error("Error submitting text", error);
    }
  };

  const handleTextKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
          <p className="text-slate-500 font-medium leading-relaxed">{backendError}. Is backend running on port 8000?</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setBackendError(null);
                fetchUsers();
              }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              Retry Connection
            </button>
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="w-full py-3 border border-slate-300 text-slate-700 rounded-2xl font-semibold hover:bg-slate-50 transition-all"
              >
                Back to Landing
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400 font-bold animate-pulse">
        Loading Cartana manager dashboard...
      </div>
    );
  }

  const hasPipelineTrace = Boolean(
    pipelineTrace && typeof pipelineTrace === "object" && Object.keys(pipelineTrace).length > 0
  );

  return (
    <div className="flex h-screen bg-[#F5F7FA] text-[#0F172A] font-sans overflow-hidden">
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 mb-2 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-200">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Cartana <span className="text-blue-600 text-sm font-medium ml-1">AI</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <SidebarLink
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activeView === "dashboard"}
            onClick={() => setActiveView("dashboard")}
          />
          <SidebarLink
            icon={<MessageSquare size={20} />}
            label="Chat"
            active={activeView === "chat"}
            onClick={() => setActiveView("chat")}
          />
          {isManager && <SidebarLink icon={<FolderKanban size={20} />} label="Workspace" />}
          {isManager && <SidebarLink icon={<UsersIcon size={20} />} label="Team" />}
          <div className="pt-4 pb-2 px-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project Tools</p>
          </div>
          <SidebarLink icon={<ListTodo size={20} />} label="My Tasks" />
          <SidebarLink icon={<Activity size={20} />} label="Analytics" soon />
          <SidebarLink icon={<Settings size={20} />} label="Settings" soon />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-18 min-h-[72px] bg-white/85 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Active Workspace</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-full hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm uppercase">
                  {currentUser.username.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter -mb-1">View as:</p>
                  <p className="text-sm font-semibold text-slate-700">{currentUser.username}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}
                />
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
                          currentUser.id === user.id
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            currentUser.id === user.id
                              ? "bg-blue-200 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {user.username.charAt(0)}
                        </div>
                        {user.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <UserIcon size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F5F7FA] p-4 md:p-8 scroll-smooth">
          {activeView === "chat" && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Chat</h1>
                <p className="text-slate-500 font-medium">
                  {isManager
                    ? "Select a team member to open their dedicated conversation."
                    : "You can chat with your manager here."}
                </p>
              </div>
              <ChatWorkspace
                currentUser={currentUser}
                preferredMemberId={preferredChatMemberId}
                onPreferredMemberHandled={() => setPreferredChatMemberId(null)}
              />
            </div>
          )}

          <div className={`max-w-6xl mx-auto space-y-10 ${activeView === "chat" ? "hidden" : ""}`}>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Manager Dashboard</h1>
              <p className="text-slate-500 font-medium">Capture ideas and orchestrate your tasks with AI.</p>
            </div>

            {isManager && (
              <div className="bg-[linear-gradient(145deg,#f8fbff,#eef2ff)] rounded-[20px] border border-slate-200/80 p-1 overflow-hidden transition-all duration-200 ease-in-out shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
                <div className="p-8">
                  <div className="group flex items-center gap-2 mb-6 text-[#3B82F6]">
                    <Zap
                      size={20}
                      className="fill-current opacity-80 transition-all duration-200 ease-in-out group-hover:opacity-100"
                    />
                    <span className="text-sm font-semibold uppercase tracking-[2px] text-slate-700">Quick Ingest</span>
                  </div>

                  <div className="relative group">
                    <textarea
                      id="text-input"
                      value={textInput}
                      onChange={(event) => setTextInput(event.target.value)}
                      onKeyDown={handleTextKeyDown}
                      spellCheck={false}
                      placeholder="Describe your meeting or project needs here... Cartana will extract structured tasks."
                      className="w-full bg-white/90 border border-[#3B82F6] rounded-2xl px-6 py-5 text-base md:text-lg text-[#0F172A] placeholder:text-slate-400 resize-none focus:border-[#3B82F6] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] focus:bg-white transition-all duration-200 ease-in-out outline-none"
                      rows={4}
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4">
                    <div className="flex items-center gap-3">
                      <AudioRecorderButton
                        onStarted={onProcessingStarted}
                        disabled={isProcessing}
                        currentUserId={currentUser.id}
                      />
                    </div>

                    <button
                      id="submit-text-btn"
                      onClick={handleTextSubmit}
                      disabled={isProcessing || !textInput.trim()}
                      className="group relative overflow-hidden h-12 sm:h-13 px-8 rounded-xl bg-[#3B82F6] text-white text-sm font-semibold border border-blue-400/40 hover:bg-blue-400 disabled:bg-[#3B82F6] disabled:text-white disabled:border-blue-400/40 disabled:cursor-not-allowed transition-all duration-200 ease-in-out shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60 active:scale-[0.97] active:bg-blue-300 inline-flex items-center justify-center gap-2"
                    >
                      <span className="absolute inset-0 bg-white/30 opacity-0 active:opacity-100 transition-opacity duration-75 rounded-xl pointer-events-none" />
                      <span className="relative flex items-center gap-2 z-10">
                        Extract Tasks <Send size={16} className="text-white opacity-90" />
                      </span>
                    </button>
                  </div>
                </div>

                {jobId && isProcessing && (
                  <div className="bg-slate-50/80 border-t border-slate-100 p-6">
                    <TaskStatus jobId={jobId} onComplete={handleJobComplete} />
                  </div>
                )}
              </div>
            )}

            {isManager && notes.length > 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Activity size={20} className="text-blue-600" />
                    Recent Activity
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notes.length} Inputs Total</span>
                </div>

                <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                    <div className="p-2 space-y-2">
                      {notes.map((note) => {
                        const isExpanded = expandedNoteIds.includes(note.id);

                        return (
                          <div
                            key={note.id}
                            className={`rounded-xl border-l-4 transition-all group ${
                              selectedNoteId === note.id ? "bg-blue-50/60 border-blue-500" : "border-transparent hover:bg-slate-50"
                            }`}
                          >
                            <button
                              onClick={() => {
                                fetchNoteData(note.id);
                                toggleNoteExpansion(note.id);
                              }}
                              className="w-full p-4 text-left flex items-start justify-between gap-3"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-700 transition-colors">
                                  {note.raw_text}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-2">
                                  {new Date(note.created_at).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                    note.status === "processed"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : note.status === "pending"
                                      ? "bg-amber-100 text-amber-700 animate-pulse"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {note.status}
                                </span>
                                <span
                                  className={`text-slate-300 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180 text-blue-500" : ""
                                  }`}
                                >
                                  <ChevronDown size={14} />
                                </span>
                              </div>
                            </button>

                            <div
                              style={{ maxHeight: isExpanded ? `${noteHeights[note.id] || 0}px` : "0px" }}
                              className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                            >
                              <div
                                ref={(element) => {
                                  noteContentRefs.current[note.id] = element;
                                }}
                                className="px-4 pb-4"
                              >
                                <div className="rounded-xl bg-white border border-slate-200 p-3">
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                    {note.raw_text}
                                  </p>
                                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                                    <button
                                      onClick={(event) => handleNoteDelete(event, note.id)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Delete from history"
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6 pb-20">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    {isManager ? "Workspace Kanban" : "My Tasks"}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {isManager
                      ? "Viewing all tasks across the organization."
                      : `Viewing tasks assigned to ${currentUser.username}.`}
                  </p>
                </div>

                {isManager && (
                  <button
                    onClick={() => {
                      if (!hasPipelineTrace) return;
                      setShowTrace(!showTrace);
                    }}
                    disabled={!hasPipelineTrace}
                    className={`h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all border ${
                      !hasPipelineTrace
                        ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                        : showTrace
                        ? "bg-slate-800 text-white border-slate-800 shadow-lg"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    <Activity size={16} />
                    {showTrace ? "Hide Trace" : "View Pipeline Trace"}
                  </button>
                )}
              </div>

              {showTrace && pipelineTrace && (
                <div className="bg-slate-900 rounded-[20px] p-6 overflow-hidden shadow-2xl border border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <span className="text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">Debug: Internal Pipeline Trace</span>
                    <span className="text-slate-600 text-[10px] font-mono">v1.2.0-MVP</span>
                  </div>
                  <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <pre className="text-emerald-400/90 font-mono text-sm leading-relaxed p-2">
                      {JSON.stringify(pipelineTrace, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="mt-8 transition-all">
                <KanbanBoard
                  tasks={tasks}
                  users={users}
                  currentUser={currentUser}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  onOpenChat={(memberId) => {
                    setPreferredChatMemberId(memberId);
                    setActiveView("chat");
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ icon, label, active = false, soon = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
        active
          ? "bg-blue-50 text-blue-700 font-bold shadow-sm"
          : soon
          ? "text-slate-400 cursor-not-allowed grayscale"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
      }`}
    >
      <span className={`${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>{icon}</span>
      <span className="text-[14px]">{label}</span>
      {soon && (
        <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md ml-auto mt-0.5 tracking-tighter">SOON</span>
      )}
    </button>
  );
}

function AudioRecorderButton({ onStarted, disabled, currentUserId }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const fileInputRef = React.useRef(null);

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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        await uploadAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const uploadAudio = async (blob, fileName = "recording.webm") => {
    const formData = new FormData();
    formData.append("user_id", currentUserId.toString());
    formData.append("file", blob, fileName);

    try {
      setIsUploading(true);
      const response = await axios.post(`${API_URL}/process-input`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data) {
        onStarted(response.data);
      }
    } catch (error) {
      console.error("Error uploading audio", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (!isRecording && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadAudio(file, file.name);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="audio-record-btn"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={(disabled && !isRecording) || isUploading}
          className={`group h-12 sm:h-13 min-w-[170px] px-6 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 ease-in-out inline-flex items-center justify-center gap-2.5 border focus-visible:outline-none focus-visible:ring-2 ${
            isRecording
              ? "bg-blue-100 text-blue-700 border-[#3B82F6] hover:bg-blue-200/80 hover:text-blue-800 shadow-[0_0_14px_rgba(59,130,246,0.22)] focus-visible:ring-blue-300/60"
              : "bg-white/80 text-[#3B82F6] border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.08)] hover:border-[#3B82F6] hover:text-[#2563EB] shadow-[0_4px_12px_rgba(59,130,246,0.08)] hover:shadow-[0_0_10px_rgba(59,130,246,0.18)] focus-visible:ring-blue-300/60"
          } disabled:bg-slate-200/80 disabled:text-slate-400 disabled:border-slate-300 disabled:shadow-none disabled:cursor-not-allowed`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isRecording ? "bg-blue-600 animate-pulse" : "bg-[#3B82F6] opacity-80 group-hover:opacity-100"
            }`}
          />
          {isRecording ? "Stop Recording" : "Record Audio"}
          <Mic
            size={18}
            className={
              isRecording
                ? "text-blue-700"
                : "text-[#3B82F6] opacity-80 transition-all duration-200 ease-in-out group-hover:opacity-100"
            }
          />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isRecording || isUploading || disabled}
          className="h-12 sm:h-13 min-w-[170px] px-6 rounded-xl font-semibold text-sm tracking-wide border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/40 transition-all duration-200 ease-in-out disabled:bg-slate-200/80 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading..." : "Upload Voice Note"}
        </button>
      </div>

      {isRecording && (
        <div className="voice-eq-shell">
          <span className="text-[11px] font-semibold tracking-wide text-blue-700">Live waveform</span>
          <div className="voice-eq-bars" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => (
              <span
                key={index}
                className="voice-eq-bar"
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
