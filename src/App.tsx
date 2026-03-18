import { invoke } from '@tauri-apps/api/core';
import { save as saveDialog, open } from '@tauri-apps/plugin-dialog';
import { useRef, useEffect, useState, memo, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { HardwareStatus } from "./components/HardwareStatus";
import { Timeline as TimelineComponent } from "./components/Timeline/Timeline";
import { MediaLibrary as MediaLibraryComponent } from "./components/MediaLibrary";
import { PropertiesPanel as PropertiesPanelComponent } from "./components/PropertiesPanel";
import { EnhancedClipRenderer } from "./components/EnhancedClipRenderer";

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] Caught error:', error);
    (window as any).__syncframe_errors = (window as any).__syncframe_errors || [];
    (window as any).__syncframe_errors.push(`CRITICAL: ${error.message}`);
    window.dispatchEvent(new CustomEvent('syncframe-error'));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-background flex items-center justify-center flex-col gap-4">
          <div className="text-red-500 text-2xl font-bold">⚠️ Application Error</div>
          <div className="text-gray-400 max-w-md text-center">{this.state.error?.message}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-background rounded-lg font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Memoized components to prevent full app re-render on every frame
const MemoizedTimeline = memo(TimelineComponent);
const MemoizedMediaLibrary = memo(MediaLibraryComponent);
const MemoizedPropertiesPanel = memo(PropertiesPanelComponent);
import { SmartRender } from "./components/SmartRender";
import { useTimelineStore } from "./store/useTimelineStore";
import { Video, Share, Settings, Play, FastForward, Rewind, Maximize2, Layers, X } from "lucide-react";

