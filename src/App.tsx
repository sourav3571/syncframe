import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { HardwareStatus } from "./components/HardwareStatus";
import { Timeline } from "./components/Timeline/Timeline";
import { MediaLibrary } from "./components/MediaLibrary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { useTimelineStore } from "./store/useTimelineStore";
import { Video, Share, Settings, Play, FastForward, Rewind, Maximize2, Layers } from "lucide-react";

// Dedicated renderer for timeline clips to handle synchronization without lag
const ClipRenderer = ({ clip, currentTime, isPlaying, isAudioOnly = false }: { clip: any, currentTime: number, isPlaying: boolean, isAudioOnly?: boolean }) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  // Robust source resolution
  const resolveSource = (src: string) => {
    if (!src) return "";
    if (src.startsWith('http') || src.startsWith('asset:') || src.startsWith('data:')) return src;
    if (src.startsWith('/')) {
      return new URL(src, window.location.origin).href;
    }
    return convertFileSrc(src);
  };

  const source = resolveSource(clip.source || "");
  const isActive = currentTime >= clip.start && currentTime < clip.start + clip.duration;

  // Priming listener for global playback initialization
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const primeElement = () => {
      el.load();
      el.play().then(() => el.pause()).catch(() => { });
    };

    if ((window as any).__syncframe_primed) {
      primeElement();
    }

    const handlePrime = () => primeElement();
    window.addEventListener('prime-media', handlePrime);
    return () => window.removeEventListener('prime-media', handlePrime);
  }, []);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    // Aggressive Play/Pause Sync
    const syncPlayback = async () => {
      try {
        if (isPlaying && isActive) {
          if (el.paused) {
            console.info(`[ClipSync] Attempting play: ${clip.name}`);
            el.muted = false;
            await el.play();
          }
        } else {
          if (!el.paused) {
            console.info(`[ClipSync] Pausing: ${clip.name}`);
            el.pause();
          }
        }
      } catch (err: any) {
        const msg = `Autoplay Blocked [${clip.name}]: ${err.message}`;
        console.warn(msg);
        if (isActive && isPlaying) {
          (window as any).__syncframe_errors = (window as any).__syncframe_errors || [];
          if (!(window as any).__syncframe_errors.includes(msg)) {
            (window as any).__syncframe_errors.push(msg);
            window.dispatchEvent(new CustomEvent('syncframe-error'));
          }
        }
      }
    };

    syncPlayback();
  }, [isPlaying, isActive, clip.name]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !isActive) return;

    // Sync time offset (only if drift is significant)
    const expectedOffset = currentTime - clip.start;
    const drift = Math.abs(el.currentTime - expectedOffset);
    // Relaxed threshold to reduce jitter (0.4s)
    if (drift > 0.4) {
      try {
        el.currentTime = Math.max(0, expectedOffset);
      } catch (e) {
        // Ignore if element is not ready to set currentTime
      }
    }
  }, [currentTime, clip.start, isActive]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const targetVolume = isActive ? (clip.properties?.opacity || 100) / 100 : 0;
    el.volume = Math.min(1, Math.max(0, targetVolume));
  }, [clip.properties?.opacity, isActive]);

  const handleError = (e: any) => {
    const errorMsg = `Media Error [${clip.name}]: ${e.target.error?.message || 'Unknown error'}`;
    console.error(errorMsg);
    (window as any).__syncframe_errors = (window as any).__syncframe_errors || [];
    (window as any).__syncframe_errors.push(errorMsg);
    window.dispatchEvent(new CustomEvent('syncframe-error'));
  };

  if (isAudioOnly) {
    return (
      <audio
        ref={mediaRef as any}
        src={source}
        preload="auto"
        crossOrigin="anonymous"
        onError={handleError}
        style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0.01 }}
      />
    );
  }

  const properties = clip.properties;
  let filterString = `blur(${properties.filters.blur}px) brightness(${properties.filters.brightness}%) contrast(${properties.filters.contrast}%) ${properties.filters.sepia ? 'sepia(1)' : ''} ${properties.filters.grayscale ? 'grayscale(1)' : ''}`;
  if (properties.filters.custom && properties.filters.custom !== 'none') filterString += ` ${properties.filters.custom}`;
  if (properties.adjustments) {
    const adj = properties.adjustments;
    filterString += ` saturate(${adj.saturation}%) brightness(${100 + adj.exposure}%) hue-rotate(${adj.tint}deg)`;
  }

  if (clip.format === 'text') {
    return (
      <div
        style={{
          fontFamily: properties.textStyle?.font || 'Inter',
          color: properties.textStyle?.color || 'white',
          textShadow: properties.textStyle?.shadow || 'none',
          animation: properties.textStyle?.animation !== 'none' ? `${properties.textStyle?.animation} 2s infinite` : 'none'
        }}
        className="text-4xl font-black text-center"
      >
        {clip.textContent}
      </div>
    );
  }

  if (clip.format === 'sticker') {
    return <div className="text-8xl drop-shadow-2xl">{clip.stickerId}</div>;
  }

  if (clip.format === 'image') {
    return <img src={source} className="w-full h-full object-contain shadow-2xl" alt={clip.name} />;
  }

  if (clip.format === 'filter' || clip.format === 'adjustment') {
    return (
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ backdropFilter: filterString }}
      />
    );
  }

  return (
    <video
      ref={mediaRef as any}
      src={source}
      className="w-full h-full object-contain"
      playsInline
      muted={false}
      preload="auto"
      crossOrigin="anonymous"
      onError={handleError}
      style={{ filter: clip.format === 'video' ? filterString : 'none' }}
    />
  );
};

