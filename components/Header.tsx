import React from 'react';

interface HeaderProps {
  onOpenAbout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAbout, theme, onToggleTheme }) => {
  return (
    <header className="h-14 sm:h-16 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 flex-shrink-0 z-[60] shadow-sm">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-[0.2em] sm:tracking-[0.3em] text-slate-900 dark:text-white uppercase leading-none">AQUA-TRACE</h1>
            <p className="hidden sm:block text-[9px] text-cyan-600 dark:text-cyan-500 font-mono tracking-widest uppercase mt-1.5 font-bold">Impact Intelligence v1.2</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-4 sm:gap-6">
          {/* Theme Toggle */}
          <button 
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="relative w-14 h-8 bg-slate-100 dark:bg-slate-900 rounded-full p-1 transition-colors border border-slate-200 dark:border-slate-800"
          >
            <div className={`
              absolute top-1 left-1 w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-md transform transition-transform flex items-center justify-center
              ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}
            `}>
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
              )}
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-tighter">Model Profile</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold uppercase tracking-widest">Gemini 3 Pro</span>
            </div>
            <div className="h-6 w-px bg-slate-100 dark:bg-slate-900"></div>
          </div>
          
          <button 
            onClick={onOpenAbout}
            className="group px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest flex items-center gap-2.5 shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-cyan-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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