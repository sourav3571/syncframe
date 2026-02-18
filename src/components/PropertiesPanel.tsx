import { useTimelineStore } from '../store/useTimelineStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Sun, Monitor, Hash, Wind, Palette } from 'lucide-react';

export const PropertiesPanel = () => {
    const { selectedClipId, clips, updateClip } = useTimelineStore();
    const selectedClip = clips.find((c) => c.id === selectedClipId);

    const handlePropChange = (key: string, value: any) => {
        if (!selectedClip) return;
        updateClip(selectedClip.id, {
            properties: {
                ...selectedClip.properties,
                [key]: value
            }
        });
    };

    const handleFilterChange = (key: string, value: any) => {
        if (!selectedClip) return;
        updateClip(selectedClip.id, {
            properties: {
                ...selectedClip.properties,
                filters: {
                    ...selectedClip.properties.filters,
                    [key]: value
                }
            }
        });
    };

    const toggleFilter = (key: 'sepia' | 'grayscale') => {
        if (!selectedClip) return;
        handleFilterChange(key, !selectedClip.properties.filters[key]);
    };

    return (
        <div className="bg-background/90 backdrop-blur-3xl border-l border-border flex flex-col z-20 overflow-hidden h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface">
                <div className="flex items-center gap-3">
                    <Hash size={16} className="text-accent" />
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Inspector</h2>
                </div>
                {selectedClip && (
                    <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-textDim">
                        CLIP_ID: {selectedClip.id}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {!selectedClip ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <Sliders size={32} className="text-zinc-700" />
                            </div>
                            <p className="text-xs font-bold text-textDim uppercase tracking-widest leading-relaxed">
                                Selection Empty<br /><span className="text-[10px] opacity-50 font-medium lowercase italic">select a node to edit</span>
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-6 space-y-8"
                        >
                            {/* Transform Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                    <Monitor size={14} className="text-textMain" /> Transform Engine
                                </div>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Opacity', key: 'opacity', min: 0, max: 100, unit: '%' },
                                        { label: 'Scale', key: 'scale', min: 5, max: 200, unit: '%' },
                                        { label: 'Rotation', key: 'rotation', min: -180, max: 180, unit: '°' },
                                    ].map((prop) => (
                                        <div key={prop.key} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-textDim uppercase tracking-tighter">{prop.label}</span>
                                                <span className="text-accent mono">{(selectedClip.properties as any)[prop.key]}{prop.unit}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={prop.min}
                                                max={prop.max}
                                                value={(selectedClip.properties as any)[prop.key]}
                                                onChange={(e) => handlePropChange(prop.key, parseInt(e.target.value))}
                                                className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer hover:bg-white/10 transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* FX Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                    <Palette size={14} className="text-textMain" /> Filter Suite
                                </div>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Exposure', key: 'brightness', icon: Sun },
                                        { label: 'Dynamics', key: 'contrast', icon: Wind },
                                        { label: 'Focus', key: 'blur', max: 50 },
                                    ].map((prop) => (
                                        <div key={prop.key} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-textDim uppercase tracking-tighter">{prop.label}</span>
                                                <span className="text-textMain mono">{(selectedClip.properties.filters as any)[prop.key]}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={prop.max || 200}
                                                value={(selectedClip.properties.filters as any)[prop.key]}
                                                onChange={(e) => handleFilterChange(prop.key, parseInt(e.target.value))}
                                                className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Toggles */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => toggleFilter('sepia')}
                                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedClip.properties.filters.sepia
                                            ? 'bg-surfaceHighlight border-accent/50 text-accent shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                            : 'bg-white/5 border-white/5 text-textDim hover:border-white/20'
                                            }`}
                                    >
                                        Sepia
                                    </button>
                                    <button
                                        onClick={() => toggleFilter('grayscale')}
                                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedClip.properties.filters.grayscale
                                            ? 'bg-surfaceHighlight border-accent/50 text-accent shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                            : 'bg-white/5 border-white/5 text-textDim hover:border-white/20'
                                            }`}
                                    >
                                        Mono
                                    </button>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-8">
                                <button className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all">
                                    Remove Node
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
