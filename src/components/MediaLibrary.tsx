import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Sparkles, Type, Music, Search, HardDrive, Smile, Cast, Filter, SlidersHorizontal, Film } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTimelineStore } from '../store/useTimelineStore';
import assetsData from '../assets/assets.json';

export const MediaLibrary = () => {
    const [activeTab, setActiveTab] = useState('media');
    const [searchQuery, setSearchQuery] = useState('');
    const { addClip, currentTime, setCurrentTime, setSelectedClipId, mediaLibrary, addMediaToLibrary } = useTimelineStore();

    const tabs = [
        { id: 'media', icon: Layers, label: 'Media' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'stickers', icon: Smile, label: 'Stickers' },
        { id: 'fx', icon: Sparkles, label: 'FX' },
        { id: 'transitions', icon: Cast, label: 'Trans' },
        { id: 'filters', icon: Filter, label: 'Filters' },
        { id: 'adjust', icon: SlidersHorizontal, label: 'Adjust' },
        { id: 'audio', icon: Music, label: 'Audio' },
    ];

    const filteredAssets = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return {
            textStyles: assetsData.textStyles.filter(a => a.name.toLowerCase().includes(query)),
            stickers: assetsData.stickers.filter(a => a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query)),
            transitions: assetsData.transitions.filter(a => a.name.toLowerCase().includes(query)),
            filters: assetsData.filters.filter(a => a.name.toLowerCase().includes(query)),
            adjustments: assetsData.adjustments.filter(a => a.name.toLowerCase().includes(query)),
            audio: assetsData.audio.filter(a => a.name.toLowerCase().includes(query) || a.category.toLowerCase().includes(query)),
        };
    }, [searchQuery]);

    const handleImportMedia = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'Media',
                    extensions: ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'aac', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
                }]
            });

            if (selected) {
                const paths = Array.isArray(selected) ? selected : [selected];
                const existingClips = useTimelineStore.getState().clips;

                for (const path of paths) {
                    try {
                        const metadata = await invoke<{ duration: number, format: string }>('get_media_metadata', { path });
                        const name = path.split(/[\\/]/).pop() || 'Untitled';
                        const newId = Math.random().toString(36).substr(2, 9);
                        const dur = metadata.duration || 10;
                        const startPos = Math.max(0, currentTime - dur / 2);
                        const format = metadata.format as 'video' | 'audio' | 'image';

                        // Find best track (1-3 for visual, 4-5 for audio)
                        let trackId = format === 'audio' ? 4 : 1;
                        if (format === 'audio') {
                            const isTrack4Busy = existingClips.some(c => c.trackId === 4 && c.start < startPos + dur && c.start + c.duration > startPos);
                            if (isTrack4Busy) trackId = 5;
                        } else {
                            const isTrack1Busy = existingClips.some(c => c.trackId === 1 && c.start < startPos + dur && c.start + c.duration > startPos);
                            const isTrack2Busy = existingClips.some(c => c.trackId === 2 && c.start < startPos + dur && c.start + c.duration > startPos);
                            if (isTrack1Busy && !isTrack2Busy) trackId = 2;
                            else if (isTrack1Busy && isTrack2Busy) trackId = 3;
                        }

                        // Add to library for persistence
                        addMediaToLibrary({
                            id: newId,
                            name,
                            source: path,
                            format,
                            duration: dur,
                            lastUsed: Date.now()
                        });

                        // Also add to timeline
                        addClip({
                            id: newId,
                            name,
                            start: startPos,
                            duration: dur,
                            trackId,
                            source: path,
                            format,
                            properties: {
                                opacity: 100,
                                scale: 100,
                                rotation: 0,
                                filters: { blur: 0, brightness: 100, contrast: 100, sepia: false, grayscale: false }
                            }
                        });
                        setSelectedClipId(newId);
                        setCurrentTime(startPos + dur / 2);
                    } catch (e) { console.error(e); }
                }
            }
        } catch (err) { console.error(err); }
    };

    const handleAddFromLibrary = (asset: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        const startPos = Math.max(0, currentTime - asset.duration / 2);
        const existingClips = useTimelineStore.getState().clips;

        let trackId = asset.format === 'audio' ? 4 : 1;
        if (asset.format === 'audio') {
            const isTrack4Busy = existingClips.some(c => c.trackId === 4 && c.start < startPos + asset.duration && c.start + c.duration > startPos);
            if (isTrack4Busy) trackId = 5;
        } else {
            const isTrack1Busy = existingClips.some(c => c.trackId === 1 && c.start < startPos + asset.duration && c.start + c.duration > startPos);
            const isTrack2Busy = existingClips.some(c => c.trackId === 2 && c.start < startPos + asset.duration && c.start + c.duration > startPos);
            if (isTrack1Busy && !isTrack2Busy) trackId = 2;
            else if (isTrack1Busy && isTrack2Busy) trackId = 3;
        }

        addClip({
            id,
            name: asset.name,
            start: startPos,
            duration: asset.duration,
            trackId,
            source: asset.source,
            format: asset.format,
            properties: {
                opacity: 100,
                scale: 100,
                rotation: 0,
                filters: { blur: 0, brightness: 100, contrast: 100, sepia: false, grayscale: false }
            }
        });
        setSelectedClipId(id);
    };

    const handleAddSpecialAsset = (type: string, asset: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        const dur = 5;
        const start = Math.max(0, currentTime - dur / 2);

        let clipData: any = {
            id,
            name: asset.name,
            start,
            duration: dur,
            trackId: 1,
            properties: {
                opacity: 100,
                scale: 100,
                rotation: 0,
                filters: { blur: 0, brightness: 100, contrast: 100, sepia: false, grayscale: false }
            }
        };

        if (type === 'text') {
            clipData.format = 'text';
            clipData.textContent = 'Enter text here';
            clipData.assetId = asset.id;
            clipData.properties.textStyle = {
                font: asset.font,
                color: asset.color,
                shadow: asset.shadow,
                animation: asset.animation
            };
            clipData.trackId = 2; // Place text on Video 2 by default
        } else if (type === 'sticker') {
            clipData.format = 'sticker';
            clipData.stickerId = asset.icon;
            clipData.assetId = asset.id;
            clipData.trackId = 3; // Place stickers on Video 3 by default
        } else if (type === 'filter') {
            clipData.format = 'filter';
            clipData.assetId = asset.id;
            clipData.properties.filters.custom = asset.filter;
            clipData.trackId = 2; // Effects on high tracks to affect layers below
        } else if (type === 'adjustment') {
            clipData.format = 'adjustment';
            clipData.assetId = asset.id;
            clipData.properties.adjustments = {
                saturation: asset.values.saturation || 100,
                exposure: asset.values.exposure || 0,
                temp: asset.values.temp || 0,
                tint: asset.values.tint || 0,
                highlights: asset.values.highlights || 0,
                shadows: asset.values.shadows || 0,
                vignette: asset.values.vignette || 0
            };
            clipData.properties.filters.brightness = asset.values.brightness || 100;
            clipData.properties.filters.contrast = asset.values.contrast || 100;
            clipData.trackId = 3; // Top level adjustments
        } else if (type === 'audio') {
            clipData.format = 'audio';
            clipData.assetId = asset.id;
            clipData.source = asset.source || "";
            clipData.duration = asset.duration || 5;

            // Find available audio track
            const existingClips = useTimelineStore.getState().clips;
            const isTrack4Busy = existingClips.some(c => c.trackId === 4 && c.start < start + clipData.duration && c.start + c.duration > start);
            clipData.trackId = isTrack4Busy ? 5 : 4;
        } else if (type === 'transition') {
            clipData.format = 'filter'; // Transitions currently use filter logic
            clipData.assetId = asset.id;
            clipData.name = `Transition: ${asset.name}`;
            clipData.duration = 1.5; // Shared transition duration
            clipData.properties.filters.custom = asset.filter;
            clipData.trackId = 2;
        }

        addClip(clipData);
        setSelectedClipId(id);
        setCurrentTime(start + clipData.duration / 2);
    };

    return (
        <div className="flex flex-col h-full bg-background/80 backdrop-blur-3xl border-r border-border z-20">
            <div className="grid grid-cols-4 p-2 gap-2 bg-surface/50 backdrop-blur-md m-4 rounded-[2rem] border border-white/5 shadow-2xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group flex flex-col items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all duration-300 relative overflow-hidden ${activeTab === tab.id
                            ? 'bg-accent text-background shadow-[0_8px_20px_-4px_rgba(var(--accent-rgb),0.5)] scale-[1.05] z-10'
                            : 'text-textDim hover:text-textMain hover:bg-white/5 hover:scale-[1.02]'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabGlow"
                                className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-none"
                            />
                        )}
                        <tab.icon size={20} className={`transition-all duration-300 ${activeTab === tab.id ? 'scale-110 rotate-3' : 'group-hover:scale-110'}`} />
                        <span className={`text-[9px] uppercase font-black tracking-[0.1em] transition-all ${activeTab === tab.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-4">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textDim" size={14} />
                    <input
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl py-2 pl-9 pr-4 text-xs focus:border-accent outline-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    <AnimatePresence mode="wait">
                        {activeTab === 'media' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                key="media"
                                className="space-y-6"
                            >
                                <button
                                    onClick={handleImportMedia}
                                    className="w-full py-10 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-accent/50 hover:bg-accent/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <HardDrive size={24} className="text-textDim group-hover:text-accent" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-textMain">Import Media</div>
                                        <div className="text-[9px] text-textDim mt-1 lowercase italic">drag and drop or click to browse</div>
                                    </div>
                                </button>

                                {mediaLibrary.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textDim">Session Assets</h3>
                                            <div className="text-[9px] text-accent font-mono">{mediaLibrary.length} ITEMS</div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {mediaLibrary.map((asset) => (
                                                <button
                                                    key={asset.id}
                                                    onClick={() => handleAddFromLibrary(asset)}
                                                    className="w-full p-3 bg-surface border border-border rounded-2xl flex items-center gap-4 hover:border-accent transition-all text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                        {asset.format === 'video' ? <Film size={16} className="text-blue-400" /> :
                                                            asset.format === 'audio' ? <Music size={16} className="text-purple-400" /> :
                                                                <Layers size={16} className="text-green-400" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-bold text-textMain truncate">{asset.name}</div>
                                                        <div className="text-[9px] text-textDim font-mono uppercase">{asset.duration.toFixed(1)}s • {asset.format}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'text' && (
                            <div className="grid grid-cols-1 gap-2">
                                {filteredAssets.textStyles.map(t => (
                                    <button key={t.id} onClick={() => handleAddSpecialAsset('text', t)} className="w-full p-3 bg-surface border border-border rounded-xl text-left hover:border-accent transition-all group">
                                        <div className="text-xs font-bold" style={{ color: t.color.includes('gradient') ? 'white' : t.color, fontFamily: t.font }}>{t.name}</div>
                                        <div className="text-[9px] text-textDim font-mono">Style: {t.animation}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'audio' && (
                            <div className="grid grid-cols-1 gap-2">
                                {filteredAssets.audio.map(track => (
                                    <button
                                        key={track.id}
                                        onClick={() => handleAddSpecialAsset('audio', track)}
                                        className="w-full p-3 bg-surface border border-border rounded-xl flex items-center justify-between hover:border-accent transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                <Music size={14} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-[11px] font-bold text-textMain">{track.name}</div>
                                                <div className="text-[8px] text-textDim uppercase tracking-widest">{track.category}</div>
                                            </div>
                                        </div>
                                        <div className="text-[9px] font-mono text-textDim">{track.duration}s</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === 'stickers' && (
                            <div className="grid grid-cols-3 gap-2">
                                {filteredAssets.stickers.map(s => (
                                    <button key={s.id} onClick={() => handleAddSpecialAsset('sticker', s)} className="aspect-square bg-surface border border-border rounded-xl flex flex-col items-center justify-center hover:border-accent transition-all">
                                        <span className="text-2xl">{s.icon}</span>
                                        <span className="text-[8px] text-textDim mt-1 uppercase truncate w-full text-center px-1">{s.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'filters' && (
                            <div className="grid grid-cols-2 gap-2">
                                {filteredAssets.filters.map(f => (
                                    <button key={f.id} onClick={() => handleAddSpecialAsset('filter', f)} className="aspect-video bg-surface border border-border rounded-xl flex flex-col items-center justify-center hover:border-accent transition-all overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent" style={{ filter: f.filter }} />
                                        <span className="text-[9px] font-bold z-10">{f.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'adjust' && (
                            <div className="grid grid-cols-1 gap-2">
                                {filteredAssets.adjustments.map(a => (
                                    <button key={a.id} onClick={() => handleAddSpecialAsset('adjustment', a)} className="w-full p-2.5 bg-surface border border-border rounded-xl flex items-center justify-between hover:border-accent transition-all">
                                        <span className="text-[10px] font-bold">{a.name}</span>
                                        <SlidersHorizontal size={12} className="text-textDim" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'fx' && (
                            <div className="text-center py-10 text-textDim text-[10px] uppercase font-black">Future FX Coming Soon</div>
                        )}

                        {activeTab === 'transitions' && (
                            <div className="grid grid-cols-2 gap-2">
                                {assetsData.transitions.map(tr => (
                                    <button
                                        key={tr.id}
                                        onClick={() => handleAddSpecialAsset('transition', tr)}
                                        className="aspect-video bg-surface border border-border rounded-xl flex items-center justify-center text-[9px] font-bold hover:border-accent transition-all"
                                    >
                                        {tr.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
