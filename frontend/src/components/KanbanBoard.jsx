import React from 'react';
import TaskCard from './TaskCard';
import { Layout } from 'lucide-react';

export default function KanbanBoard({ tasks, users, onTaskUpdate, onTaskDelete }) {
  const columns = [
    { title: 'To Do', status: 'TODO', color: 'bg-slate-400' },
    { title: 'In Progress', status: 'IN_PROGRESS', color: 'bg-indigo-500' },
    { title: 'Done', status: 'DONE', color: 'bg-emerald-500' }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[600px] w-full pb-10">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        
        return (
          <div key={col.status} className="flex-1 min-w-[300px] flex flex-col group">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-5 px-2">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-6 rounded-full ${col.color} shadow-sm transition-all group-hover:h-8`} />
                <h3 className="font-bold text-slate-700 text-[15px] tracking-tight group-hover:text-slate-900 transition-colors">
                  {col.title}
                </h3>
                <span className="bg-slate-100 text-slate-500 text-[11px] font-black px-2 py-0.5 rounded-lg border border-slate-200/50">
                  {colTasks.length}
                </span>
              </div>
              
              <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                <Layout size={14} />
              </button>
            </div>
            
            {/* Task List Container */}
            <div className="flex-1 bg-slate-50/40 rounded-[24px] p-3 border border-slate-100/80 shadow-inner flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
              {colTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  users={users}
                  onUpdate={onTaskUpdate}
                  onDelete={onTaskDelete}
                />
              ))}
              
              {colTasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-8 opacity-40">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                       <div className="w-2 h-2 rounded-full bg-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Tasks</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
