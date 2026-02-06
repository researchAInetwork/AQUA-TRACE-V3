import React, { useState, useRef, useCallback } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col h-screen bg-slate-950 font-sans selection:bg-cyan-500/30 overflow-hidden">
      <Header onOpenAbout={() => setShowAbout(true)} />
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
        
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`lg:hidden fixed bottom-20 right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border ${
            isSidebarOpen ? 'bg-slate-800 border-slate-700 text-slate-400 rotate-180' : 'bg-cyan-600 border-cyan-500 text-white'
          }`}
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>

        <aside className={`
          absolute lg:relative inset-0 z-50 lg:z-auto
          w-full lg:w-[420px] h-full flex-shrink-0 
          bg-slate-950 lg:bg-slate-900/60 
          border-r border-slate-800/60 
          flex flex-col min-h-0 backdrop-blur-md
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          
          <div className="flex-1 overflow-y-auto custom-scroll p-6 sm:p-8 space-y-8 sm:space-y-10 pb-24 lg:pb-8">
            <div className="space-y-2 border-b border-slate-800/50 pb-4">
               <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_#06b6d4]"></div>
                  TELEMETRY_SCAN
               </h2>
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-mono font-bold">Field Deployment Ready</p>
            </div>

            <div className="space-y-8">
              {!preview ? (
                <div className="space-y-6">
                  <div className="flex p-1.5 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                    <button 
                      onClick={() => setInputMode('upload')} 
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'upload' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      IMPORT
                    </button>
                    <button 
                      onClick={() => setInputMode('camera')} 
                      className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'camera' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      SCANNER
                    </button>
                  </div>

                  <div className="aspect-[4/3] w-full relative">
                    {inputMode === 'upload' ? (
                      <div 
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                        className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 hover:border-slate-600 bg-slate-950/80 shadow-inner'}`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Drop Media</p>
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
                     <div className="bg-cyan-950/20 border border-cyan-900/40 p-4 rounded-xl space-y-2 animate-pulse">
                        <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">AQUA-OPTIC Active</p>
                        <p className="text-[11px] text-slate-400 font-medium">Link the Sentinel Node for real-time framing and sheen detection guidance.</p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="relative group rounded-2xl border border-slate-800 overflow-hidden bg-black aspect-[4/3] shadow-2xl">
                  {isVideo ? (
                    <video src={preview} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={preview} alt="Sample" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={reset} className="p-2.5 bg-red-600 hover:bg-red-500 border border-red-400/50 rounded-xl transition-all text-white shadow-xl">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Inference Granularity</p>
                  <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button onClick={() => setGranularity('Standard')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${granularity === 'Standard' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>STANDARD</button>
                    <button onClick={() => setGranularity('Expert')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${granularity === 'Expert' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>EXPERT</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">METADATA</label>
                    <span className="text-[8px] font-bold text-cyan-700 uppercase tracking-widest px-2 py-0.5 bg-cyan-950/30 rounded border border-cyan-900/40">Optional</span>
                  </div>
                  <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Specific odors or upstream activity..." className="w-full h-28 lg:h-36 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[13px] text-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-none placeholder:text-slate-800 font-medium" />
                </div>

                <button onClick={handleAnalyze} disabled={!file || analysisState.status === 'analyzing'} className={`w-full py-4 sm:py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group shadow-2xl ${!file ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20'}`}>
                  <div className="relative z-10">{analysisState.status === 'analyzing' ? 'SYNTHESIZING...' : 'EXECUTE SCAN'}</div>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className={`flex-1 flex flex-col min-h-0 bg-slate-950 relative overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-30 lg:opacity-100 scale-95 lg:scale-100' : 'opacity-100 scale-100'}`}>
          <div className="flex-1 overflow-y-auto custom-scroll p-6 sm:p-10 lg:p-16 relative z-10">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className="h-full flex flex-col max-w-5xl mx-auto">
                {analysisState.status === 'analyzing' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 animate-fade-in-up">
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                      <div className="absolute inset-0 border-[6px] border-cyan-500/5 rounded-full"></div>
                      <div className="absolute inset-0 border-[6px] border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">Inference Active</h3>
                      <p className="text-slate-500 max-w-xs sm:max-w-md mx-auto leading-relaxed text-sm font-medium italic">Processing multimodal telemetry via Gemini 3...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12 sm:space-y-20 py-10">
                    <div className="space-y-6 sm:space-y-8">
                      <div className="inline-flex px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-[10px] font-black text-cyan-400 uppercase tracking-widest">System Online</div>
                      <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] tracking-tighter">Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Water Impact Intelligence</span></h2>
                      <p className="text-slate-400 text-lg sm:text-xl lg:text-2xl leading-relaxed max-w-3xl font-medium">Sovereign field screening for rapid triage and risk prioritization using multimodal AI.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                      {[
                        { title: 'OPTICAL SIGNATURES', text: 'Sub-millimeter pattern detection of surface contaminants.', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                        { title: 'BIOLOGICAL RISK', text: 'Computational impact forecasting for safety.', icon: 'M9 12l2 2 4-4' },
                        { title: 'GROUNDING LOGIC', text: 'Geospatial verification via Gemini and Maps.', icon: 'M17.657 16.657L13.414 20.9' }
                      ].map((item, i) => (
                        <div key={i} className="p-8 sm:p-10 bg-slate-900/30 border border-slate-800 rounded-[32px] space-y-6">
                          <div className="w-12 h-12 bg-cyan-950/40 rounded-2xl flex items-center justify-center text-cyan-400">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-white font-black text-sm uppercase tracking-wider">{item.title}</h4>
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

      <footer className="h-16 sm:h-20 shrink-0 bg-slate-950 border-t border-slate-900/60 px-4 sm:px-8 flex items-center justify-between text-[9px] sm:text-[11px] text-slate-500 font-mono z-50 overflow-hidden">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${analysisState.status === 'complete' ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="tracking-[0.1em] font-black uppercase whitespace-nowrap">{analysisState.status === 'complete' ? 'FORENSIC_LINK' : 'LIVE_SCAN'}</span>
          </div>
          
          <div className="flex items-center">
            {/* Contextual Global Agent Selection */}
            <LiveAssistant 
              agentType={analysisState.status === 'complete' ? 'LOGIC' : 'OPTIC'}
              reportContext={analysisState.data ? JSON.stringify(analysisState.data) : 'General Field Guidance'} 
              videoStream={analysisState.status === 'complete' ? null : activeStream}
            />
          </div>
        </div>
        
        <div className="text-slate-800 font-black tracking-widest whitespace-nowrap hidden sm:block uppercase">©2024 ENV-SYS INTELLIGENCE</div>
      </footer>
    </div>
  );
}

export default App;