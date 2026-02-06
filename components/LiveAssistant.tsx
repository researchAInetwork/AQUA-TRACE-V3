import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeBase64, decodeAudioData } from '../services/geminiService';

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
  const isSendingFrameRef = useRef<boolean>(false);

  useEffect(() => {
    return () => stopSession();
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
      alert("System Offline: Radio link could not be established.");
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
        ? `SYSTEM: AQUA-OPTIC (Optical Sentinel Node).
           FUNCTION: Real-time computer vision guide for field scouts.
           GOALS: 
           1. Monitor visual telemetry and guide operator on lens stabilization.
           2. Call out visible sheens, foam, or discoloration patterns.
           3. Be high-speed, technical, and brief.
           VOICE: Professional, focused, alert.`
        : `SYSTEM: AQUA-LOGIC (Forensic Analysis Oracle).
           FUNCTION: Data interpretation and strategic briefing.
           GOALS:
           1. Analyze the provided AIS (AQUA Impact Score) data.
           2. Explain ecological risk rationales and legal implications.
           3. Discuss remediation strategies (Booms, sorbents, chemical neutralizers).
           CONTEXT: ${reportContext || 'Forensic Review Mode'}.
           VOICE: Academic, authoritative, analytical.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            if (audioContextInRef.current) {
              const source = audioContextInRef.current.createMediaStreamSource(stream);
              const scriptProcessor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);
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
              scriptProcessor.connect(audioContextInRef.current.destination);
            }

            if (videoStream && agentType === 'OPTIC') {
              const videoElement = document.createElement('video');
              videoElement.srcObject = videoStream;
              videoElement.muted = true;
              videoElement.playsInline = true;
              videoElement.play().catch(e => console.warn("Lens warning:", e));

              if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');

              frameIntervalRef.current = window.setInterval(async () => {
                if (ctx && videoElement.readyState >= 2 && !isSendingFrameRef.current) {
                  isSendingFrameRef.current = true;
                  canvas.width = 320;
                  canvas.height = 180; 
                  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
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
                  }, 'image/jpeg', 0.5); 
                }
              }, 2000); 
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
              source.onended = () => sourcesRef.current.delete(source);
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
          onerror: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName: agentType === 'OPTIC' ? 'Zephyr' : 'Kore' 
              } 
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

  // Agent Specific Styling
  const themeColor = agentType === 'OPTIC' ? 'cyan' : 'indigo';
  const label = agentType === 'OPTIC' ? 'AQUA-OPTIC' : 'AQUA-LOGIC';
  const sublabel = agentType === 'OPTIC' ? 'SENTINEL' : 'ORACLE';

  if (isMinimal) {
    return (
      <button 
        onClick={toggleAssistant}
        disabled={isConnecting}
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 ${
          isActive 
            ? `bg-${themeColor}-600 border-${themeColor}-400 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]` 
            : 'bg-black/80 border-white/10 text-white/50 hover:border-white/20'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white shadow-[0_0_8px_white]' : isConnecting ? `bg-${themeColor}-400 animate-pulse` : 'bg-white/20'}`}></div>
        <div className="flex flex-col items-start leading-none gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{label}</span>
          <span className={`text-[7px] font-bold uppercase tracking-widest text-${themeColor}-400`}>{sublabel} LINK</span>
        </div>
      </button>
    );
  }

  return (
    <button 
      onClick={toggleAssistant}
      disabled={isConnecting}
      className={`group relative h-10 px-5 rounded-xl flex items-center gap-3 transition-all duration-300 ${
        isActive 
          ? `bg-${themeColor}-600 text-white shadow-lg border border-${themeColor}-400` 
          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
      }`}
    >
      {isConnecting ? (
        <div className={`w-4 h-4 border-2 border-slate-600 border-t-${themeColor}-400 rounded-full animate-spin`}></div>
      ) : (
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white shadow-[0_0_8px_white]' : 'bg-slate-700'}`}></div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
            <span className="text-[7px] font-mono opacity-50 uppercase tracking-widest">{isActive ? 'Active Relay' : 'Neural Link'}</span>
          </div>
        </div>
      )}
    </button>
  );
};