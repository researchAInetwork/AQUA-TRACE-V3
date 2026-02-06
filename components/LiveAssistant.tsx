import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import { decodeAudioData, decodeBase64 } from '../services/geminiService';

const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export type AgentType = 'OPTIC' | 'LOGIC';

interface LiveAssistantProps {
  agentType: AgentType;
  reportContext?: string;
  videoStream?: MediaStream | null;
  onAnalysisReady?: () => void;
  isMinimal?: boolean;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ 
  agentType,
  reportContext, 
  videoStream, 
  onAnalysisReady,
  isMinimal = false
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const isSendingFrameRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const toggleAssistant = () => {
    if (isActive || isConnecting) {
      stopSession();
      return;
    }
    startSession();
  };

  const startSession = async () => {
    if (!navigator.onLine) {
      alert("FIELD ALERT: Network connectivity lost. Satellite uplink unavailable.");
      return;
    }

    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const systemInstructions = agentType === 'OPTIC' 
        ? `ROLE: AQUA-OPTIC (Forensic Vision Node).
           PROTOCOL: High-speed real-time computer vision analysis.
           TASK: Monitor the incoming video stream. Identify sheens (hydrocarbons), algal blooms, or turbidity anomalies.
           GUIDANCE: Instruct the user on camera positioning, focus, and stabilization. Call out detected optical signatures immediately.
           TONE: Professional, technical, field-ready.`
        : `ROLE: AQUA-LOGIC (Strategic Environmental Oracle).
           PROTOCOL: Forensic interpretation and remediation strategy.
           TASK: Analyze the current AIS (AQUA Impact Score) data and environmental report provided in context.
           GUIDANCE: Explain the 'Why' behind the risk level. Discuss chemical pathways and specific remediation tactics.
           CONTEXT: ${reportContext || 'General Field Triage'}.
           TONE: Authoritative, analytical, expert.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            // 1. Setup Microphone Input
            if (audioContextInRef.current) {
              const audioCtx = audioContextInRef.current;
              const source = audioCtx.createMediaStreamSource(stream);
              const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioCtx.destination);
            }

            // 2. Setup Video Telemetry (OPTIC Agent only)
            if (videoStream && agentType === 'OPTIC') {
              const v = document.createElement('video');
              v.srcObject = videoStream;
              v.muted = true;
              v.playsInline = true;
              v.play().catch(() => {});
              internalVideoRef.current = v;

              if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');

              frameIntervalRef.current = window.setInterval(async () => {
                if (ctx && v.readyState >= 2 && !isSendingFrameRef.current) {
                  isSendingFrameRef.current = true;
                  canvas.width = 480; 
                  canvas.height = 270; 
                  ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      try {
                        const base64Data = await blobToBase64(blob);
                        const session = await sessionPromise;
                        session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                      } finally {
                        isSendingFrameRef.current = false;
                      }
                    } else {
                      isSendingFrameRef.current = false;
                    }
                  }, 'image/jpeg', 0.6); 
                }
              }, 1000); 
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => {
            console.error("Link Interrupted:", e);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
              voiceName: agentType === 'OPTIC' ? 'Zephyr' : 'Kore' 
            } 
          },
          systemInstruction: systemInstructions,
        }
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setIsConnecting(false);
      stopSession();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsConnecting(false);
    
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(s => { try { s.close(); } catch (e) {} }).catch(() => {});
      sessionPromiseRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (internalVideoRef.current) {
      internalVideoRef.current.srcObject = null;
      internalVideoRef.current = null;
    }

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (audioContextInRef.current) {
      audioContextInRef.current.close().catch(() => {});
      audioContextInRef.current = null;
    }

    if (audioContextOutRef.current) {
      audioContextOutRef.current.close().catch(() => {});
      audioContextOutRef.current = null;
    }

    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    isSendingFrameRef.current = false;
  };

  const themeColor = agentType === 'OPTIC' ? 'cyan' : 'indigo';
  const label = agentType === 'OPTIC' ? 'AQUA-OPTIC' : 'AQUA-LOGIC';

  if (isMinimal) {
    const activeClass = themeColor === 'cyan' 
      ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]'
      : 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]';

    return (
      <button 
        onClick={toggleAssistant}
        disabled={isConnecting}
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 ${
          isActive 
            ? activeClass 
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white shadow-[0_0_10px_white]' : isConnecting ? 'bg-slate-500 animate-pulse' : 'bg-slate-800'}`}></div>
        <div className="flex flex-col items-start leading-none gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
          <span className={`text-[7px] font-bold uppercase tracking-widest ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{isActive ? 'LIVE LINK' : 'NEURAL CONNECT'}</span>
        </div>
      </button>
    );
  }

  const activeBtnClass = themeColor === 'cyan' 
    ? 'bg-cyan-600 text-white shadow-lg border-cyan-400'
    : 'bg-indigo-600 text-white shadow-lg border-indigo-400';

  return (
    <button 
      onClick={toggleAssistant}
      disabled={isConnecting}
      className={`group relative h-10 px-6 rounded-xl flex items-center gap-3 transition-all duration-300 border ${
        isActive 
          ? activeBtnClass 
          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700'
      }`}
    >
      {isConnecting ? (
        <div className="w-4 h-4 border-2 border-slate-700 border-t-white rounded-full animate-spin"></div>
      ) : (
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white shadow-[0_0_10px_white]' : 'bg-slate-800'}`}></div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-black uppercase tracking-[0.25em]">{label}</span>
            <span className={`text-[7px] font-mono uppercase tracking-widest ${isActive ? 'text-white/70' : 'text-slate-600'}`}>{isActive ? 'Active Telemetry' : 'Standby'}</span>
          </div>
        </div>
      )}
    </button>
  );
};