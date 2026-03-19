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
  MoreVertical,
  AlertCircle
} from 'lucide-react';

const TaskCard = ({ task, users = [], onUpdate, onDelete }) => {
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
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    const currentIndex = statuses.indexOf(task.status);
    let newIndex = currentIndex;
    
    if (direction === 'next' && currentIndex < 2) newIndex++;
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
    high: 'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-indigo-500 shadow-xl rounded-[20px] p-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-4">
          <input 
            className="w-full text-base font-bold text-slate-800 border-b-2 border-slate-100 focus:border-indigo-500 px-1 py-1 transition-all outline-none" 
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="Task title..."
          />
          <textarea 
            className="w-full text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none border border-slate-100" 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Add details..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Priority</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
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
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
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
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 text-sm font-bold shadow-md shadow-indigo-100 transition-all active:scale-95">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white border border-slate-200/60 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-indigo-200/50 rounded-[20px] p-5 transition-all duration-300 relative overflow-hidden flex flex-col gap-4">
      {/* Decorative Gradient Background (Hover) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header Info */}
      <div className="flex justify-between items-start gap-4">
        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority || 'Medium'}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
          <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-2 flex-1">
        <h3 className="text-[15px] font-bold text-slate-800 leading-snug group-hover:text-indigo-900 transition-colors">
          {task.title || 'Untitled Task'}
        </h3>
        {task.description && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {task.description}
          </p>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
            <User size={14} className="flex-shrink-0" />
            <span className="text-[11px] font-bold truncate">
              {task.assignee?.username || 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar size={14} className="flex-shrink-0" />
            <span className="text-[11px] font-bold whitespace-nowrap">{formattedDeadline}</span>
          </div>
        </div>

        {/* Move Controls */}
        <div className="flex items-center gap-1 h-8 px-1 bg-slate-50/50 rounded-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
          {task.status !== 'TODO' && (
            <button onClick={(e) => { e.stopPropagation(); handleMove('prev'); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors" title="Move back">
              <ArrowLeft size={14} />
            </button>
          )}
          <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
          {task.status !== 'DONE' && (
            <button onClick={(e) => { e.stopPropagation(); handleMove('next'); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors" title="Move forward">
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
