
import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up custom-scroll">
        
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-cyan-900/50 flex items-center justify-center border border-cyan-800">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <div className="flex flex-col">
               <h2 className="text-lg font-black text-white uppercase tracking-wider leading-none">AQUA-TRACE v1.2</h2>
               <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-1">Impact Intelligence System</span>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-10">
          
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">Differentiation Statement</h3>
            <p className="text-slate-200 font-semibold leading-relaxed text-base">
              Unlike traditional monitoring dashboards that report raw measurements, AQUA-TRACE synthesizes visual signals, environmental context, and comparative intelligence to prioritize where human attention is most urgently needed.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System Overview</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              AQUA-TRACE is an advanced environmental decision-support system designed to democratize water pollution monitoring. By leveraging <strong>Gemini 3's multimodal reasoning</strong>, the system transforms optical telemetry into rapid, structured risk assessments for early warning and triage.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Intelligence Vectors
              </h4>
              <ul className="space-y-3 text-xs text-slate-400 font-medium">
                <li>• Optical hydrocarbon & bloom detection</li>
                <li>• Probabilistic risk stratification (AIS)</li>
                <li>• Comparative dataset benchmarking</li>
                <li>• Multi-modal brief synthesis</li>
              </ul>
            </div>
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
               <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Assessment Boundaries
              </h4>
              <ul className="space-y-3 text-xs text-slate-400 font-medium italic">
                <li>• Cannot detect dissolved chemical agents</li>
                <li>• Surface-only probabilistic inference</li>
                <li>• Sensitive to optics & low-light conditions</li>
                <li>• Requires lab validation for legal use</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">Responsible AI & Ethical usage</h3>
            <div className="bg-cyan-900/10 border border-cyan-800/30 p-6 rounded-2xl space-y-3">
               <p className="text-slate-300 text-sm leading-relaxed font-medium">
                 AQUA-TRACE provides probabilistic, optical-based environmental intelligence for prioritization and early warning. Outputs are <strong>non-prescriptive</strong> and must be validated through laboratory and field investigation before regulatory or remediation action.
               </p>
               <p className="text-[11px] text-slate-500 italic">
                 Do not use AQUA-TRACE results as the sole basis for legal enforcement, public health alerts, or regulatory compliance without corroborated chemical data.
               </p>
            </div>
          </section>

          <section className="text-center pt-8 border-t border-slate-800 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
              Powered by Google Gemini 3 Architecture
            </p>
            <div className="flex gap-4">
               <span className="text-[9px] text-slate-700 font-mono">AIS_INDEX v1.2</span>
               <span className="text-[9px] text-slate-700 font-mono">FIELD_AGENT_OPTIC_STABLE</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
