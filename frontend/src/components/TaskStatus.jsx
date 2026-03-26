import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const TaskStatus = ({ jobId, onComplete }) => {
  const [status, setStatus] = useState('PENDING');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    let intervalId;

    const pollStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/status/${jobId}`);
        const data = response.data;
        
        setStatus(data.status);
        
        if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
          clearInterval(intervalId);
          setResult(data.result);
          if (data.status === 'SUCCESS' && onComplete) {
            onComplete(data.result);
          }
        }
      } catch (err) {
        console.error("Error polling task status", err);
      }
    };

    intervalId = setInterval(pollStatus, 2000);
    pollStatus();

    return () => clearInterval(intervalId);
  }, [jobId, onComplete]);

  const statusConfig = {
    SUCCESS: {
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      bg: 'bg-emerald-50 border-emerald-100',
      text: 'text-emerald-700',
      label: 'Processing Complete'
    },
    FAILURE: {
      icon: <AlertCircle size={16} className="text-rose-500" />,
      bg: 'bg-rose-50 border-rose-100',
      text: 'text-rose-700',
      label: 'Processing Failed'
    },
    PROCESSING: {
      icon: <Loader2 size={16} className="text-blue-500 animate-spin" />,
      bg: 'bg-blue-50 border-blue-100',
      text: 'text-blue-700',
      label: 'AI is Extracting Tasks'
    },
    PENDING: {
      icon: <Clock size={16} className="text-slate-400 animate-pulse" />,
      bg: 'bg-slate-50 border-slate-100',
      text: 'text-slate-600',
      label: 'Job Queued'
    }
  };

  const currentStatus = statusConfig[status] || statusConfig.PENDING;

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all duration-500 ${currentStatus.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-[#E5E7EB]">
             {currentStatus.icon}
          </div>
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${currentStatus.text}`}>
              {currentStatus.label}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {jobId}</p>
          </div>
        </div>
        
        {status === 'SUCCESS' && (
          <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-1 rounded-lg shadow-sm animate-in fade-in zoom-in duration-300">READY</span>
        )}
      </div>
      
      {status === 'FAILURE' && result && (
        <div className="mt-4 p-3 bg-white/60 rounded-xl border border-rose-100 text-rose-600 text-xs font-medium font-mono break-all leading-relaxed">
           ERR: {typeof result === 'string' ? result : JSON.stringify(result)}
        </div>
      )}

      {(status === 'PENDING' || status === 'PROCESSING') && (
        <div className="mt-4 h-1.5 w-full bg-blue-200/30 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full w-1/3 animate-[progress_2s_ease-in-out_infinite]"></div>
        </div>
      )}
    </div>
  );
};

export default TaskStatus;
