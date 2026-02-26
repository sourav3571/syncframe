import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { HardwareStatus } from "./components/HardwareStatus";
import { Timeline } from "./components/Timeline/Timeline";
import { MediaLibrary } from "./components/MediaLibrary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { useTimelineStore } from "./store/useTimelineStore";
import { Video, Share, Settings, Play, FastForward, Rewind, Maximize2, Layers } from "lucide-react";

function App() {
  const { clips, currentTime } = useTimelineStore();
  const selectedClipId = useTimelineStore((state) => state.selectedClipId);
  const selectedClip = clips.find(c => c.id === selectedClipId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(window.innerHeight * 0.45);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isPlaying, setIsPlaying] = useState(false);
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
    setIsPlaying(!isPlaying);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const renderClips = clips.map(c => ({
        id: c.id,
        source: c.source || "",
        start: c.start,
        duration: c.duration,
        track_type: c.trackId === 1 ? "video" : "audio"
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

  return (
    <div className="h-screen flex flex-col overflow-hidden text-textMain bg-background selection:bg-accent/40">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-accent/10 blur-[120px] pointer-events-none -z-10" />

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

      <main className="flex-1 flex overflow-hidden">
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

            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Maximize2 size={16} className="text-textDim" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

            {clips.filter(c => c.trackId === 2).map(audioClip => {
              const isActive = currentTime >= audioClip.start && currentTime < audioClip.start + audioClip.duration;
              const offset = currentTime - audioClip.start;

              return (
                <audio
                  key={audioClip.id}
                  src={convertFileSrc(audioClip.source || "")}
                  ref={(el) => {
                    if (el) {
                      if (isActive) {
                        if (el.paused) el.play().catch(() => { });
                        if (Math.abs(el.currentTime - offset) > 0.5) {
                          el.currentTime = offset;
                        }
                        el.volume = (audioClip.properties?.opacity || 100) / 100;
                      } else {
                        if (!el.paused) el.pause();
                      }
                    }
                  }}
                />
              );
            })}

            <motion.div
              layout
              className="h-full max-h-full aspect-video max-w-5xl bg-black rounded-lg shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center relative border border-white/10 ring-1 ring-white/5"
              style={(() => {
                const activeVideo = clips.find(c => c.trackId === 1 && currentTime >= c.start && currentTime < c.start + c.duration);
                const selectedVideo = selectedClip && selectedClip.trackId === 1 && selectedClip.source ? selectedClip : null;
                const targetClip = activeVideo || selectedVideo;

                if (targetClip) {
                  return {
                    filter: `blur(${targetClip.properties.filters.blur}px) brightness(${targetClip.properties.filters.brightness}%) contrast(${targetClip.properties.filters.contrast}%) ${targetClip.properties.filters.sepia ? 'sepia(1)' : ''} ${targetClip.properties.filters.grayscale ? 'grayscale(1)' : ''}`,
                    transform: `rotate(${targetClip.properties.rotation}deg) scale(${targetClip.properties.scale / 100})`,
                    opacity: targetClip.properties.opacity / 100
                  };
                }
                return {};
              })()}
            >
              <AnimatePresence mode="wait">
                {(() => {
                  const activeVideo = clips.find(c => c.trackId === 1 && currentTime >= c.start && currentTime < c.start + c.duration);
                  const selectedVideo = selectedClip && selectedClip.trackId === 1 && selectedClip.source ? selectedClip : null;
                  const primaryVideo = activeVideo || selectedVideo;

                  if (primaryVideo && primaryVideo.source) {
                    if (primaryVideo.format === 'image') {
                      return (
                        <img
                          key={primaryVideo.id}
                          src={convertFileSrc(primaryVideo.source)}
                          className="w-full h-full object-contain"
                          alt={primaryVideo.name}
                        />
                      );
                    }
                    console.log("Rendering video:", primaryVideo.source);
                    return (
                      <video
                        key={primaryVideo.id}
                        src={convertFileSrc(primaryVideo.source)}
                        className="w-full h-full object-contain"
                        muted
                        playsInline
                        autoPlay
                        preload="auto"
                        onTimeUpdate={() => {
                        }}
                        ref={(el) => {
                          if (el) {
                            const clipStart = primaryVideo.start;
                            const clipEnd = primaryVideo.start + primaryVideo.duration;
                            const clampedTime = Math.min(Math.max(currentTime, clipStart), clipEnd);
                            const offset = clampedTime - clipStart;
                            if (Math.abs(el.currentTime - offset) > 0.1) {
                              el.currentTime = offset;
                            }
                          }
                          videoRef.current = el;
                        }}
                      />
                    );
                  } else if (selectedClip) {
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
                  } else {
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
                })()}
              </AnimatePresence>
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
