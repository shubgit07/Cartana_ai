import React, { useState } from 'react';
import { 
  Edit2, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  X, 
  Calendar, 
  User,
  MessageSquare
} from 'lucide-react';

const TaskCard = ({ task, users = [], currentUser, onUpdate, onDelete, onOpenChat }) => {
  if (!task) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'medium',
    assignee_id: task.assignee_id || '',
    deadline: task.deadline || ''
  });

  const handleSave = () => {
    onUpdate(task.id, formData);
    setIsEditing(false);
  };

  const handleMove = (direction) => {
    const statuses = ['NEEDS_REVIEW', 'TODO', 'IN_PROGRESS', 'DONE'];
    const currentIndex = statuses.indexOf(task.status);
    let newIndex = currentIndex;
    
    if (direction === 'next' && currentIndex < statuses.length - 1) newIndex++;
    if (direction === 'prev' && currentIndex > 0) newIndex--;
    
    if (newIndex !== currentIndex) {
      onUpdate(task.id, { status: statuses[newIndex] });
    }
  };

  const formattedDeadline = task.deadline 
    ? new Intl.DateTimeFormat('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true 
      }).format(new Date(task.deadline))
    : (task.deadline_raw || 'No deadline');

  const priorityColors = {
    high: 'bg-rose-50 text-rose-700 border-rose-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  };

  const manager = users.find((u) => u.role === 'MANAGER');
  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-500 shadow-xl rounded-[20px] p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-4">
          <input 
            className="w-full text-base font-semibold text-slate-800 border-b-2 border-slate-100 focus:border-blue-500 px-1 py-1.5 transition-all outline-none" 
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="Task title..."
          />
          <textarea 
            className="w-full text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none border border-slate-200 focus:border-blue-500" 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Add details..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Priority</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assignee</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={formData.assignee_id || ''}
                onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 text-sm font-bold shadow-md shadow-blue-100 transition-all active:scale-95">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white border border-[#E5E7EB] shadow-[0_2px_4px_rgba(15,23,42,0.03)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-[#3B82F6] rounded-[20px] p-4 transition-all duration-300 relative overflow-hidden h-full flex flex-col gap-3.5">
      {/* Decorative Gradient Background (Hover) */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-blue-50/70 rounded-full blur-3xl -mr-14 -mt-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header Info */}
      <div className="flex justify-between items-start gap-2 min-w-0">
        <div className="flex flex-wrap gap-1.5 min-w-0">
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border whitespace-nowrap ${priorityColors[task.priority] || priorityColors.medium}`}>
            {task.priority || 'Medium'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0 flex-shrink-0">
          <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <h3 className="text-[15px] font-semibold text-slate-800 leading-snug group-hover:text-slate-900 transition-colors line-clamp-1" title={task.title}>
          {task.title || 'Untitled Task'}
        </h3>
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {task.description}
          </p>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 text-slate-400 min-w-0">
            <User size={13} className="flex-shrink-0" />
            <span className="text-[10px] font-bold truncate">
              {task.assignee?.username || 'Unassigned'}
            </span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex items-center gap-1 text-slate-400 min-w-0">
            <Calendar size={13} className="flex-shrink-0" />
            <span className="text-[10px] font-bold truncate" title={formattedDeadline}>
              {formattedDeadline}
            </span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const targetMemberId = currentUser?.role === 'MANAGER' ? task.assignee_id : manager?.id;
              if (targetMemberId && onOpenChat) onOpenChat(targetMemberId);
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border transition-all text-slate-500 border-[#E5E7EB] hover:text-[#3B82F6] hover:bg-slate-50 hover:border-blue-200"
            title="Open task chat"
            aria-label="Open task chat"
          >
            <MessageSquare size={13} />
          </button>
        </div>

        {/* Move Controls */}
        <div className="flex items-center gap-0.5 h-7 px-0.5 bg-slate-50/50 rounded-lg border border-[#E5E7EB] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
          {task.status !== 'NEEDS_REVIEW' && (
            <button onClick={(e) => { e.stopPropagation(); handleMove('prev'); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors">
              <ArrowLeft size={12} />
            </button>
          )}
          {task.status !== 'NEEDS_REVIEW' && task.status !== 'DONE' && <div className="w-px h-2.5 bg-slate-200 mx-0.5" />}
          {task.status !== 'DONE' && (
            <button onClick={(e) => { e.stopPropagation(); handleMove('next'); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors">
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default TaskCard;

