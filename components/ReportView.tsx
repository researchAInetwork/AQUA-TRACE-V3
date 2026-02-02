import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, GroundingSource, TimeSensitivity } from '../types';
import { RiskBadge } from './RiskBadge';
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
    const text = `AQUA-TRACE ENVIRONMENTAL AUDIT\nSUMMARY: ${report.plainLanguageSummary}\nURGENCY: ${report.timeSensitivity}\nAIS SCORE: ${report.aquaImpactScore}/100\nSEVERITY: ${report.environmentalRiskLevel}\nDIRECTIVE: ${report.actionIntelligence.recommendedAction}\n\nOPTICAL DIAGNOSTICS:\n- ${report.detectedOptics.join('\n- ')}\n\nACTION PLAN:\n${report.actionIntelligence.labValidationAdvisory}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AQUA-TRACE-AUDIT-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
      
      {/* Simulation Mode Banner */}
      {report.sourceMode === 'Demo' && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 animate-pulse">
           <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
             <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
           <div className="space-y-1">
             <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Simulated Analysis Profile</p>
             <p className="text-[10px] text-slate-400 font-medium">Displaying pre-generated Gemini 3 impact intelligence for operational demonstration purposes.</p>
           </div>
        </div>
      )}

      {/* Summary Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-3">
             <h2 className="text-3xl font-black text-white tracking-tighter">Impact Intelligence</h2>
             <RiskBadge level={report.environmentalRiskLevel} />
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getUrgencyColor(report.timeSensitivity)}`}>
               {report.timeSensitivity}
             </span>
          </div>
          <p className="text-lg text-slate-200 font-semibold leading-relaxed max-w-3xl">
            {report.plainLanguageSummary}
          </p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={handlePlayAudio}
            disabled={isAudioLoading}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isPlaying ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
          >
            {isAudioLoading ? 'Processing...' : isPlaying ? 'Stop Brief' : 'Audio Brief'}
          </button>
          <button onClick={handleDownload} className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-700 hover:text-white">
            Export Audit
          </button>
        </div>
      </div>

      {/* AQUA-IMPACT SCORE Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Validated Impact Metrics</h3>
           <span className="text-[10px] font-bold text-cyan-600">CONFIDENCE RATING: {report.confidencePercentage}%</span>
        </div>
        <AQUAImpactScore 
          score={report.aquaImpactScore} 
          breakdown={report.scoreBreakdown} 
          comparativeText={report.comparativeIntelligence}
        />
        <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4">
          "{report.scoreExplanation}"
        </p>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Action Intelligence Matrix</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Response Active</span>
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  Primary Directive
                </p>
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">{report.actionIntelligence.labValidationAdvisory}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Communication Escalation</p>
                  <ul className="space-y-3">
                    {report.actionIntelligence.notificationTargets.map((target, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full shadow-[0_0_8px_rgba(8,145,178,0.5)]"></div> {target}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Required Forensic Evidence</p>
                  <ul className="space-y-3">
                    {report.actionIntelligence.followUpEvidence.map((evidence, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-slate-700 rounded-full"></div> {evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Optical Diagnostics</h3>
            <div className="space-y-5">
              <div className="space-y-2.5">
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Visibly Identified</p>
                <div className="flex flex-wrap gap-2">
                  {report.detectedOptics.map((opt, i) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold rounded-lg uppercase">{opt}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5 opacity-60">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Invisible / Suspected</p>
                <div className="flex flex-wrap gap-2">
                  {report.nonDetectableOptics.map((opt, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-[9px] text-slate-400 font-bold rounded-lg uppercase">{opt}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ecosystem Stress Assessment</h3>
             <p className="text-xs text-slate-300 leading-relaxed font-medium">{report.environmentalImpactExplanation}</p>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer & Advisory */}
      <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-2xl flex items-start gap-5">
        <svg className="w-6 h-6 text-slate-600 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Intelligence Limitation Protocol</p>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            AQUA-TRACE provides rapid optical triage. This report is for screening and prioritization of lab-based verification. AIS scores reflect surface-level anomalies and do not constitute a full legal environmental audit. Always verify with in-situ chemical testing where health or safety is concerned.
          </p>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contextual Intelligence Grounding</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col gap-1 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-cyan-700 hover:bg-slate-900 transition-all group"
              >
                <span className="text-[10px] text-white font-bold uppercase truncate">{source.title || 'Source Reference'}</span>
                <span className="text-[9px] text-cyan-600 font-mono truncate group-hover:text-cyan-400">{source.uri}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
