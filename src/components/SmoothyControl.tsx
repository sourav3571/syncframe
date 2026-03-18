import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Activity, Zap, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SmoothnessConfig {
  maxSyncDriftMs: number;
  enableFrameInterpolation: boolean;
  interpolationQuality: 'Low' | 'Medium' | 'High';
  audioSmoothingEnabled: boolean;
  audioSmoothingFactor: number;
  enableVSync: boolean;
  targetFramerate: number;
  useHardwareAcceleration: boolean;
}

interface SyncMetrics {
  audioVideoDriftMs: number;
  frameDrop: number;
  jitterMs: number;
  smoothnessScore: number;
  bufferHealth: number;
}

export const SmoothyControl = () => {
  const [config, setConfig] = useState<SmoothnessConfig>({
    maxSyncDriftMs: 40,
    enableFrameInterpolation: true,
    interpolationQuality: 'High',
    audioSmoothingEnabled: true,
    audioSmoothingFactor: 0.7,
    enableVSync: true,
    targetFramerate: 90,
    useHardwareAcceleration: true,
  });

  const [metrics, setMetrics] = useState<SyncMetrics>({
    audioVideoDriftMs: 0,
    frameDrop: 0,
    jitterMs: 0,
    smoothnessScore: 1,
    bufferHealth: 0.85,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    let interval: number | null = null;

    if (isMonitoring) {
      interval = window.setInterval(async () => {
        try {
          const result = await invoke('update_smoothness_metrics', {
            videoTime: 0,
            audioTime: 0,
            fps: config.targetFramerate,
          });
          setMetrics(result as SyncMetrics);
        } catch (e) {
          console.warn('Failed to update metrics:', e);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, config.targetFramerate]);

  const getHealthColor = (score: number) => {
    if (score > 0.9) return 'text-green-400';
    if (score > 0.7) return 'text-yellow-400';
    if (score > 0.5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score > 0.9) return 'bg-green-500/10 border-green-500/30';
    if (score > 0.7) return 'bg-yellow-500/10 border-yellow-500/30';
    if (score > 0.5) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const handleConfigChange = (key: keyof SmoothnessConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 right-4 z-40">
        {/* Floating Button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
            metrics.smoothnessScore > 0.8
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : metrics.smoothnessScore > 0.6
              ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
              : 'bg-gradient-to-r from-red-500 to-pink-600'
          }`}
        >
          <Activity size={24} className="text-white" />
        </motion.button>

        {/* Expanded Panel */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-96 bg-surface border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-accent/20 to-accent/10 p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-accent" />
                  <h3 className="font-black text-white text-sm uppercase tracking-wider">
                    Smoothness Control
                  </h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-textDim hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              <div className="text-[11px] text-textDim">Real-time audio/video sync & smoothness</div>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Live Metrics */}
              <div className={`rounded-xl p-4 border transition-all ${getHealthBg(metrics.smoothnessScore)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-black uppercase tracking-wider ${getHealthColor(metrics.smoothnessScore)}`}>
                    {metrics.smoothnessScore > 0.9
                      ? '✓ Perfect Sync'
                      : metrics.smoothnessScore > 0.7
                      ? '◐ Good'
                      : '✗ Issue Detected'}
                  </span>
                  <span className={`text-lg font-bold ${getHealthColor(metrics.smoothnessScore)}`}>
                    {(metrics.smoothnessScore * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-textDim">Drift:</span>
                    <span className={Math.abs(metrics.audioVideoDriftMs) > 50 ? 'text-red-400' : 'text-green-400'}>
                      {metrics.audioVideoDriftMs.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textDim">Jitter:</span>
                    <span>{metrics.jitterMs.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textDim">Buffer Health:</span>
                    <span className="text-blue-400">{(metrics.bufferHealth * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Monitoring Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-sm font-bold text-textDim">Live Monitoring</span>
                <button
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                    isMonitoring
                      ? 'bg-green-500/20 border border-green-500 text-green-400'
                      : 'bg-white/5 border border-white/10 text-textDim'
                  }`}
                >
                  {isMonitoring ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Configuration Section */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="text-[11px] font-black text-textDim uppercase tracking-widest flex items-center gap-2">
                  <Settings size={12} /> Settings
                </div>

                {/* Frame Interpolation */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-[11px]">
                    <span className="text-textDim">Frame Interpolation</span>
                    <input
                      type="checkbox"
                      checked={config.enableFrameInterpolation}
                      onChange={(e) => handleConfigChange('enableFrameInterpolation', e.target.checked)}
                      className="w-4 h-4 accent-accent cursor-pointer"
                    />
                  </label>
                  {config.enableFrameInterpolation && (
                    <div className="space-y-1 pl-3 border-l-2 border-accent/30">
                      <label className="flex justify-between text-[10px] text-textDim">
                        <span>Quality:</span>
                        <span className="text-accent">{config.interpolationQuality}</span>
                      </label>
                      <select
                        value={config.interpolationQuality}
                        onChange={(e) =>
                          handleConfigChange(
                            'interpolationQuality',
                            e.target.value as 'Low' | 'Medium' | 'High'
                          )
                        }
                        className="w-full bg-black/30 border border-white/10 rounded text-[9px] p-1 text-white"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Audio Smoothing */}
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-textDim">Audio Smoothing</span>
                  <input
                    type="checkbox"
                    checked={config.audioSmoothingEnabled}
                    onChange={(e) => handleConfigChange('audioSmoothingEnabled', e.target.checked)}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </label>

                {/* VSync */}
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-textDim">VSync</span>
                  <input
                    type="checkbox"
                    checked={config.enableVSync}
                    onChange={(e) => handleConfigChange('enableVSync', e.target.checked)}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </label>

                {/* Target FPS */}
                <div className="space-y-1">
                  <label className="flex justify-between text-[10px] text-textDim">
                    <span>Target FPS:</span>
                    <span className="text-accent font-bold">{config.targetFramerate}</span>
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="120"
                    value={config.targetFramerate}
                    onChange={(e) => handleConfigChange('targetFramerate', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full accent-accent"
                  />
                </div>

                {/* Max Drift Threshold */}
                <div className="space-y-1">
                  <label className="flex justify-between text-[10px] text-textDim">
                    <span>Max Drift (ms):</span>
                    <span className="text-accent font-bold">{config.maxSyncDriftMs}</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={config.maxSyncDriftMs}
                    onChange={(e) => handleConfigChange('maxSyncDriftMs', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full accent-accent"
                  />
                </div>

                {/* Hardware Acceleration */}
                <label className="flex items-center justify-between text-[11px]">
                  <span className="text-textDim">Hardware Acceleration</span>
                  <input
                    type="checkbox"
                    checked={config.useHardwareAcceleration}
                    onChange={(e) => handleConfigChange('useHardwareAcceleration', e.target.checked)}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </label>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-[10px] text-blue-300 space-y-1">
                <div className="flex items-start gap-2">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Tips for Best Performance:</p>
                    <ul className="list-disc list-inside space-y-0.5 opacity-90">
                      <li>Enable frame interpolation for smoother playback</li>
                      <li>Use 90 FPS target for elite smoothness</li>
                      <li>Enable hardware acceleration if available</li>
                      <li>Keep drift threshold between 30-80ms</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
