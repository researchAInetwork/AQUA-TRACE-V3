
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, GroundingSource, TimeSensitivity } from '../types';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { AQUAImpactScore } from './AQUAImpactScore';
import { generateAudioReport, decodeBase64, decodeAudioData } from '../services/geminiService';

interface ReportViewProps {
  report: AnalysisReport;
  sources?: GroundingSource[];
  onBack: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, sources = [], onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (activeSourceRef.current) activeSourceRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const getUrgencyColor = (urgency: TimeSensitivity) => {
    switch (urgency) {
      case TimeSensitivity.IMMEDIATE_VERIFICATION:
      case TimeSensitivity.TIME_CRITICAL:
        return 'bg-red-500 text-white';
      case TimeSensitivity.MONITOR_CLOSELY:
        return 'bg-amber-500 text-black';
      case TimeSensitivity.NON_URGENT:
        return 'bg-emerald-500 text-black';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  const handlePlayAudio = async () => {
    if (isPlaying) {
      if (activeSourceRef.current) {
        activeSourceRef.current.stop();
        activeSourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const base64Audio = await generateAudioReport(report);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => { setIsPlaying(false); activeSourceRef.current = null; };
      activeSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (err: any) {
      alert(err.message || "Audio briefing unavailable.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleDownload = () => {
    const text = `AQUA-TRACE ENVIRONMENTAL AUDIT\n\nDISCLAIMER: ${report.systemAdvisory}\n\nSUMMARY: ${report.plainLanguageSummary}\nCONFIDENCE: ${report.confidencePercentage}% (${report.confidenceLevel})\nURGENCY: ${report.timeSensitivity}\nAIS SCORE: ${report.aquaImpactScore}/100\nSEVERITY: ${report.environmentalRiskLevel}\n\nREMEDIATION STRATEGY (SUGGESTED):\n- ${report.actionIntelligence.remediationStrategy.join('\n- ')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AQUA-TRACE-AUDIT-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-10 animate-fade-in-up pb-24">
      
      {/* Simulation & Advisory Alerts */}
      <div className="space-y-4">
        {report.sourceMode === 'Demo' && (
          <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
               <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <div>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Simulation Mode Active</p>
               <p className="text-[11px] text-slate-400 font-medium">Results are based on cached environmental intelligence for demonstration and benchmarking.</p>
             </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
            {report.systemAdvisory}
          </p>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-800/60 pb-8">
        <div className="space-y-4 flex-1 w-full">
          <div className="flex flex-wrap items-center gap-3">
             <RiskBadge level={report.environmentalRiskLevel} />
             <span className={`px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 ${getUrgencyColor(report.timeSensitivity)} shadow-lg`}>
               {report.timeSensitivity}
             </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-tight">
              {report.plainLanguageSummary}
            </h2>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence</span>
                 <ConfidenceBadge level={report.confidenceLevel} />
               </div>
               <div className="h-4 w-px bg-slate-800"></div>
               <span className="text-[10px] text-slate-500 font-mono">{report.confidencePercentage}% Reliability</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full lg:w-auto shrink-0">
          <button 
            onClick={handlePlayAudio}
            disabled={isAudioLoading}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
              isPlaying ? 'bg-cyan-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isAudioLoading ? '...' : isPlaying ? 'STOP' : 'PLAY BRIEF'}
          </button>
          <button onClick={handleDownload} className="flex-1 lg:flex-none px-6 py-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">
            EXPORT
          </button>
        </div>
      </div>

      {/* Rationale & AIS Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-2 space-y-6">
           <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-600"></div>
              <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Probabilistic Rationale
              </h3>
              <p className="text-base sm:text-lg text-slate-200 font-semibold leading-relaxed">
                {report.riskJustification}
              </p>
           </div>

           <AQUAImpactScore 
              score={report.aquaImpactScore} 
              breakdown={report.scoreBreakdown} 
              comparativeText={report.comparativeIntelligence}
            />

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-4">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Confidence Drivers</h3>
                 <ul className="space-y-2">
                   {report.confidenceFactors.map((factor, i) => (
                     <li key={i} className="text-[11px] text-slate-300 flex items-center gap-2">
                       <span className="w-1 h-1 bg-cyan-500 rounded-full"></span>
                       {factor}
                     </li>
                   ))}
                 </ul>
              </div>
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-4">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Detection Limitations</h3>
                 <ul className="space-y-2">
                   {report.assessmentLimitations.map((lim, i) => (
                     <li key={i} className="text-[11px] text-slate-400 flex items-center gap-2 italic">
                       <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                       {lim}
                     </li>
                   ))}
                 </ul>
              </div>
           </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Inferred Category</h3>
            <p className="text-sm text-cyan-400 font-bold tracking-tight">{report.likelyPollutionCategory}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed italic">Classification is inferred from surface optical patterns and contextual metadata.</p>
          </div>
          
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[32px] space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ecological Impact (Projected)</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">{report.environmentalImpactExplanation}</p>
          </div>

          <div className="p-6 bg-slate-950/80 border border-red-900/30 rounded-[32px] space-y-4">
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Human Safety Advise</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{report.humanHealthImplications}</p>
          </div>
        </div>
      </div>

      {/* Decision Intelligence Grid */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="bg-slate-850 px-8 py-5 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-[11px] font-black text-white uppercase tracking-[0.25em]">Decision Support Matrix</h3>
          <div className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest ${report.actionIntelligence.recommendedAction === 'Escalate' ? 'bg-red-500' : 'bg-cyan-600'} text-white`}>
            {report.actionIntelligence.recommendedAction} PROTOCOL SUGGESTED
          </div>
        </div>
        
        <div className="p-10 space-y-10">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Suggested Field Response Pathways</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.actionIntelligence.remediationStrategy.map((strategy, i) => (
                <div key={i} className="p-5 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl flex gap-4">
                   <span className="text-emerald-500 font-mono font-bold text-xs mt-0.5">{(i+1).toString().padStart(2, '0')}</span>
                   <p className="text-[13px] text-emerald-100 font-medium leading-relaxed">{strategy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-800/50">
             <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Recommended Notification Targets</p>
               <div className="flex flex-wrap gap-2">
                 {report.actionIntelligence.notificationTargets.map((target, i) => (
                   <span key={i} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-bold rounded-lg">{target}</span>
                 ))}
               </div>
             </div>
             <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Suggested Lab Evaluation</p>
               <div className="p-5 bg-cyan-950/20 border border-cyan-900/30 rounded-2xl">
                 <p className="text-[13px] text-cyan-200 font-semibold italic leading-relaxed">{report.actionIntelligence.labValidationAdvisory}</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Grounding Sources Section */}
      {sources.length > 0 && (
        <div className="space-y-6 pt-10">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Intelligence Grounding</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col gap-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-cyan-500 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
                    {source.title || `VERIFICATION_NODE_${i+1}`}
                  </span>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <span className="text-[10px] font-mono text-slate-500 truncate">{source.uri}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Global Accountability Footer */}
      <div className="p-10 bg-slate-950 border border-slate-800/80 rounded-[48px] text-center space-y-6">
        <div className="flex justify-center">
           <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
             <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
           </div>
        </div>
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.5em]">Forensic Integrity Protocol</p>
        <p className="text-[13px] text-slate-400 font-medium leading-relaxed max-w-3xl mx-auto">
          AQUA-TRACE is designed to remain operational in demonstration and decision-review modes even when live AI inference is unavailable. Unlike traditional monitoring dashboards that report raw measurements, AQUA-TRACE synthesizes visual signals, environmental context, and comparative intelligence to prioritize where human attention is most urgently needed.
        </p>
      </div>
    </div>
  );
};
