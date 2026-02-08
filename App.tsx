import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ReportView } from './components/ReportView';
import { CameraCapture } from './components/CameraCapture';
import { AboutModal } from './components/AboutModal';
import { LiveAssistant } from './components/LiveAssistant';
import { analyzeWaterImage } from './services/geminiService';
import { AnalysisState } from './types';

type InputMode = 'upload' | 'camera';
type Granularity = 'Standard' | 'Expert';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('Standard');
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    data: null,
    resources: null,
    sources: [],
    error: null,
    mode: 'Live'
  });
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [showAbout, setShowAbout] = useState(false);
  
  // Sidebar State - Calibrated for professional workspace balance
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme Sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);

  // Resize Handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.min(Math.max(e.clientX, 300), 700);
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const validateAndSetFile = useCallback((selectedFile: File) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setAnalysisState(prev => ({
        ...prev,
        status: 'error',
        error: "Invalid format. Use JPG, PNG, or MP4."
      }));
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null, mode: 'Live' });
    setActiveStream(null); 
  }, []);

  const handleCameraError = useCallback((err: string) => {
    setAnalysisState(prev => ({ ...prev, error: err }));
  }, []);

  const handleStreamReady = useCallback((stream: MediaStream) => {
    setActiveStream(stream);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!file) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (preview) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalysisState(prev => ({ ...prev, status: 'analyzing', error: null }));
    try {
      const result = await analyzeWaterImage(file, context, granularity);
      setAnalysisState({ 
        status: 'complete', 
        data: result.report, 
        sources: result.sources,
        resources: null,
        error: null,
        mode: result.mode
      });
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    } catch (err: any) {
      setAnalysisState(prev => ({ 
        ...prev,
        status: 'error', 
        error: err.message || "Sensor analysis failed." 
      }));
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setContext('');
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null, mode: 'Live' });
    setIsSidebarOpen(true);
    setActiveStream(null);
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className={`flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-cyan-500/30 overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <Header 
        onOpenAbout={() => setShowAbout(true)} 
        theme={theme} 
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
      />
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
        
        {/* Mobile Floating Toggle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`lg:hidden fixed bottom-24 right-6 z-[70] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-2 ${
            isSidebarOpen ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 rotate-180' : 'bg-cyan-600 border-cyan-400 text-white'
          }`}
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>

        {/* Sidebar Architecture */}
        <aside 
          style={{ 
            width: isSidebarOpen ? `${sidebarWidth}px` : (window.innerWidth >= 1024 ? '12px' : '0px'),
            flexBasis: isSidebarOpen ? `${sidebarWidth}px` : (window.innerWidth >= 1024 ? '12px' : '0px')
          }}
          className={`
          absolute lg:relative inset-0 z-50 lg:z-auto
          h-full flex-shrink-0 
          bg-white dark:bg-slate-950
          lg:border-r border-slate-200 dark:border-slate-800/60 
          flex flex-col min-h-0 backdrop-blur-3xl
          transition-[width,flex-basis,transform] duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-visible group/sidebar
        `}>
          
          <div
            onMouseDown={startResizing}
            className={`
              hidden lg:flex absolute top-0 -right-4 bottom-0 w-8 z-[70] 
              items-center justify-center cursor-col-resize group/handle
            `}
            title={isSidebarOpen ? "Drag to Resize / Click Arrow to Toggle" : "Expand Telemetry"}
          >
            <div className={`
              h-32 w-1.5 rounded-full transition-all duration-500
              ${isResizing 
                ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] scale-y-110' 
                : isSidebarOpen 
                  ? 'bg-slate-200 dark:bg-slate-800 group-hover/handle:bg-cyan-500/50' 
                  : 'bg-cyan-600 group-hover/handle:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]'}
            `}></div>
            
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarOpen(!isSidebarOpen);
              }}
              className={`
                absolute left-2.5 w-6 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 
                rounded-full flex items-center justify-center transition-all duration-500
                cursor-pointer active:scale-95
                ${!isSidebarOpen ? 'rotate-180 opacity-100' : 'opacity-0 group-hover/sidebar:opacity-100'}
              `}>
               <svg className={`w-3.5 h-3.5 transition-colors ${isSidebarOpen ? 'text-slate-400 dark:text-slate-500 group-hover/handle:text-cyan-400' : 'text-cyan-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>

          <div 
            style={{ width: `${sidebarWidth}px` }} 
            className={`h-full flex flex-col flex-shrink-0 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="flex-1 overflow-y-auto custom-scroll p-6 sm:p-8 space-y-8 sm:space-y-10 pb-24 lg:pb-8">
              <div className="space-y-2 border-b border-slate-200 dark:border-slate-800/50 pb-6">
                 <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
                    TELEMETRY_SCAN
                 </h2>
                 <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] font-mono font-bold">Field Deployment Ready</p>
                 </div>
              </div>

              <div className="space-y-8">
                {!preview ? (
                  <div className="space-y-6">
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/50 shrink-0">
                      <button 
                        onClick={() => setInputMode('upload')} 
                        className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'upload' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-300'}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        IMPORT
                      </button>
                      <button 
                        onClick={() => setInputMode('camera')} 
                        className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'camera' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-300'}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        SCANNER
                      </button>
                    </div>

                    <div className="aspect-[4/3] w-full relative">
                      {inputMode === 'upload' ? (
                        <div 
                          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                          className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-200 dark:border-slate-800/50 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900/40 shadow-inner'}`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4 transition-transform hover:scale-110">
                            <svg className="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          </div>
                          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Drop Forensic Media</p>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                        </div>
                      ) : (
                        <div className="h-full">
                          <CameraCapture 
                            onCapture={validateAndSetFile} 
                            onError={handleCameraError} 
                            onStreamReady={handleStreamReady}
                          />
                        </div>
                      )}
                    </div>

                    {inputMode === 'camera' && !preview && (
                       <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 p-5 rounded-2xl space-y-3 animate-pulse">
                          <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest leading-none">AQUA-OPTIC Active</p>
                          <p className="text-[12px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Stabilize the lens for precision sheen detection and multi-point impact triangulation.</p>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="relative group rounded-[32px] border border-slate-200 dark:border-slate-800/80 overflow-hidden bg-black aspect-[4/3] shadow-2xl">
                    {isVideo ? (
                      <video src={preview} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={preview} alt="Sample" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={reset} className="p-3 bg-red-600 hover:bg-red-500 border border-red-400/50 rounded-2xl transition-all text-white shadow-xl flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover:block">PURGE</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Inference Granularity</p>
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/50">
                      <button onClick={() => setGranularity('Standard')} className={`flex-1 py-2.5 text-[11px] font-black rounded-lg transition-all ${granularity === 'Standard' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-400 dark:text-slate-500 hover:text-slate-300'}`}>STANDARD</button>
                      <button onClick={() => setGranularity('Expert')} className={`flex-1 py-2.5 text-[11px] font-black rounded-lg transition-all ${granularity === 'Expert' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 dark:text-slate-500 hover:text-slate-300'}`}>EXPERT</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">METADATA</label>
                      <span className="text-[9px] font-bold text-cyan-800 dark:text-cyan-800 uppercase tracking-widest px-2.5 py-1 bg-cyan-100 dark:bg-cyan-950/20 rounded-lg border border-cyan-200 dark:border-cyan-900/30">Optional</span>
                    </div>
                    <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Enter site conditions, odor profiles, or upstream anomalies..." className="w-full h-32 lg:h-40 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-[24px] p-5 text-[14px] text-slate-900 dark:text-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-none placeholder:text-slate-200 dark:placeholder:text-slate-800 font-medium shadow-sm" />
                  </div>

                  <button 
                    onClick={handleAnalyze} 
                    disabled={!file || analysisState.status === 'analyzing'} 
                    className={`w-full py-5 rounded-[24px] font-black text-[13px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group shadow-2xl ${!file || analysisState.status === 'analyzing' ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 grayscale' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40 active:scale-95'}`}
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {analysisState.status === 'analyzing' && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                      {analysisState.status === 'analyzing' ? 'SYNTHESIZING...' : 'EXECUTE SCAN'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Workspace Hub Architecture */}
        <section className={`flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-950 relative overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen && window.innerWidth < 1024 ? 'opacity-20 pointer-events-none blur-xl' : 'opacity-100'}`}>
          <div className="flex-1 overflow-y-auto custom-scroll p-6 sm:p-10 lg:p-14 relative z-10">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className="h-full flex flex-col max-w-5xl mx-auto">
                {analysisState.status === 'analyzing' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 animate-fade-in-up">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                      <div className="absolute inset-0 border-[8px] border-cyan-500/5 rounded-full"></div>
                      <div className="absolute inset-0 border-[8px] border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-4 border-[1px] border-cyan-500/20 rounded-full animate-pulse flex items-center justify-center">
                        <svg className="w-10 h-10 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Analyzing Multi-Modal Telemetry</h3>
                      <p className="text-slate-500 max-w-sm sm:max-w-xl mx-auto leading-relaxed text-base sm:text-lg font-medium italic opacity-80">Accessing forensic databases and corroborating geospatial sensors via Gemini 3 Pro Oracle...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10 sm:space-y-16 py-8 lg:py-12">
                    <div className="space-y-6 sm:space-y-8 flex flex-col items-start text-left">
                      <div className="inline-flex px-5 py-2 rounded-full bg-cyan-100 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest shadow-lg shadow-cyan-950/10">Sovereign Sentinel Active</div>
                      <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">
                        Next-Gen <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
                          Water Impact Intelligence
                        </span>
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl lg:text-2xl leading-relaxed max-w-3xl font-medium tracking-tight">
                        Enterprise field screening for rapid triage and ecological risk prioritization using multimodal reasoning engines.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                      {[
                        { title: 'OPTICAL SIGNATURES', text: 'Sub-millimeter pattern detection of surface contaminants and sheens.', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                        { title: 'BIOLOGICAL RISK', text: 'Computational impact forecasting for aquatic and human safety.', icon: 'M9 12l2 2 4-4' },
                        { title: 'FORENSIC GROUNDING', text: 'Geospatial verification via Gemini and dynamic Maps integration.', icon: 'M17.657 16.657L13.414 20.9' }
                      ].map((item, i) => (
                        <div key={i} className="group p-8 sm:p-10 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40 rounded-[40px] space-y-6 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 shadow-xl dark:shadow-2xl">
                          <div className="w-14 h-14 bg-cyan-50 dark:bg-cyan-950/40 rounded-[18px] border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                             <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-widest leading-none">{item.title}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed font-semibold">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="h-20 shrink-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 px-8 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono z-50 overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${analysisState.status === 'complete' ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></span>
            <span className="tracking-[0.2em] font-black uppercase whitespace-nowrap">{analysisState.status === 'complete' ? 'FORENSIC_LINK_READY' : 'SCANNER_CONNECTED'}</span>
          </div>
          
          <div className="h-6 w-px bg-slate-100 dark:bg-slate-900"></div>

          <div className="flex items-center">
            <LiveAssistant 
              agentType={analysisState.status === 'complete' ? 'LOGIC' : 'OPTIC'}
              reportContext={analysisState.data ? JSON.stringify(analysisState.data) : 'General Field Guidance'} 
              videoStream={analysisState.status === 'complete' ? null : activeStream}
            />
          </div>
        </div>
        
        <div className="text-slate-200 dark:text-slate-800 font-black tracking-[0.4em] whitespace-nowrap hidden sm:block uppercase opacity-50">©2024 ENV-SYS INTELLIGENCE SYSTEM v1.2</div>
      </footer>
    </div>
  );
}

export default App;