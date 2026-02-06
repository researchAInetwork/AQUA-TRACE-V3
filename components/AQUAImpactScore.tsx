import React from 'react';
import { ScoreBreakdown } from '../types';

interface AQUAImpactScoreProps {
  score: number;
  breakdown: ScoreBreakdown;
  comparativeText?: string;
}

export const AQUAImpactScore: React.FC<AQUAImpactScoreProps> = ({ score, breakdown, comparativeText }) => {
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

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-6 sm:gap-8 items-center relative overflow-hidden">
      <div className="relative flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="8" 
              fill="transparent" 
              className="text-slate-800" 
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: offset }}
              strokeLinecap="round"
              className={`${getColor(score)} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl sm:text-3xl font-black ${getColor(score)} tracking-tighter`}>{score}</span>
            <span className="text-[7px] sm:text-[8px] font-bold text-slate-500 uppercase tracking-widest">AIS INDEX</span>
          </div>
        </div>
        {comparativeText && (
          <p className="mt-3 text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tight text-center max-w-[160px]">
            {comparativeText}
          </p>
        )}
      </div>

      <div className="flex-1 w-full space-y-4">
        <div className="flex justify-between items-end border-b border-slate-800 pb-2">
          <h3 className="text-[9px] sm:text-xs font-black text-white uppercase tracking-widest">Impact Vector Analysis</h3>
          <span className="text-[8px] sm:text-[10px] font-mono text-slate-500">REALTIME</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {[
            { label: 'Optical Severity', val: breakdown.opticalSeverity, max: 40 },
            { label: 'Visible Area', val: breakdown.visibleArea, max: 20 },
            { label: 'Ecosystem Sensitivity', val: breakdown.ecosystemSensitivity, max: 20 },
            { label: 'Human Proximity Risk', val: breakdown.humanProximity, max: 20 },
          ].map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[8px] sm:text-[9px] uppercase font-bold tracking-tight">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-slate-300">{item.val}</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getBarColor(score)} transition-all duration-1000`} 
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