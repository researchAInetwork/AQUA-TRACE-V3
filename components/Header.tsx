import React from 'react';

interface HeaderProps {
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAbout }) => {
  return (
    <header className="h-14 sm:h-16 border-b border-slate-900 bg-slate-950 flex-shrink-0 z-[60]">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-[0.2em] sm:tracking-[0.3em] text-white uppercase leading-none">AQUA-TRACE</h1>
            <p className="hidden sm:block text-[9px] text-cyan-500 font-mono tracking-widest uppercase mt-1.5 font-bold">Impact Intelligence v1.2</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-4 sm:gap-8">
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-600 uppercase font-black tracking-tighter">Model Profile</span>
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">Gemini 3 Pro</span>
            </div>
            <div className="h-6 w-px bg-slate-900"></div>
          </div>
          
          <button 
            onClick={onOpenAbout}
            className="group px-3 sm:px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2.5 shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-700 group-hover:text-cyan-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden xs:inline">System Info</span>
            <span className="xs:hidden">Info</span>
          </button>
        </nav>
      </div>
    </header>
  );
};