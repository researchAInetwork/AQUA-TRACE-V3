import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { ReportView } from './components/ReportView';
import { CameraCapture } from './components/CameraCapture';
import { AboutModal } from './components/AboutModal';
import { analyzeWaterImage } from './services/geminiService';
import { AnalysisState } from './types';

type InputMode = 'upload' | 'camera';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    data: null,
    resources: null,
    sources: [],
    error: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [showAbout, setShowAbout] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
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
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null });
  };

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
      const result = await analyzeWaterImage(file, context);
      setAnalysisState({ 
        status: 'complete', 
        data: result.report, 
        sources: result.sources,
        resources: null,
        error: null 
      });
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
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null });
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans selection:bg-cyan-500/30 overflow-hidden">
      <Header onOpenAbout={() => setShowAbout(true)} />
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Sidebar Container */}
        <aside className="w-full lg:w-96 flex-shrink-0 bg-slate-900/40 border-r border-slate-800 flex flex-col min-h-0">
          
          {/* Sidebar Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-8">
            <div className="space-y-1">
               <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
                  Sensor Input
               </h2>
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-mono">Telemetry Ready</p>
            </div>

            <div className="space-y-6">
              {!preview ? (
                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                    <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 text-[10px] font-black rounded transition-all ${inputMode === 'upload' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      IMPORT IMAGE
                    </button>
                    <button onClick={() => setInputMode('camera')} className={`flex-1 py-2 text-[10px] font-black rounded transition-all ${inputMode === 'camera' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      LIVE OPTICS
                    </button>
                  </div>

                  <div className="aspect-[4/3] lg:aspect-auto lg:h-64">
                    {inputMode === 'upload' ? (
                      <div 
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                        className={`h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'}`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg className="w-8 h-8 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Drop Surface Data</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                      </div>
                    ) : (
                      <div className="h-full">
                        <CameraCapture onCapture={validateAndSetFile} onError={(err) => setAnalysisState(s => ({...s, error: err}))} />
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em]">Capture Protocol</h4>
                    <ul className="text-[10px] text-slate-500 space-y-2 font-medium">
                      <li className="flex items-start gap-2 italic">01. Avoid direct solar glare on surface.</li>
                      <li className="flex items-start gap-2 italic">02. Include shoreline context for scale.</li>
                      <li className="flex items-start gap-2 italic">03. Maintain stability during scan.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="relative group rounded-xl border border-slate-800 overflow-hidden bg-black aspect-[4/3] lg:aspect-auto lg:h-64 shadow-2xl">
                  {isVideo ? (
                    <video src={preview} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={preview} alt="Sample" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button onClick={reset} className="p-2 bg-red-600 hover:bg-red-500 border border-red-400/50 rounded-full transition-all text-white shadow-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">In-situ Metadata</label>
                    <span className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest">Optional</span>
                  </div>
                  <textarea 
                    value={context} 
                    onChange={(e) => setContext(e.target.value)} 
                    placeholder="Describe location, suspicious runoff, or odors..." 
                    className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 focus:border-cyan-500/50 focus:ring-0 transition-all resize-none placeholder:text-slate-800 leading-relaxed"
                  />
                </div>
                <button 
                  onClick={handleAnalyze} 
                  disabled={!file || analysisState.status === 'analyzing'} 
                  className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.3em] transition-all relative overflow-hidden group shadow-xl ${!file ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/10'}`}
                >
                  {analysisState.status === 'analyzing' ? (
                     <span className="flex items-center justify-center gap-3">
                       <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                       Synthesizing
                     </span>
                  ) : 'Execute Analysis'}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Analytics Workspace Container */}
        <section className="flex-1 flex flex-col min-h-0 bg-slate-950 relative overflow-hidden">
          
          <div className="flex-1 overflow-y-auto custom-scroll p-6 lg:p-12 relative z-10">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className="h-full flex flex-col max-w-4xl mx-auto">
                {analysisState.status === 'analyzing' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 animate-fade-in-up">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-cyan-500/5 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-6 border-2 border-blue-500/10 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-white tracking-tighter">Inference Processing</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">Multimodal neural audit in progress. Aligning visual signatures with historical impact benchmarks...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-16 py-10">
                    <div className="space-y-6">
                      <h2 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tighter">
                        AI-Driven Surface Water <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Impact Intelligence</span>
                      </h2>
                      <p className="text-slate-400 text-lg lg:text-xl leading-relaxed max-w-3xl">
                        Rapid-response environmental monitoring using high-resolution neural networks to detect, model, and classify ecological risk levels from optical surface data.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { title: 'Optical Signatures', text: 'Real-time detection of sheens, plumes, and foaming indicators.', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                        { title: 'Biological Risk', text: 'Automated impact modeling for ecosystems and human health.', icon: 'M9 12l2 2 4-4' },
                        { title: 'Grounding Logic', text: 'Verified retrieval using Google Maps and Global Environmental datasets.', icon: 'M17.657 16.657L13.414 20.9' }
                      ].map((item, i) => (
                        <div key={i} className="p-8 bg-slate-900/30 border border-slate-800 rounded-3xl space-y-5 hover:border-slate-700 transition-all hover:bg-slate-900/50 group">
                          <div className="w-12 h-12 bg-cyan-950/30 border border-cyan-900/50 rounded-2xl flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-white font-black text-sm uppercase tracking-wider">{item.title}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-8 bg-cyan-500/5 border border-cyan-500/20 rounded-3xl flex flex-col md:flex-row items-center gap-8">
                       <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                          <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </div>
                       <div className="space-y-2">
                         <p className="text-sm font-black text-white uppercase tracking-widest">Protocol Advisory</p>
                         <p className="text-xs text-slate-500 leading-relaxed font-medium">AQUA-TRACE identifies visible surface patterns. Dissolved chemical agents or colorless heavy metals require professional laboratory verification. This system is designed for triage and rapid field screening.</p>
                       </div>
                    </div>
                  </div>
                )}
                {analysisState.error && (
                  <div className="mt-auto mb-10 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-fade-in-up">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {analysisState.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Container */}
      <footer className="h-10 shrink-0 bg-slate-950 border-t border-slate-900 px-6 flex items-center justify-between text-[10px] text-slate-500 font-mono z-50">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
            <span className="tracking-widest font-black uppercase">Sensor_Online</span>
          </div>
          <span className="opacity-20">|</span>
          <span className="hidden sm:inline tracking-tighter uppercase opacity-60">Neural_Engine: G3_Multimodal</span>
        </div>
        
        <div className="hidden lg:block text-center font-sans font-bold opacity-30 tracking-[0.15em] uppercase px-10 truncate">
          Impact Intelligence Protocol // Environmental Risk Screening Only
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden sm:inline tracking-tighter uppercase opacity-60">Status: Nominal</span>
          <span className="text-slate-800 font-black">©2024 ENV-SYS</span>
        </div>
      </footer>
    </div>
  );
}

export default App;