// Isolated Visual Renderer to prevent full-app re-renders at 60fps
const VisualRenderer = () => {
  const clips = useTimelineStore(s => s.clips);
  const currentTime = useTimelineStore(s => s.currentTime);
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const selectedClipId = useTimelineStore(s => s.selectedClipId);
  const selectedClip = clips.find(c => c.id === selectedClipId);

  return (
    <AnimatePresence mode="popLayout">
      {clips
        .filter(c => c.format !== 'audio' && currentTime >= c.start && currentTime < c.start + c.duration)
        .sort((a, b) => a.trackId - b.trackId)
        .map((clip) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0 }}
            animate={{
              opacity: clip.properties.opacity / 100,
              scale: clip.properties.scale / 100,
              rotate: clip.properties.rotation,
            }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 - clip.trackId }}
          >
            <ClipRenderer clip={clip} currentTime={currentTime} isPlaying={isPlaying} />
          </motion.div>
        ))
      }

      {(() => {
        const hasActiveVisualClips = clips.some(c => c.format !== 'audio' && currentTime >= c.start && currentTime < c.start + c.duration);

        if (!hasActiveVisualClips && selectedClip) {
          return (
            <motion.div
              key={selectedClip.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              <div className="text-[12px] font-bold text-accent mb-3 uppercase tracking-[0.4em] mono">Selected Node: {selectedClip.id}</div>
              <div className="text-6xl font-black text-white italic uppercase select-none drop-shadow-2xl">{selectedClip.name}</div>
              <div className="mt-8 flex justify-center gap-4">
                <div className="px-4 py-1 rounded-full border border-white/10 text-[10px] font-bold text-textDim uppercase tracking-widest backdrop-blur">
                  {selectedClip.properties.scale}% Scale
                </div>
                <div className="px-4 py-1 rounded-full border border-white/10 text-[10px] font-bold text-textDim uppercase tracking-widest backdrop-blur">
                  {selectedClip.properties.rotation}° Rot
                </div>
              </div>
            </motion.div>
          );
        } else if (!hasActiveVisualClips) {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className="flex flex-col items-center"
            >
              <Video size={100} className="mb-6 text-accent" />
              <div className="text-sm font-black uppercase tracking-[1em] text-white">Standby</div>
            </motion.div>
          );
        }
        return null;
      })()}
    </AnimatePresence>
  );
};

