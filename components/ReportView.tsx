import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, GroundingSource } from '../types';
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
      alert(err.message || "Audio briefing unavailable in current mode.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleDownload = () => {
    const text = `AQUA-TRACE ENVIRONMENTAL AUDIT\nMODE: ${report.sourceMode || 'Unknown'}\nAIS SCORE: ${report.aquaImpactScore}/100\nSEVERITY: ${report.environmentalRiskLevel}\nDIRECTIVE: ${report.actionIntelligence.recommendedAction}\n\nOPTICAL DIAGNOSTICS:\n- ${report.detectedOptics.join('\n- ')}\n\nACTION PLAN:\n${report.actionIntelligence.labValidationAdvisory}`;
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
      
      {/* Demonstration Mode Banner */}
      {report.sourceMode === 'Demo' && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 animate-pulse">
           <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
             <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
           <div className="space-y-1">
             <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Demonstration Analysis</p>
             <p className="text-[10px] text-slate-400 font-medium">Live API quota exhausted or unavailable. Displaying pre-generated Gemini 3 impact intelligence for field reference.</p>
           </div>
        </div>
      )}

      {/* Summary Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <h2 className="text-3xl font-black text-white tracking-tighter">Impact Intelligence</h2>
             <RiskBadge level={report.environmentalRiskLevel} />
          </div>
          <p className="text-slate-500 text-sm font-mono tracking-tight uppercase">Audit Hash: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handlePlayAudio}
            disabled={isAudioLoading}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              isPlaying ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
          >
            {isAudioLoading ? 'Synthesizing...' : isPlaying ? 'Stop Audio' : 'Audio Brief'}
          </button>
          <button onClick={handleDownload} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-700 hover:text-white">
            Export Data
          </button>
        </div>
      </div>

      {/* AQUA-IMPACT SCORE Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Signature Analysis</h3>
           <span className="text-[10px] font-bold text-cyan-600">CONFIDENCE: {report.confidencePercentage}%</span>
        </div>
        <AQUAImpactScore score={report.aquaImpactScore} breakdown={report.scoreBreakdown} />
        <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4">
          "{report.scoreExplanation}"
        </p>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-850 px-6 py-3 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Decision Intelligence Layer</h3>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                report.actionIntelligence.recommendedAction === 'Contain' ? 'bg-red-500 text-white' : 
                report.actionIntelligence.recommendedAction === 'Escalate' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
              }`}>
                {report.actionIntelligence.recommendedAction} Required
              </span>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Directive</p>
                <p className="text-sm text-slate-200 leading-relaxed">{report.actionIntelligence.labValidationAdvisory}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/50">
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Notification Targets</p>
                  <ul className="space-y-2">
                    {report.actionIntelligence.notificationTargets.map((target, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyan-600 rounded-full"></span> {target}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Field Evidence Required</p>
                  <ul className="space-y-2">
                    {report.actionIntelligence.followUpEvidence.map((evidence, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span> {evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Optical Fingerprint</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Visibly Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.detectedOptics.map((opt, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold rounded uppercase">{opt}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 opacity-60">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Invisibles (Requires Lab)</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.nonDetectableOptics.map((opt, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[9px] text-slate-400 font-bold rounded uppercase">{opt}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Biological Risk Reasoning</h3>
             <p className="text-xs text-slate-300 leading-relaxed">{report.environmentalImpactExplanation}</p>
          </div>
        </div>
      </div>

      {/* Advisory Note */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-4">
        <svg className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-[10px] text-slate-500 uppercase tracking-tight leading-relaxed">
          <strong>AQUA-TRACE ADVISORY:</strong> This neural assessment is based on optical signatures only. Dissolved contaminants or heavy metals are inherently non-detectable via vision. AIS Scores above 60 require immediate laboratory verification.
        </p>
      </div>

      {sources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contextual Retrieval Sources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col gap-1 p-4 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-cyan-900 hover:bg-slate-900 transition-all group"
              >
                <span className="text-[10px] text-white font-bold uppercase truncate">{source.title || 'Resource Document'}</span>
                <span className="text-[9px] text-cyan-600 font-mono truncate group-hover:text-cyan-400">{source.uri}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
