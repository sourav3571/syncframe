import { useTimelineStore } from '../store/useTimelineStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Monitor, Hash, Palette, Type, SlidersHorizontal, Trash2, Volume2, FastForward, Crop, Scissors, Link2, Smile } from 'lucide-react';
import { useState } from 'react';
import { KeyframeTrimTool } from './KeyframeTrimTool';
import { MultiVideoSync } from './MultiVideoSync';
import { MemeTemplate } from './MemeTemplate';

export const PropertiesPanel = () => {
    const { selectedClipId, clips, updateClip, removeClip } = useTimelineStore();
    const selectedClip = clips.find((c) => c.id === selectedClipId);
    const [showTrimTool, setShowTrimTool] = useState(false);
    const [showSyncTool, setShowSyncTool] = useState(false);
    const [showMemeTemplate, setShowMemeTemplate] = useState(false);

    const defaultFilters = {
        blur: 0,
        brightness: 100,
        contrast: 100,
        sepia: false,
        grayscale: false,
        custom: 'none'
    };

    const defaultAdjustments = {
        saturation: 100,
        exposure: 0,
        temp: 0,
        tint: 0,
        highlights: 0,
        shadows: 0,
        vignette: 0
    };

    const defaultCrop = { top: 0, right: 0, bottom: 0, left: 0 };

    const currentProps = selectedClip?.properties || {
        opacity: 100,
        scale: 100,
        rotation: 0,
        filters: defaultFilters,
        adjustments: defaultAdjustments,
        crop: defaultCrop
    };

    const currentFilters = currentProps.filters || defaultFilters;
    const currentAdjustments = currentProps.adjustments || defaultAdjustments;
    const currentCrop = currentProps.crop || defaultCrop;

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
                    ...defaultFilters,
                    ...selectedClip.properties.filters,
                    [key]: value
                }
            }
        });
    };

    const handleAdjChange = (key: string, value: any) => {
        if (!selectedClip) return;
        updateClip(selectedClip.id, {
            properties: {
                ...selectedClip.properties,
                adjustments: {
                    ...defaultAdjustments,
                    ...(selectedClip.properties.adjustments as any),
                    [key]: value
                }
            }
        });
    };

    const handleCropChange = (key: 'top' | 'right' | 'bottom' | 'left', value: number) => {
        if (!selectedClip) return;
        updateClip(selectedClip.id, {
            properties: {
                ...selectedClip.properties,
                crop: {
                    ...defaultCrop,
                    ...(selectedClip.properties.crop || {}),
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
                    <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-textDim uppercase">
                        {selectedClip.format}
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
                            {/* Text Section */}
                            {selectedClip.format === 'text' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                        <Type size={14} className="text-textMain" /> Typography
                                    </div>
                                    <textarea
                                        value={selectedClip.textContent}
                                        onChange={(e) => updateClip(selectedClip.id, { textContent: e.target.value })}
                                        className="w-full bg-surface border border-border rounded-xl p-3 text-xs focus:border-accent outline-none min-h-[80px]"
                                        placeholder="Enter text..."
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-textDim uppercase font-bold">Font</span>
                                            <div className="text-[10px] font-bold p-2 bg-white/5 border border-white/5 rounded-lg">{selectedClip.properties.textStyle?.font}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-textDim uppercase font-bold">Animation</span>
                                            <div className="text-[10px] font-bold p-2 bg-white/5 border border-white/5 rounded-lg">{selectedClip.properties.textStyle?.animation}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Transform Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                    <Monitor size={14} className="text-textMain" /> Transform
                                </div>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Opacity', key: 'opacity', min: 0, max: 100, unit: '%' },
                                        { label: 'Scale', key: 'scale', min: 5, max: 500, unit: '%' },
                                        { label: 'Rotation', key: 'rotation', min: -180, max: 180, unit: '°' },
                                    ].map((prop) => {
                                        const value = (currentProps as any)[prop.key] ?? (prop.key === 'opacity' ? 100 : prop.key === 'scale' ? 100 : 0);
                                        return (
                                            <div key={prop.key} className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-textDim uppercase tracking-tighter">{prop.label}</span>
                                                    <span className="text-accent mono">{value}{prop.unit}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={prop.min}
                                                    max={prop.max}
                                                    value={value}
                                                    onChange={(e) => handlePropChange(prop.key, parseInt(e.target.value))}
                                                    className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Audio Section */}
                            {(selectedClip.format === 'video' || selectedClip.format === 'audio') && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                        <Volume2 size={14} className="text-textMain" /> Audio
                                    </div>
                                    <div className="space-y-5">
                                        {[
                                            { label: 'Volume', key: 'volume', min: 0, max: 200, unit: '%' },
                                            { label: 'Fade In', key: 'fadeIn', min: 0, max: 10, unit: 's' },
                                            { label: 'Fade Out', key: 'fadeOut', min: 0, max: 10, unit: 's' },
                                        ].map((prop) => {
                                            const value = (currentProps as any)[prop.key] !== undefined ? (currentProps as any)[prop.key] : (prop.key === 'volume' ? 100 : 0);
                                            return (
                                                <div key={prop.key} className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-textDim uppercase tracking-tighter">{prop.label}</span>
                                                        <span className="text-accent mono">{value}{prop.unit}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={prop.min}
                                                        max={prop.max}
                                                        value={value}
                                                        onChange={(e) => handlePropChange(prop.key, parseInt(e.target.value))}
                                                        className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Speed & Crop Section */}
                            {(selectedClip.format === 'video' || selectedClip.format === 'image') && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                        <FastForward size={14} className="text-textMain" /> Details
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span className="text-textDim uppercase tracking-tighter">Speed</span>
                                            <span className="text-accent mono">{((currentProps as any).speed || 1).toFixed(1)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="5"
                                            step="0.1"
                                            value={(currentProps as any).speed || 1}
                                            onChange={(e) => handlePropChange('speed', parseFloat(e.target.value))}
                                            className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                            disabled={selectedClip.format === 'image'}
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                            <Crop size={14} className="text-textMain" /> Crop (%)
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['top', 'bottom', 'left', 'right'].map((side) => (
                                                <div key={side} className="space-y-1 block">
                                                    <div className="flex justify-between text-[9px] font-bold text-textDim uppercase">
                                                        <span>{side}</span>
                                                        <span className="text-white">{(currentCrop as any)[side] || 0}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={(currentCrop as any)[side] || 0}
                                                        onChange={(e) => handleCropChange(side as any, parseInt(e.target.value))}
                                                        className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Advanced Adjustments */}
                            {selectedClip.format === 'adjustment' && selectedClip.properties.adjustments && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                        <SlidersHorizontal size={14} className="text-textMain" /> Fine Tuning
                                    </div>
                                    <div className="space-y-5">
                                        {[
                                            { label: 'Saturation', key: 'saturation', min: 0, max: 200 },
                                            { label: 'Exposure', key: 'exposure', min: -100, max: 100 },
                                            { label: 'Tint', key: 'tint', min: -180, max: 180 },
                                        ].map((prop) => (
                                            <div key={prop.key} className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-textDim uppercase tracking-tighter">{prop.label}</span>
                                                    <span className="text-textMain mono">{(currentAdjustments as any)[prop.key]}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={prop.min}
                                                    max={prop.max}
                                                    value={(currentAdjustments as any)[prop.key]}
                                                    onChange={(e) => handleAdjChange(prop.key, parseInt(e.target.value))}
                                                    className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Base FX Section */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-textDim uppercase tracking-widest">
                                    <Palette size={14} className="text-textMain" /> Filters
                                </div>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Brightness', key: 'brightness', min: 0 },
                                        { label: 'Contrast', key: 'contrast', min: 0 },
                                        { label: 'Blur', key: 'blur', min: 0, max: 50 },
                                    ].map((prop) => (
                                        <div key={prop.key} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-textDim uppercase tracking-tighter">{prop.label}</span>
                                                <span className="text-textMain mono">{(currentFilters as any)[prop.key]}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={prop.min}
                                                max={prop.max}
                                                value={(currentFilters as any)[prop.key]}
                                                onChange={(e) => handleFilterChange(prop.key, parseInt(e.target.value))}
                                                className="w-full accent-accent h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => toggleFilter('sepia')}
                                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${currentFilters.sepia
                                            ? 'bg-surfaceHighlight border-accent/50 text-accent'
                                            : 'bg-white/5 border-white/5 text-textDim'
                                            }`}
                                    >
                                        Sepia
                                    </button>
                                    <button
                                        onClick={() => toggleFilter('grayscale')}
                                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${currentFilters.grayscale
                                            ? 'bg-surfaceHighlight border-accent/50 text-accent'
                                            : 'bg-white/5 border-white/5 text-textDim'
                                            }`}
                                    >
                                        Mono
                                    </button>
                                </div>
                            </div>

                            {/* Advanced Tools Section */}
                            {selectedClip && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-3 font-black text-[10px] text-textDim uppercase tracking-widest">
                                        <Scissors size={14} className="text-accent" /> Advanced Tools
                                    </div>
                                    <button
                                        onClick={() => setShowTrimTool(true)}
                                        className="w-full py-3 rounded-2xl bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Scissors size={14} /> Smooth Trim
                                    </button>
                                    <button
                                        onClick={() => setShowSyncTool(true)}
                                        className="w-full py-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Link2 size={14} /> Multi-Video Sync
                                    </button>
                                    <button
                                        onClick={() => setShowMemeTemplate(true)}
                                        className="w-full py-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Smile size={14} /> Meme Template
                                    </button>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="pt-8">
                                <button
                                    onClick={() => removeClip(selectedClip.id)}
                                    className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14} /> Remove Node
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showTrimTool && selectedClip && (
                    <KeyframeTrimTool
                        clipId={selectedClip.id}
                        duration={selectedClip.duration}
                        onClose={() => setShowTrimTool(false)}
                    />
                )}
                {showSyncTool && (
                    <MultiVideoSync
                        selectedClipIds={selectedClipId ? [selectedClipId] : []}
                        onClose={() => setShowSyncTool(false)}
                    />
                )}
                {showMemeTemplate && (
                    <MemeTemplate
                        selectedClipIds={selectedClipId ? [selectedClipId] : []}
                        onClose={() => setShowMemeTemplate(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
