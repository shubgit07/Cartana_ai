import React from 'react';
import { Clock, CheckSquare, Layers, Zap, MoreHorizontal, MessageSquare, Play } from 'lucide-react';

export default function LandingPage({ onEnterApp }) {
  const showcaseFrames = [
    'Screenshot 2026-04-01 164401.png',
    'Screenshot 2026-04-01 180657.png',
    'Screenshot 2026-04-01 180711.png',
    'Screenshot 2026-04-01 180729.png',
    'Screenshot 2026-04-01 180747.png',
    'Screenshot 2026-04-01 180816.png',
    'Screenshot 2026-04-01 180826.png',
    'Screenshot 2026-04-01 180849.png',
  ].map((fileName) => `/assets/${encodeURIComponent(fileName)}`);

  const handleTryCartana = () => {
    onEnterApp?.();
  };

  const handleSignIn = () => {
    window.alert('Sign in is coming soon.');
  };

  const handleNavItemClick = (label) => {
    window.alert(`${label} is coming soon.`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-hidden font-sans relative flex flex-col items-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      
      {/* Gradient glow at the center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Cartana</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleNavItemClick('Capabilities')}
            className="hover:text-slate-900 transition-colors"
          >
            Capabilities
          </button>
          <button
            type="button"
            onClick={() => handleNavItemClick('Use Cases')}
            className="hover:text-slate-900 transition-colors"
          >
            Use Cases
          </button>
          <button
            type="button"
            onClick={() => handleNavItemClick('Docs')}
            className="hover:text-slate-900 transition-colors"
          >
            Docs
          </button>
          <button
            type="button"
            onClick={() => handleNavItemClick('Pricing')}
            className="hover:text-slate-900 transition-colors"
          >
            Pricing
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSignIn}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={handleTryCartana}
            className="text-sm font-semibold border border-slate-200 bg-white text-slate-900 px-5 py-2.5 rounded-full shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
          >
            Try Cartana
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full flex flex-col relative z-20 items-center justify-center -mt-16 overflow-visible pointer-events-none">
        
        {/* Floating Element: Sticky Note (Top Left) */}
        <div className="absolute top-[10%] left-[2%] xl:left-[6%] w-64 bg-[#FFE87C] transform -rotate-3 rounded-md shadow-lg p-5 hidden lg:block z-0 transition-transform hover:rotate-0 hover:scale-105 duration-300">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow-md border border-red-600"></div>
          <p className="font-writing text-slate-800 text-lg leading-snug">
            Assign follow-up tasks to the design team by Friday
          </p>
        </div>

        {/* Floating Element: Reminder (Top Right) */}
        <div className="absolute top-[15%] right-[2%] xl:right-[6%] bg-white/90 backdrop-blur border border-slate-100 rounded-2xl shadow-xl p-4 hidden lg:flex flex-col gap-3 w-60 z-0 transition-transform hover:-translate-y-2 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reminders</span>
            <MoreHorizontal size={14} className="text-slate-400" />
          </div>
          <div className="flex items-start gap-3 mt-1">
            <div className="bg-rose-50 p-2 rounded-xl">
              <Clock className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-0.5">Team sync</p>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold">
                <Clock size={10} /> 1:30 PM
              </div>
            </div>
          </div>
        </div>

        {/* Floating Element: Task Card (Bottom Left) */}
        <div className="absolute bottom-[15%] left-[2%] xl:left-[8%] bg-white border border-slate-100 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-5 hidden lg:flex flex-col w-72 z-0 transition-transform hover:-translate-y-2 duration-300">
          <h3 className="text-sm font-bold text-slate-800 mb-4 inline-flex items-center gap-2">
            <CheckSquare size={16} className="text-blue-500" />
            Active Tasks
          </h3>
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center text-center leading-none">B</span>
                  <span className="text-xs font-semibold text-slate-700">Frontend bug fixes</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                <span>Due tomorrow</span>
                <span>60%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[60%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Element: Integrations (Bottom Right) */}
        <div className="absolute bottom-[10%] right-[3%] xl:right-[10%] bg-white border border-slate-100 rounded-2xl shadow-xl p-5 hidden lg:flex flex-col w-64 z-0 transition-transform hover:scale-105 duration-300">
          <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Connects with</p>
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
              <Layers className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
               <span className="font-black text-rose-500 text-lg">31</span>
            </div>
          </div>
          <p className="text-center text-xs font-semibold text-slate-400 mt-4 pt-4 border-t border-slate-50">
            Team tools / Slack / Calendar
          </p>
        </div>

        <div className="text-center max-w-3xl px-4 relative z-10 flex flex-col items-center pointer-events-auto">
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#1E293B] tracking-tight leading-[1.1] mb-6">
            Turn conversations into <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E293B] to-[#3B82F6]">actionable tasks</span>
          </h1>
          
          <h2 className="text-2xl md:text-4xl font-semibold text-slate-400 tracking-tight mb-6">
            Extract, assign, and track work automatically
          </h2>

          <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Cartana converts natural language into structured tasks with deadlines, priorities, and ownership — all in one place.
          </p>

          <button 
            type="button"
            onClick={handleTryCartana}
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl text-lg hover:bg-blue-700 transition-all shadow-[0_8px_30px_rgba(37,99,235,0.24)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.32)] active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Try Cartana <Play size={18} fill="currentColor" />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>

          <div className="hero-showcase-shell mt-12 md:mt-14 w-full max-w-5xl">
            <div className="hero-showcase-frame">
              {showcaseFrames.map((frame, index) => (
                <img
                  key={frame}
                  src={frame}
                  alt={`Cartana product screenshot ${index + 1}`}
                  className="hero-showcase-slide"
                  style={{ '--frame-delay': `${index * 4}s` }}
                />
              ))}
              <div className="hero-showcase-vignette" aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
