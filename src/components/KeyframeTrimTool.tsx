import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Key, Lock, Unlock } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';

interface Keyframe {
  id: string;
  time: number;
  isLocked: boolean;
  label?: string;
}

interface KeyframeTrimToolProps {
  clipId: string;
  duration: number;
  onClose: () => void;
}

export const KeyframeTrimTool = ({ clipId, duration, onClose }: KeyframeTrimToolProps) => {
  const { updateClip } = useTimelineStore();
  
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: 'kf-start', time: 0, isLocked: true, label: 'Start' },
    { id: 'kf-end', time: duration, isLocked: true, label: 'End' }
  ]);
  
  const [previewTime, setPreviewTime] = useState(0);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>('kf-start');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startKeyframe = keyframes.find(kf => kf.id === 'kf-start')!;
  const endKeyframe = keyframes.find(kf => kf.id === 'kf-end')!;
  const trimmedDuration = endKeyframe.time - startKeyframe.time;

  // Add intermediate keyframe
  const addKeyframe = (time: number) => {
    const newKf: Keyframe = {
      id: `kf-${Date.now()}`,
      time: Math.max(startKeyframe.time, Math.min(time, endKeyframe.time)),
      isLocked: false,
      label: `Mark ${keyframes.filter(k => !k.label).length}`
    };
    setKeyframes(prev => [...prev, newKf].sort((a, b) => a.time - b.time));
  };

  // Update keyframe position
  const updateKeyframeTime = (id: string, time: number) => {
    setKeyframes(prev => prev.map(kf => {
      if (kf.id === id) {
        const clampedTime = Math.max(0, Math.min(duration, time));
        return { ...kf, time: clampedTime };
      }
      return kf;
    }).sort((a, b) => a.time - b.time));
  };

  // Toggle keyframe lock
  const toggleLock = (id: string) => {
    setKeyframes(prev => prev.map(kf =>
      kf.id === id ? { ...kf, isLocked: !kf.isLocked } : kf
    ));
  };

  // Remove keyframe
  const removeKeyframe = (id: string) => {
    if (id === 'kf-start' || id === 'kf-end') return;
    setKeyframes(prev => prev.filter(kf => kf.id !== id));
  };

  // Handle mouse move for dragging keyframes
  useEffect(() => {
    if (!isDragging || !selectedKeyframeId || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * duration;
      updateKeyframeTime(selectedKeyframeId, time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedKeyframeId, duration]);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Only add keyframe if not clicking on existing keyframe
    const percent = x / rect.width;
    const time = percent * duration;
    const clickedKf = keyframes.find(kf => Math.abs(kf.time - time) < duration * 0.05);
    if (!clickedKf) {
      addKeyframe(time);
    }
  };

  const handleApplyTrim = () => {
    updateClip(clipId, {
      mediaOffset: startKeyframe.time,
      duration: trimmedDuration
    });
    onClose();
  };

  const getTimeDisplay = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = (time % 60).toFixed(2);
    return `${min}:${sec.padStart(5, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
      >
        <motion.div
          className="bg-surface border border-border rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-accent/20 text-accent">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Keyframe Trim Tool</h3>
              <p className="text-xs text-textDim mt-1">Lock keyframes to preserve smooth transitions</p>
            </div>
          </div>

          {/* Timeline Visualization with Keyframes */}
          <div className="space-y-4 mb-8">
            <div
              ref={containerRef}
              className="relative h-24 bg-black/50 rounded-xl border border-white/10 overflow-hidden cursor-pointer group"
              onClick={handleContainerClick}
              onMouseMove={(e) => {
                if (!isDragging) {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    const time = percent * duration;
                    setPreviewTime(time);
                  }
                }
              }}
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20" />

              {/* Disabled zones */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(startKeyframe.time / duration) * 100}%` }}
                className="absolute left-0 top-0 h-full bg-black/60 border-r-2 border-accent/50"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((duration - endKeyframe.time) / duration) * 100}%` }}
                className="absolute right-0 top-0 h-full bg-black/60 border-l-2 border-accent/50"
              />

              {/* Preview indicator */}
              <motion.div
                animate={{ left: `${(previewTime / duration) * 100}%` }}
                className="absolute top-0 h-full w-1 bg-accent/80 shadow-lg shadow-accent/50"
              />

              {/* Keyframes */}
              {keyframes.map((kf) => {
                const position = (kf.time / duration) * 100;
                const isSelected = kf.id === selectedKeyframeId;

                return (
                  <motion.div
                    key={kf.id}
                    initial={{ left: `${position}%` }}
                    animate={{ left: `${position}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedKeyframeId(kf.id);
                      setIsDragging(true);
                    }}
                  >
                    {/* Keyframe handle */}
                    <motion.div
                      animate={{
                        scale: isSelected ? 1.3 : 1,
                        boxShadow: isSelected ? `0 0 20px rgba(255, 200, 0, 0.6)` : 'none'
                      }}
                      className={`w-6 h-12 rounded-lg border-2 border-white flex items-center justify-center transition-all ${
                        kf.isLocked
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                          : 'bg-gradient-to-r from-accent to-accent/80'
                      } hover:shadow-xl`}
                    >
                      {kf.isLocked ? <Lock size={10} className="text-white" /> : <Key size={10} className="text-white" />}
                    </motion.div>

                    {/* Label */}
                    {kf.label && (
                      <div className="text-[9px] font-bold text-white mt-1 whitespace-nowrap bg-black/70 px-2 py-0.5 rounded">
                        {kf.label}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Time display */}
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <ChevronLeft size={16} className="text-accent" />
                <span className="text-sm font-mono text-white">{getTimeDisplay(startKeyframe.time)}</span>
              </div>
              <div className="flex items-center gap-2 text-center">
                <Clock size={16} className="text-textDim" />
                <span className="text-xs text-textDim font-mono">{getTimeDisplay(previewTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-white">{getTimeDisplay(endKeyframe.time)}</span>
                <ChevronRight size={16} className="text-accent" />
              </div>
            </div>
          </div>

          {/* Keyframes Panel */}
          <div className="bg-black/30 rounded-xl p-4 mb-8 border border-white/10 max-h-48 overflow-y-auto">
            <div className="text-xs font-black text-textDim uppercase tracking-widest mb-3 flex items-center gap-2">
              <Key size={12} /> Active Keyframes
            </div>
            <div className="space-y-2">
              {keyframes.map((kf) => (
                <motion.div
                  key={kf.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    kf.id === selectedKeyframeId
                      ? 'bg-accent/20 border-accent/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[9px] font-mono font-black text-textDim">{getTimeDisplay(kf.time)}</span>
                    <span className="text-[8px] font-bold text-textMain uppercase">{kf.label || 'Marker'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {kf.id !== 'kf-start' && kf.id !== 'kf-end' && (
                      <button
                        onClick={() => removeKeyframe(kf.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-500 text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      onClick={() => toggleLock(kf.id)}
                      className={`p-1 rounded ${
                        kf.isLocked ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-textDim'
                      }`}
                    >
                      {kf.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Duration info */}
          <div className="bg-black/30 rounded-xl p-4 mb-8 border border-white/5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-textDim uppercase font-black tracking-wider">Original</p>
                <p className="text-lg font-mono text-accent mt-1">{getTimeDisplay(duration)}</p>
              </div>
              <div>
                <p className="text-xs text-textDim uppercase font-black tracking-wider">Trimmed</p>
                <p className="text-lg font-mono text-white mt-1">{getTimeDisplay(trimmedDuration)}</p>
              </div>
              <div>
                <p className="text-xs text-textDim uppercase font-black tracking-wider">Saved</p>
                <p className="text-lg font-mono text-green-400 mt-1">{getTimeDisplay(duration - trimmedDuration)}</p>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
            <p className="text-xs text-blue-300 leading-relaxed">
              <strong>💡 Tip:</strong> Locked keyframes (amber) ensure smooth transitions during rendering. Click on timeline to add markers, drag handles to adjust trim points.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleApplyTrim}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/50 transition-all"
            >
              <CheckCircle2 size={20} />
              Apply Keyframes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
