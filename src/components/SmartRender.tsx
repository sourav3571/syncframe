import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Settings, CheckCircle2, X, TrendingUp, Cpu } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SmartRenderProps {
    onClose: () => void;
}

interface ExportSettings {
    resolution: string;
    bitrate: string;
    codec: string;
    preset: string;
    audioQuality: string;
    format: string;
}

export const SmartRender = ({ onClose }: SmartRenderProps) => {
    const [step, setStep] = useState<'analyze' | 'settings' | 'rendering'>('analyze');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [quality, setQuality] = useState<any>(null);
    const [settings, setSettings] = useState<ExportSettings>({
        resolution: '1080p',
        bitrate: '8m',
        codec: 'h264',
        preset: 'slow',
        audioQuality: '192k',
        format: 'mp4',
    });
    const [renderProgress, setRenderProgress] = useState(0);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await invoke<any>('analyze_video_quality', {
                video_path: 'current_project',
            });
            setQuality(result);
            setStep('settings');
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRender = async () => {
        setStep('rendering');
        // Simulate rendering progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                clearInterval(interval);
                setRenderProgress(100);
                setTimeout(onClose, 1000);
            } else {
                setRenderProgress(progress);
            }
        }, 500);
    };

    const recommendSettings = () => {
        if (quality?.quality_score < 50) {
            setSettings({
                resolution: '720p',
                bitrate: '4m',
                codec: 'h264',
                preset: 'fast',
                audioQuality: '128k',
                format: 'mp4',
            });
        } else if (quality?.quality_score < 75) {
            setSettings({
                resolution: '1080p',
                bitrate: '6m',
                codec: 'h264',
                preset: 'medium',
                audioQuality: '160k',
                format: 'mp4',
            });
        } else {
            setSettings({
                resolution: '2160p',
                bitrate: '12m',
                codec: 'hevc',
                preset: 'slow',
                audioQuality: '256k',
                format: 'mp4',
            });
        }
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
                    className="bg-surface border border-border rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-accent/20 text-accent">
                                <Sparkles size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white">Smart Export</h2>
                                <p className="text-xs text-textDim mt-1">Intelligent rendering with optimized settings</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X size={24} className="text-textDim" />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex gap-4 mb-8">
                        {['analyze', 'settings', 'rendering'].map((s) => (
                            <motion.div
                                key={s}
                                className="flex-1 h-2 rounded-full overflow-hidden bg-white/5"
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: s === 'analyze' && step === 'analyze' ? '50%' :
                                            ((['analyze', 'settings'].includes(s) && ['settings', 'rendering'].includes(step)) || (s === 'rendering' && step === 'rendering')) ? '100%' : '0%'
                                    }}
                                    className="h-full bg-accent"
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Analyze Step */}
                    {step === 'analyze' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 mb-8"
                        >
                            <div className="bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 rounded-3xl p-8 text-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    className="inline-block mb-4"
                                >
                                    <Zap size={40} className="text-accent" />
                                </motion.div>
                                <h3 className="text-lg font-black text-white mb-2">Analyzing Project</h3>
                                <p className="text-sm text-textDim">
                                    {isAnalyzing ? 'Scanning resolution, frame rate, and codec information...' : 'Click the button below to start analysis'}
                                </p>
                            </div>

                            <motion.button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 rounded-2xl bg-accent text-black font-black flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                                            <Cpu size={20} />
                                        </motion.div>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp size={20} />
                                        Analyze Project
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Settings Step */}
                    {step === 'settings' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 mb-8"
                        >
                            {/* Quality Analysis */}
                            {quality && (
                                <div className="bg-black/30 border border-white/5 rounded-2xl p-6 space-y-4">
                                    <h3 className="font-black text-white flex items-center gap-2">
                                        <TrendingUp size={20} className="text-accent" />
                                        Project Analysis
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-textDim uppercase font-black mb-1">Resolution</p>
                                            <p className="text-lg font-mono text-accent">{quality.resolution}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-textDim uppercase font-black mb-1">Frame Rate</p>
                                            <p className="text-lg font-mono text-accent">{quality.framerate.toFixed(1)} fps</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-xs text-textDim uppercase font-black mb-2">Quality Score</p>
                                        <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${quality.quality_score}%` }}
                                                className="h-full bg-gradient-to-r from-accent to-blue-500"
                                            />
                                        </div>
                                        <p className="text-xs text-accent font-mono mt-1">{quality.quality_score.toFixed(0)}%</p>
                                    </div>
                                </div>
                            )}

                            {/* Export Settings */}
                            <div className="space-y-4">
                                <h3 className="font-black text-white flex items-center gap-2">
                                    <Settings size={20} className="text-accent" />
                                    Export Settings
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-textDim uppercase mb-2 block">Format</label>
                                        <select
                                            value={settings.format}
                                            onChange={(e) => setSettings({ ...settings, format: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-accent"
                                        >
                                            <option>mp4</option>
                                            <option>webm</option>
                                            <option>mov</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-textDim uppercase mb-2 block">Resolution</label>
                                        <select
                                            value={settings.resolution}
                                            onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-accent"
                                        >
                                            <option>480p</option>
                                            <option>720p</option>
                                            <option>1080p</option>
                                            <option>2160p</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-textDim uppercase mb-2 block">Bitrate</label>
                                        <select
                                            value={settings.bitrate}
                                            onChange={(e) => setSettings({ ...settings, bitrate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-accent"
                                        >
                                            <option>2m</option>
                                            <option>4m</option>
                                            <option>6m</option>
                                            <option>8m</option>
                                            <option>12m</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-textDim uppercase mb-2 block">Preset</label>
                                        <select
                                            value={settings.preset}
                                            onChange={(e) => setSettings({ ...settings, preset: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-accent"
                                        >
                                            <option>ultrafast</option>
                                            <option>fast</option>
                                            <option>medium</option>
                                            <option>slow</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <motion.button
                                onClick={recommendSettings}
                                whileHover={{ scale: 1.02 }}
                                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all"
                            >
                                <Sparkles size={16} className="inline mr-2" />
                                Use AI Recommendations
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Rendering Step */}
                    {step === 'rendering' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-8 mb-8"
                        >
                            <div className="text-center">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="inline-block mb-4"
                                >
                                    <CheckCircle2 size={48} className="text-accent" />
                                </motion.div>
                                <h3 className="text-xl font-black text-white mb-2">Rendering in Progress</h3>
                                <p className="text-sm text-textDim">{settings.resolution} • {settings.bitrate} • {settings.codec.toUpperCase()}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-white">Encoding</span>
                                    <span className="text-sm font-mono text-accent">{renderProgress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-4 rounded-full overflow-hidden bg-black/50 border border-white/10">
                                    <motion.div
                                        animate={{ width: `${renderProgress}%` }}
                                        className="h-full bg-gradient-to-r from-accent to-blue-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            disabled={step === 'rendering'}
                            className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 disabled:opacity-50 transition-all"
                        >
                            {step === 'rendering' ? 'Rendering...' : 'Cancel'}
                        </button>
                        {step === 'analyze' && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isAnalyzing}
                                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Next'}
                            </motion.button>
                        )}
                        {step === 'settings' && (
                            <motion.button
                                onClick={handleRender}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-black font-black"
                            >
                                Start Render
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