const VisualRenderer = () => {
  const clips = useTimelineStore(s => s.clips);
  const currentTime = useTimelineStore(s => s.currentTime);
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const selectedClipId = useTimelineStore(s => s.selectedClipId);
  const selectedClip = clips.find(c => c.id === selectedClipId);

  return (
    <AnimatePresence>
      {(() => {
        return clips
          .filter(c => c.format !== 'audio')
          .sort((a, b) => a.trackId - b.trackId)
          .map((clip) => {
            const isActive = currentTime >= clip.start && currentTime < clip.start + clip.duration;
            // Only render if active or selected
            if (!isActive && selectedClipId !== clip.id) return null;

            const effectiveOpacity = isActive ? ((clip.properties.opacity || 100) / 100) : 0;
            return (
              <motion.div
                key={clip.id}
                initial={false}
                animate={{
                  opacity: effectiveOpacity,
                  scale: clip.properties.scale / 100,
                  rotate: clip.properties.rotation,
                  clipPath: clip.properties.crop ? `inset(${clip.properties.crop.top || 0}% ${clip.properties.crop.right || 0}% ${clip.properties.crop.bottom || 0}% ${clip.properties.crop.left || 0}%)` : 'none'
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0, type: 'tween' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                style={{
                  zIndex: clip.trackId * 10,
                  display: 'flex',
                  mixBlendMode: 'normal'
                }}
              >
                <div className="w-full h-full overflow-hidden" key={`renderer-${clip.id}`}>
                  <EnhancedClipRenderer
                    clip={clip}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    muted={true} // Always mute preview videos to bypass browser limits
                  />
                </div>
              </motion.div>
            );
          });
      })()}

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

// Improved Audio Engine for multi-track synchronization
const AudioEngine = () => {
  const clips = useTimelineStore(s => s.clips);
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const currentTime = useTimelineStore(s => s.currentTime);

  return (
    <div
      style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, opacity: 0.01, zIndex: -100, pointerEvents: 'none' }}
      className="overflow-hidden"
    >
      {/* Unified Audio Engine: Video audio + Dedicated audio tracks */}
      {clips
        .filter(c => c.format === 'audio' || (c.format === 'video' && c.hasAudio !== false))
        .map(clip => (
          <EnhancedClipRenderer
            key={`audio-${clip.id}`}
            clip={clip}
            isPlaying={isPlaying}
            currentTime={currentTime}
            isAudioOnly
          />
        ))
      }
    </div>
  );
};




function App() {
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const setIsPlaying = useTimelineStore(s => s.setIsPlaying);
  const initializeTracks = useTimelineStore(s => s.initializeTracks);

  const jumpSeconds = (delta: number) => {
    const state = useTimelineStore.getState();
    const totalDuration = state.clips.length > 0 ? Math.max(...state.clips.map((c) => c.start + c.duration)) : 0;
    const nextTime = Math.max(0, Math.min(totalDuration, state.currentTime + delta));
    state.setCurrentTime(nextTime);
  };

  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [isErrorPanelExpanded, setIsErrorPanelExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(window.innerHeight * 0.45);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [primed, setPrimed] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSmartRenderOpen, setIsSmartRenderOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({ resolution: '1920x1080', fps: 30, encoder: 'libx264' });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        useTimelineStore.getState().undo();
      } else if (e.ctrlKey && e.key === 'y') {
        useTimelineStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    invoke('detect_system_capabilities').then((caps: any) => {
      setExportSettings(s => ({ ...s, encoder: caps.recommended_encoder || 'libx264' }));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger spacebar play/pause if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, primed]);

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
  const currentPlaybackTimeRef = useRef<number>(0);
  const isDraggingRef = useRef<'timeline' | 'left' | 'right' | null>(null);

  useEffect(() => {
    // Keep local reference in sync with manual seeking updates while paused.
    const unsubscribe = useTimelineStore.subscribe(
      (state) => {
        if (!state.isPlaying) {
          currentPlaybackTimeRef.current = state.currentTime;
        }
      }
    );

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
      unsubscribe();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTimelineCollapsed]);

  const animate = (time: number) => {
    try {
      if (lastTimeRef.current !== null) {
        let deltaTime = (time - lastTimeRef.current) / 1000;
        // Avoid backward drift if the browser gives non-monotonic timestamps.
        if (deltaTime < 0) deltaTime = 0;
        // Cap delta to avoid big jumps on tab/CPU delays.
        deltaTime = Math.min(deltaTime, 0.05);

        const clips = useTimelineStore.getState().clips;
        const timelineEnd = clips.length > 0 ? Math.max(...clips.map((c) => c.start + c.duration)) : 10;

        // Smooth playback: increment time but don't clamp to prevent stuttering
        currentPlaybackTimeRef.current += deltaTime;
        
        // Only pause when reaching the actual end (not during looping)
        if (currentPlaybackTimeRef.current >= timelineEnd) {
          currentPlaybackTimeRef.current = timelineEnd;
        }
        
        // Keep within bounds but don't force clamping during playback
        currentPlaybackTimeRef.current = Math.max(0, currentPlaybackTimeRef.current);

        useTimelineStore.getState().setCurrentTime(currentPlaybackTimeRef.current);
      }

      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    } catch (err) {
      console.error('[animate] Error in animation frame:', err);
      (window as any).__syncframe_errors = (window as any).__syncframe_errors || [];
      (window as any).__syncframe_errors.push(`Animation error: ${err}`);
      window.dispatchEvent(new CustomEvent('syncframe-error'));
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      // If playback started, prime local clock with latest timeline position for smooth continuous updates
      currentPlaybackTimeRef.current = useTimelineStore.getState().currentTime;
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

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const handleExportSubmit = async () => {
    setIsExportModalOpen(false);
    setIsExporting(true);
    try {
      const state = useTimelineStore.getState();
      const renderClips = state.clips.map(c => ({
        id: c.id,
        source: c.source || "",
        start: c.start,
        duration: c.duration,
        track_type: c.trackId <= 3 ? "video" : "audio",
        track_id: c.trackId,
        media_offset: c.mediaOffset || 0,
        volume: c.properties?.volume !== undefined ? c.properties.volume / 100.0 : 1.0,
        fade_in: c.properties?.fadeIn || 0,
        fade_out: c.properties?.fadeOut || 0,
        speed: c.properties?.speed || 1.0,
        crop_t: c.properties?.crop?.top || 0,
        crop_b: c.properties?.crop?.bottom || 0,
        crop_l: c.properties?.crop?.left || 0,
        crop_r: c.properties?.crop?.right || 0,
        has_audio: c.hasAudio !== undefined ? c.hasAudio : (c.format === 'video' || c.format === 'audio')
      })).filter(c => c.source !== "");

      if (renderClips.length === 0) {
        throw new Error("No media clips to export!");
      }

      await invoke('start_render', {
        outputPath: 'output.mp4',
        encoder: exportSettings.encoder,
        resolution: exportSettings.resolution,
        fps: exportSettings.fps,
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

  const handleSaveProject = async () => {
    try {
      const path = await saveDialog({
        filters: [{
          name: 'SyncFrame Project',
          extensions: ['syncframe']
        }]
      });
      if (!path) return;
      const state = useTimelineStore.getState();
      const stateData = JSON.stringify({ clips: state.clips, mediaLibrary: state.mediaLibrary });
      await invoke('save_project', { path, data: stateData });
      alert('Project saved successfully!');
    } catch (e) { console.error(e); }
  };

  const handleLoadProject = async () => {
    try {
      const selected: string | string[] | null = await open({
        multiple: false,
        filters: [{
          name: 'SyncFrame Project',
          extensions: ['syncframe']
        }]
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      const data: string = await invoke('load_project', { path });
      const parsed = JSON.parse(data);
      useTimelineStore.setState({
        clips: parsed.clips || [],
        mediaLibrary: parsed.mediaLibrary || [],
        pastClips: [],
        futureClips: []
      });
      alert('Project loaded successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to load project: ' + e);
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveProject}
            className="text-textDim hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Save
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLoadProject}
            className="text-textDim hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Load
          </motion.button>

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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsSmartRenderOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border border-blue-400/30 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 relative overflow-hidden group hover:shadow-lg hover:shadow-blue-500/40"
            title="Smart Export with AI Optimization"
          >
            <span className="text-sm">✨</span>
            <span>Smart Export</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(255, 255, 255, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportClick}
            className="bg-surfaceHighlight text-textMain border border-white/10 px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-black/50 transition-all flex items-center gap-2 relative overflow-hidden group hover:bg-accent hover:text-background"
          >
            {isExporting ? <span className="animate-spin">⏳</span> : <Share size={14} className="z-10" />}
            <span className="z-10">{isExporting ? 'Render...' : 'Export Master'}</span>
          </motion.button>
        </div>
      </header>

      <AnimatePresence>
        {isSmartRenderOpen && (
          <SmartRender onClose={() => setIsSmartRenderOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-white/10 rounded-2xl w-[400px] p-6 shadow-2xl relative"
            >
              <button onClick={() => setIsExportModalOpen(false)} className="absolute top-4 right-4 text-textDim hover:text-white"><X size={20} /></button>
              <h2 className="text-lg font-black uppercase tracking-widest mb-6 text-white text-center">Export Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-textDim uppercase tracking-widest mb-2">Resolution</label>
                  <select
                    value={exportSettings.resolution}
                    onChange={e => setExportSettings(s => ({ ...s, resolution: e.target.value }))}
                    className="w-full bg-background border border-white/10 rounded-lg p-3 text-sm focus:border-accent outline-none"
                  >
                    <option value="1280x720">720p (HD)</option>
                    <option value="1920x1080">1080p (FHD)</option>
                    <option value="3840x2160">4K (UHD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-textDim uppercase tracking-widest mb-2">Frame Rate</label>
                  <select
                    value={exportSettings.fps}
                    onChange={e => setExportSettings(s => ({ ...s, fps: parseInt(e.target.value) }))}
                    className="w-full bg-background border border-white/10 rounded-lg p-3 text-sm focus:border-accent outline-none"
                  >
                    <option value="24">24 FPS (Cinematic)</option>
                    <option value="30">30 FPS (Standard)</option>
                    <option value="60">60 FPS (Smooth)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-textDim uppercase tracking-widest mb-2">Hardware Encoder</label>
                  <input type="text" value={exportSettings.encoder} disabled className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-sm text-textDim" />
                </div>
              </div>

              <button
                onClick={handleExportSubmit}
                className="w-full mt-8 bg-accent text-background font-black uppercase tracking-widest py-3 rounded-lg hover:bg-accent/90 transition-colors"
              >
                Start Render
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex overflow-hidden text-white">
        <div style={{ width: leftPanelWidth }} className="relative shrink-0">
          <MemoizedMediaLibrary />
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
              <Rewind
                size={18}
                onClick={() => jumpSeconds(-5)}
                className="text-textDim hover:text-white cursor-pointer transition-colors"
                aria-label="Rewind 5 seconds"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:shadow-[0_0_15px_white] transition-all"
              >
                {isPlaying ? <span className="w-3 h-3 bg-black rounded-sm" /> : <Play size={18} className="fill-black ml-1" />}
              </motion.button>
              <FastForward
                size={18}
                onClick={() => jumpSeconds(5)}
                className="text-textDim hover:text-white cursor-pointer transition-colors"
                aria-label="Fast forward 5 seconds"
              />
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
            <MemoizedTimeline />
          </motion.div>
        </section>

        <div style={{ width: rightPanelWidth }} className="relative shrink-0">
          <MemoizedPropertiesPanel />
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

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
