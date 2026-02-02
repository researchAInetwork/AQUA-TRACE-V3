import React from 'react';
import { ScoreBreakdown } from '../types';

interface AQUAImpactScoreProps {
  score: number;
  breakdown: ScoreBreakdown;
}

export const AQUAImpactScore: React.FC<AQUAImpactScoreProps> = ({ score, breakdown }) => {
  const getColor = (val: number) => {
    if (val < 30) return 'text-emerald-500';
    if (val < 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getBarColor = (val: number) => {
    if (val < 30) return 'bg-emerald-500';
    if (val < 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center">
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={364}
            strokeDashoffset={364 - (364 * score) / 100}
            strokeLinecap="round"
            className={`${getColor(score)} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${getColor(score)} tracking-tighter`}>{score}</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">AIS INDEX</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Impact Component Breakdown</h3>
          <span className="text-[10px] font-mono text-slate-500">AGGREGATED TELEMETRY</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {[
            { label: 'Optical Severity', val: breakdown.opticalSeverity, max: 40 },
            { label: 'Visible Area', val: breakdown.visibleArea, max: 20 },
            { label: 'Ecosystem Sensitivity', val: breakdown.ecosystemSensitivity, max: 20 },
            { label: 'Human Proximity Risk', val: breakdown.humanProximity, max: 20 },
          ].map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[9px] uppercase font-bold tracking-tight">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-slate-300">{item.val} / {item.max}</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getBarColor(score)} transition-all duration-1000 delay-300`} 
                  style={{ width: `${(item.val / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
