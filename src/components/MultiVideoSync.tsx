import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Link2, Radio, CheckCircle2, X, Play, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTimelineStore } from '../store/useTimelineStore';

interface MultiVideoSyncProps {
  selectedClipIds: string[];
  onClose: () => void;
}

export const MultiVideoSync = ({ selectedClipIds, onClose }: MultiVideoSyncProps) => {
  const { clips, syncClips } = useTimelineStore();
  const [isLoading, setIsLoading] = useState(false);
  const [syncMethod, setSyncMethod] = useState<'audio' | 'visual' | 'manual'>('audio');
  const [referenceTime, setReferenceTime] = useState(0);
  const [syncResults, setSyncResults] = useState<{ clipId: string; offset: number; confidence: number }[]>([]);
  const [hasAdjustments, setHasAdjustments] = useState(false);

  const selectedClips = clips.filter(c => selectedClipIds.includes(c.id));
  const videoPaths = selectedClips
    .filter(c => c.source)
    .map(c => ({ id: c.id, path: c.source! }));

  const handleAutoSync = async () => {
    if (videoPaths.length < 2) {
      alert('Please select at least 2 clips to sync');
      return;
    }

    setIsLoading(true);
    try {
      const results = await invoke<any>('auto_align_clips', {
        paths: videoPaths.map(v => v.path),
        method: syncMethod
      });

      const syncData = videoPaths.map((video, idx) => ({
        clipId: video.id,
        offset: results[idx]?.offset_seconds || 0,
        confidence: results[idx]?.confidence || 0.5
      }));

      setSyncResults(syncData);
      setHasAdjustments(true);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Auto-sync failed. Please try manual sync.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySync = () => {
    if (syncResults.length === 0) {
      syncClips(selectedClipIds, referenceTime);
    } else {
      // Apply individual offsets
      syncResults.forEach(result => {
        const newStartTime = referenceTime + result.offset;
        syncClips([result.clipId], newStartTime);
      });
    }
    onClose();
  };

  const handleAdjustOffset = (clipId: string, newOffset: number) => {
    setSyncResults(prev =>
      prev.map(r =>
        r.clipId === clipId ? { ...r, offset: newOffset } : r
      )
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-surface border border-border rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/20 text-accent">
                <Link2 size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Multi-Video Sync</h2>
                <p className="text-xs text-textDim mt-1">Synchronize {selectedClips.length} clips across multiple tracks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={24} className="text-textDim" />
            </button>
          </div>

          {/* Sync Method Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { id: 'audio', icon: '🔊', label: 'Audio Sync', desc: 'Sync by audio waveforms' },
              { id: 'visual', icon: '👁️', label: 'Visual Sync', desc: 'Sync by scene detection' },
              { id: 'manual', icon: '🎚️', label: 'Manual Sync', desc: 'Adjust offsets manually' }
            ].map(method => (
              <motion.button
                key={method.id}
                onClick={() => setSyncMethod(method.id as any)}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  syncMethod === method.id
                    ? 'border-accent bg-accent/20'
                    : 'border-white/10 bg-white/5 hover:border-accent/50'
                }`}
              >
                <div className="text-3xl mb-2">{method.icon}</div>
                <h4 className="font-black text-sm text-white">{method.label}</h4>
                <p className="text-xs text-textDim mt-1">{method.desc}</p>
              </motion.button>
            ))}
          </div>

          {/* Selected Clips */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <Radio size={16} className="text-accent" />
              Selected Clips
            </h3>
            <div className="space-y-2">
              {selectedClips.map(clip => (
                <div key={clip.id} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm text-white flex-1">{clip.name}</span>
                  <span className="text-xs text-textDim font-mono">
                    {clip.format} • {clip.duration.toFixed(2)}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Results or Input */}
          {!hasAdjustments ? (
            <div className="space-y-6 mb-8">
              {/* Reference Time Setting */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-6">
                <label className="block text-sm font-black text-white mb-4">
                  Reference Time (seconds)
                </label>
                <div className="flex gap-4 items-end">
                  <input
                    type="number"
                    value={referenceTime}
                    onChange={(e) => setReferenceTime(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-textDim focus:border-accent focus:outline-none"
                  />
                  <span className="text-xs text-textDim font-mono">{referenceTime.toFixed(2)}s</span>
                </div>
              </div>

              {/* Auto Sync Option */}
              {syncMethod !== 'manual' && (
                <div className="bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <Zap size={24} className="text-accent mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-black text-white mb-2">Automatic Synchronization</h4>
                      <p className="text-xs text-textDim mb-4">
                        {syncMethod === 'audio'
                          ? 'Analyzes audio tracks for matching frequencies and patterns'
                          : 'Uses visual scene detection and keyframe matching'}
                      </p>
                      <motion.button
                        onClick={handleAutoSync}
                        disabled={isLoading || videoPaths.length < 2}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 rounded-lg bg-accent text-black font-black text-sm hover:shadow-lg hover:shadow-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isLoading ? 'Analyzing...' : 'Start Auto-Sync'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black/30 border border-white/5 rounded-2xl p-6 mb-8 space-y-4">
              <h3 className="text-sm font-black text-white mb-4">Sync Adjustments</h3>
              {syncResults.map(result => (
                <div key={result.clipId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">
                      {selectedClips.find(c => c.id === result.clipId)?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-textDim">Confidence:</span>
                      <div className="w-24 h-2 bg-black/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          className="h-full bg-accent"
                        />
                      </div>
                      <span className="text-xs text-accent font-mono">{(result.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={result.offset}
                      onChange={(e) => handleAdjustOffset(result.clipId, parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm font-mono focus:border-accent focus:outline-none"
                    />
                    <span className="text-xs text-textDim font-mono w-16">offset (s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-8 flex gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-200">
              <p className="font-bold mb-1">Pro Tip:</p>
              <p>
                Use audio sync for videos with clear audio tracks. Visual sync works best with movies and scenes with distinct changes.
                Manual sync gives you full control over timing adjustments.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            {!hasAdjustments && syncMethod === 'manual' && (
              <motion.button
                onClick={handleApplySync}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black"
              >
                Apply Sync
              </motion.button>
            )}
            {hasAdjustments && (
              <motion.button
                onClick={handleApplySync}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                Apply Adjustments
              </motion.button>
            )}
            {!hasAdjustments && syncMethod !== 'manual' && (
              <motion.button
                onClick={handleAutoSync}
                disabled={isLoading || videoPaths.length < 2}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                      <Play size={20} />
                    </motion.div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Auto-Sync
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