// Isolated Audio Engine to prevent full-app re-renders at 60fps
const AudioEngine = () => {
  const clips = useTimelineStore(s => s.clips);
  const currentTime = useTimelineStore(s => s.currentTime);
  const isPlaying = useTimelineStore(s => s.isPlaying);

  return (
    <div
      style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, opacity: 0.01, zIndex: -100, pointerEvents: 'none' }}
      className="overflow-hidden"
    >
      <audio
        autoPlay
        loop
        muted={false}
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA== "
        onPlay={() => console.info("[SystemEngine] Heartbeat started")}
      />
      {clips
        .filter(c => c.format === 'audio')
        .map(clip => (
          <ClipRenderer key={clip.id} clip={clip} currentTime={currentTime} isPlaying={isPlaying} isAudioOnly />
        ))
      }
    </div>
  );
};




function App() {
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const setIsPlaying = useTimelineStore(s => s.setIsPlaying);
  const initializeTracks = useTimelineStore(s => s.initializeTracks);

  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [isErrorPanelExpanded, setIsErrorPanelExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(window.innerHeight * 0.45);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    const updateLogs = () => {
      const errors = (window as any).__syncframe_errors || [];
      setErrorLog(prev => {
        if (prev.length === errors.length) return prev;
        return [...errors];
      });
    };
    window.addEventListener('syncframe-error', updateLogs);
    updateLogs();
    return () => window.removeEventListener('syncframe-error', updateLogs);
  }, []);

  useEffect(() => {
    initializeTracks();
  }, [initializeTracks]);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isDraggingRef = useRef<'timeline' | 'left' | 'right' | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      if (isDraggingRef.current === 'timeline') {
        const newHeight = window.innerHeight - e.clientY;
        const minHeight = 48;
        const maxHeight = window.innerHeight * 0.8;

        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setTimelineHeight(newHeight);
          if (newHeight > 60 && isTimelineCollapsed) setIsTimelineCollapsed(false);
        }
      } else if (isDraggingRef.current === 'left') {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 600) setLeftPanelWidth(newWidth);
      } else if (isDraggingRef.current === 'right') {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 200 && newWidth <= 600) setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTimelineCollapsed]);

  const animate = (time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      useTimelineStore.getState().setCurrentTime(useTimelineStore.getState().currentTime + deltaTime);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const state = useTimelineStore.getState();
    console.info(`[SystemEngine] Toggle Play: ${!isPlaying} | Clips: ${state.clips.length} | Time: ${state.currentTime.toFixed(2)}`);
    if (!primed) {
      window.dispatchEvent(new CustomEvent('prime-media'));
      (window as any).__syncframe_primed = true;
      setPrimed(true);
    }
    setIsPlaying(!isPlaying);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const state = useTimelineStore.getState();
      const renderClips = state.clips.map(c => ({
        id: c.id,
        source: c.source || "",
        start: c.start,
        duration: c.duration,
        track_type: c.trackId <= 3 ? "video" : "audio",
        track_id: c.trackId
      })).filter(c => c.source !== "");

      if (renderClips.length === 0) {
        throw new Error("No media clips to export!");
      }

      await invoke('start_render', {
        outputPath: 'output.mp4',
        encoder: 'libx264',
        clips: renderClips
      });
      alert('Render started! Monitor your output folder.');
    } catch (e) {
      console.error(e);
      alert('Render failed: ' + e);
    } finally {
      setIsExporting(false);
    }
  };

  const playerContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden text-textMain bg-background selection:bg-accent/40">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-accent/10 blur-[120px] pointer-events-none -z-10" />

      <AudioEngine />



      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 glass-panel z-50">
        <div className="flex items-center gap-5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-zinc-400 flex items-center justify-center shadow-lg shadow-accent/20 cursor-pointer"
          >
            <Video size={24} className="text-white" />
          </motion.div>
          <div>
            <h1 className="font-extrabold tracking-[0.15em] text-xl uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-textDim">SyncFrame</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[9px] text-textDim font-bold uppercase tracking-[0.2em]">Studio Elite Engine v2.5</p>
            </div>
          </div>
        </div>

        <HardwareStatus />

        <div className="flex items-center gap-4">
          {/* Integrated System Engine Button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setIsErrorPanelExpanded(!isErrorPanelExpanded)}
              className={`p-2 rounded-full transition-all border ${errorLog.length > 0
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              title="System Engine Status"
            >
              <div className={`w-2 h-2 rounded-full ${errorLog.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            </motion.button>

            <AnimatePresence>
              {isErrorPanelExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-14 bg-surfaceHighlight/95 border border-white/10 p-5 rounded-3xl backdrop-blur-3xl shadow-2xl w-80 z-[100]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-textMain">System Engine</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('prime-media'));
                          (window as any).__syncframe_primed = true;
                        }}
                        className="text-[9px] font-bold bg-accent text-background px-3 py-1 rounded-full"
                      >
                        Force Unlock
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__syncframe_errors = [];
                          setErrorLog([]);
                          setIsErrorPanelExpanded(false);
                        }}
                        className="text-[9px] font-bold bg-white/10 text-white px-3 py-1 rounded-full border border-white/5"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {errorLog.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {errorLog.map((err, i) => (
                        <div key={i} className="text-[10px] font-mono text-red-100 bg-red-500/10 p-2 rounded-lg border border-red-500/20 leading-tight">
                          {err}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] italic text-textDim text-center py-2">Hardware & Media: Optimized</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button whileHover={{ scale: 1.1 }} className="text-textDim hover:text-white p-2 rounded-full hover:bg-white/5 transition-all">
            <Settings size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(255, 255, 255, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="bg-surfaceHighlight text-textMain border border-white/10 px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-black/50 transition-all flex items-center gap-2 relative overflow-hidden group hover:bg-accent hover:text-background"
          >
            {isExporting ? <span className="animate-spin">⏳</span> : <Share size={14} className="z-10" />}
            <span className="z-10">{isExporting ? 'Render...' : 'Export Master'}</span>
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden text-white">
        <div style={{ width: leftPanelWidth }} className="relative shrink-0">
          <MediaLibrary />
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-accent/50 transition-colors"
            onMouseDown={() => {
              isDraggingRef.current = 'left';
              document.body.style.cursor = 'col-resize';
            }}
          />
        </div>

        <section className="flex-1 flex flex-col bg-background/50">
          <div className="p-3 border-b border-white/5 flex items-center justify-between px-8 bg-surface/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Layers size={14} className="text-accent" />
              <div className="text-[10px] font-bold text-textDim uppercase tracking-widest mt-0.5">
                Monitor: <span className="text-textMain ml-1">Live Sequence</span>
              </div>
            </div>

            <div className="flex items-center gap-8 bg-black/20 px-6 py-1.5 rounded-full border border-white/5">
              <Rewind size={18} className="text-textDim hover:text-white cursor-pointer transition-colors" />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:shadow-[0_0_15px_white] transition-all"
              >
                {isPlaying ? <span className="w-3 h-3 bg-black rounded-sm" /> : <Play size={18} className="fill-black ml-1" />}
              </motion.button>
              <FastForward size={18} className="text-textDim hover:text-white cursor-pointer transition-colors" />
            </div>

            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Maximize2 size={16} className="text-textDim" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

            <motion.div
              layout
              ref={playerContainerRef}
              className="h-full max-h-full aspect-video max-w-5xl bg-black rounded-lg shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center relative border border-white/10 ring-1 ring-white/5"
            >
              <VisualRenderer />
            </motion.div>
          </div>

          <motion.div
            initial={{ height: 400 }}
            animate={{ height: isTimelineCollapsed ? 48 : timelineHeight }}
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            className="relative border-t border-white/5 bg-background z-40"
          >
            <div
              className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize z-50 group flex justify-center"
              onMouseDown={() => {
                isDraggingRef.current = 'timeline';
                document.body.style.cursor = 'row-resize';
              }}
            >
              <div className="w-full h-full group-hover:bg-accent/50 transition-colors" />
            </div>

            <button
              onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 bg-background border border-white/10 rounded-full p-1 hover:bg-surfaceHighlight transition-colors"
              title={isTimelineCollapsed ? "Expand Timeline" : "Collapse Timeline"}
            >
              <div className={`transition-transform duration-300 ${isTimelineCollapsed ? 'rotate-180' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-textDim"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </button>
            <Timeline />
          </motion.div>
        </section>

        <div style={{ width: rightPanelWidth }} className="relative shrink-0">
          <PropertiesPanel />
          <div
            className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-accent/50 transition-colors"
            onMouseDown={() => {
              isDraggingRef.current = 'right';
              document.body.style.cursor = 'col-resize';
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
