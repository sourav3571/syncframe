import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Clock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';

interface TrimToolProps {
  clipId: string;
  duration: number;
  onClose: () => void;
}

export const TrimTool = ({ clipId, duration, onClose }: TrimToolProps) => {
  const { clips, trimClip, updateClip } = useTimelineStore();
  const clip = clips.find(c => c.id === clipId);
  const [trimStart, setTrimStart] = useState(clip?.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(clip?.trimEnd || duration);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [previewTime, setPreviewTime] = useState(trimStart);
  const containerRef = useRef<HTMLDivElement>(null);

  const progress = ((previewTime - trimStart) / (trimEnd - trimStart)) * 100;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = trimStart + (trimEnd - trimStart) * percent;

      if (isDraggingStart) {
        const newStart = Math.max(0, Math.min(time, trimEnd - 0.1));
        setTrimStart(newStart);
        setPreviewTime(newStart);
      } else if (isDraggingEnd) {
        const newEnd = Math.min(duration, Math.max(time, trimStart + 0.1));
        setTrimEnd(newEnd);
        setPreviewTime(newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
    };

    if (isDraggingStart || isDraggingEnd) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingStart, isDraggingEnd, trimStart, trimEnd, duration]);

  const handleConfirmTrim = () => {
    const actualDuration = trimEnd - trimStart;
    trimClip(clipId, trimStart, trimEnd);
    updateClip(clipId, {
      duration: actualDuration,
      mediaOffset: trimStart,
    });
    onClose();
  };

  const getTimeDisplay = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = (time % 60).toFixed(2);
    return `${min}:${sec.padStart(5, '0')}`;
  };

  const trimStartPercent = (trimStart / duration) * 100;
  const trimEndPercent = (trimEnd / duration) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
      >
        <motion.div
          className="bg-surface border border-border rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-accent/20 text-accent">
              <Scissors size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Smooth Trim Tool</h3>
              <p className="text-xs text-textDim mt-1">Adjust start and end points with live preview</p>
            </div>
          </div>

          {/* Timeline Visualization */}
          <div className="space-y-4 mb-8">
            <div
              ref={containerRef}
              className="relative h-20 bg-black/50 rounded-xl border border-white/10 overflow-hidden cursor-col-resize group"
              onMouseMove={(e) => {
                if (!isDraggingStart && !isDraggingEnd) {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    const time = trimStart + (trimEnd - trimStart) * percent;
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
                animate={{ width: `${trimStartPercent}%` }}
                className="absolute left-0 top-0 h-full bg-black/60 border-r-2 border-accent/50"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - trimEndPercent}%` }}
                className="absolute right-0 top-0 h-full bg-black/60 border-l-2 border-accent/50"
              />

              {/* Progress indicator */}
              <motion.div
                initial={{ left: 0 }}
                animate={{ left: `${progress}%` }}
                className="absolute top-0 h-full w-1 bg-accent/80 shadow-lg shadow-accent/50"
              />

              {/* Start handle */}
              <motion.div
                initial={{ left: `${trimStartPercent}%` }}
                animate={{ left: `${trimStartPercent}%` }}
                onMouseDown={() => setIsDraggingStart(true)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-10 bg-gradient-to-r from-accent to-accent/80 rounded-lg border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:shadow-xl hover:shadow-accent/50 transition-all group-hover:h-12"
              />

              {/* End handle */}
              <motion.div
                initial={{ right: `${100 - trimEndPercent}%` }}
                animate={{ right: `${100 - trimEndPercent}%` }}
                onMouseDown={() => setIsDraggingEnd(true)}
                className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-10 bg-gradient-to-r from-accent/80 to-accent rounded-lg border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:shadow-xl hover:shadow-accent/50 transition-all group-hover:h-12"
              />
            </div>

            {/* Time display */}
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <ChevronLeft size={16} className="text-accent" />
                <span className="text-sm font-mono text-white">{getTimeDisplay(trimStart)}</span>
              </div>
              <div className="flex items-center gap-2 text-center">
                <Clock size={16} className="text-textDim" />
                <span className="text-xs text-textDim font-mono">{getTimeDisplay(previewTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-white">{getTimeDisplay(trimEnd)}</span>
                <ChevronRight size={16} className="text-accent" />
              </div>
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
                <p className="text-lg font-mono text-white mt-1">{getTimeDisplay(trimEnd - trimStart)}</p>
              </div>
              <div>
                <p className="text-xs text-textDim uppercase font-black tracking-wider">Saved</p>
                <p className="text-lg font-mono text-green-400 mt-1">{getTimeDisplay(duration - (trimEnd - trimStart))}</p>
              </div>
            </div>
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
              onClick={handleConfirmTrim}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/50 transition-all"
            >
              <CheckCircle2 size={20} />
              Apply Trim
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
