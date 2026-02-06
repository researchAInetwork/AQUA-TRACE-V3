import React, { useRef, useEffect, useState } from 'react';
import { LiveAssistant } from './LiveAssistant';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onError: (error: string) => void;
  onStreamReady?: (stream: MediaStream) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError, onStreamReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamLockRef = useRef<MediaStream | null>(null);

  const [zoomCap, setZoomCap] = useState<{ min: number; max: number } | null>(null);
  const zoomRef = useRef<number>(1);
  const baseZoomRef = useRef<number>(1);
  const baseDistRef = useRef<number>(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      if (streamLockRef.current) return;
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        if (!isMounted) {
          currentStream.getTracks().forEach(t => t.stop());
          return;
        }
        if (videoRef.current) {
          streamLockRef.current = currentStream;
          videoRef.current.srcObject = currentStream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && isMounted) {
              videoRef.current.play().catch(e => console.warn("Playback delayed:", e));
              setIsInitialized(true);
              if (onStreamReady) onStreamReady(currentStream);
            }
          };
          setStream(currentStream);
          const track = currentStream.getVideoTracks()[0];
          const capabilities = track.getCapabilities() as any;
          if (capabilities.zoom) {
            setZoomCap({ min: capabilities.zoom.min, max: capabilities.zoom.max });
            zoomRef.current = capabilities.zoom.min;
          }
        }
      } catch (err) {
        if (isMounted) onError("Optical linkage failed.");
      }
    };
    startCamera();
    return () => {
      isMounted = false;
      if (streamLockRef.current) {
        streamLockRef.current.getTracks().forEach(track => track.stop());
        streamLockRef.current = null;
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [onError, onStreamReady]);

  const getPinchDistance = (t1: React.Touch, t2: React.Touch) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      baseDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
      baseZoomRef.current = zoomRef.current;
    }
  };
  const handleTouchMove = async (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomCap && stream) {
      if (e.cancelable) e.preventDefault();
      const dist = getPinchDistance(e.touches[0], e.touches[1]);
      if (baseDistRef.current === 0) return;
      const scale = dist / baseDistRef.current;
      let targetZoom = Math.min(Math.max(baseZoomRef.current * scale, zoomCap.min), zoomCap.max);
      try {
        const track = stream.getVideoTracks()[0];
        await track.applyConstraints({ advanced: [{ zoom: targetZoom }] } as any);
        zoomRef.current = targetZoom;
      } catch (err) {}
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && isInitialized) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) onCapture(new File([blob], "scan.jpg", { type: "image/jpeg" }));
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); 
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => onCapture(new File([new Blob(chunksRef.current, { type: 'video/webm' })], "telemetry.webm", { type: 'video/webm' }));
      recorder.start();
      setIsRecording(true);
      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= 10) stopRecording();
      }, 100);
    } catch (e) {
      onError("Capture engine failure.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleTrigger = () => mode === 'photo' ? handleCapturePhoto() : (isRecording ? stopRecording() : startRecording());

  return (
    <div 
      className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-slate-800 touch-none shadow-2xl transform-gpu"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <video ref={videoRef} autoPlay playsInline muted controls={false} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isInitialized ? 'opacity-100' : 'opacity-0'}`} />

      <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between z-10 transform-gpu">
        <div className="flex justify-between items-start">
           <div className="flex flex-col gap-3">
              <div className="bg-slate-900/90 backdrop-blur-xl px-3 py-2 rounded-lg border border-white/10 flex items-center gap-3 w-fit shadow-2xl">
                <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-slate-700 animate-pulse'}`}></div>
                <span className="text-[10px] text-white font-mono tracking-widest uppercase font-black">LINK::{isInitialized ? 'STABLE' : 'SCANNING'}</span>
              </div>
              <div className="pointer-events-auto">
                {/* Specialized Field Agent */}
                <LiveAssistant agentType="OPTIC" videoStream={stream} isMinimal={true} />
              </div>
           </div>
           
           {isRecording && (
             <div className="bg-red-600 px-4 py-2 rounded-xl text-[10px] text-white font-mono font-black border border-red-400 shadow-2xl flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
               REC {recordingTime.toFixed(1)}s
             </div>
           )}
        </div>

        <div className="flex flex-col items-center gap-8 pointer-events-auto pb-6">
          {!isRecording && (
            <div className="flex bg-slate-950/90 rounded-2xl p-1.5 border border-white/10 backdrop-blur-2xl shadow-2xl">
              <button onClick={() => setMode('photo')} className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all uppercase tracking-[0.2em] ${mode === 'photo' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-white'}`}>PHOTO</button>
              <button onClick={() => setMode('video')} className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all uppercase tracking-[0.2em] ${mode === 'video' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-white'}`}>VIDEO</button>
            </div>
          )}
          <button onClick={handleTrigger} className="relative group flex items-center justify-center transition-transform active:scale-90 duration-200">
            <div className={`w-20 h-20 rounded-full border-[4px] transition-all duration-300 ${isRecording ? 'border-red-500 scale-110' : 'border-white/30 group-hover:border-white/60'}`}></div>
            <div className={`absolute transition-all duration-300 ${mode === 'photo' ? 'w-14 h-14 bg-white rounded-full shadow-2xl' : isRecording ? 'w-8 h-8 bg-red-500 rounded-lg' : 'w-14 h-14 bg-red-600 rounded-full shadow-2xl'}`}></div>
          </button>
        </div>
      </div>
    </div>
  );
};