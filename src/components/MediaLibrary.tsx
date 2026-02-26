import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Sparkles, Type, Music, Search, Cloud, HardDrive, Video } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTimelineStore } from '../store/useTimelineStore';

export const MediaLibrary = () => {
    const [activeTab, setActiveTab] = useState('media');
    const { addClip, currentTime, setCurrentTime, setSelectedClipId } = useTimelineStore();

    const handleImportMedia = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'Media',
                    extensions: ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'aac', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
                }]
            });

            console.log("Dialog selection result:", selected);

            if (selected) {
                const paths = Array.isArray(selected) ? selected : [selected];

                for (const path of paths) {
                    console.log("Importing path:", path);
                    try {
                        const metadata = await invoke<{ duration: number, format: string }>('get_media_metadata', { path });
                        console.log("Metadata received:", metadata);

                        const name = path.split(/[\\/]/).pop() || 'Untitled';
                        const newId = Math.random().toString(36).substr(2, 9);
                        const dur = metadata.duration || 10;
                        const startPos = Math.max(0, currentTime - dur / 2);

                        const isAudio = metadata.format === 'audio';

                        addClip({
                            id: newId,
                            name,
                            start: startPos,
                            duration: dur,
                            trackId: isAudio ? 2 : 1,
                            source: path,
                            format: metadata.format as 'video' | 'audio' | 'image',
                            properties: {
                                opacity: 100,
                                scale: 100,
                                rotation: 0,
                                filters: {
                                    blur: 0,
                                    brightness: 100,
                                    contrast: 100,
                                    sepia: false,
                                    grayscale: false,
                                }
                            }
                        });

                        setSelectedClipId(newId);
                        setCurrentTime(startPos + dur / 2);
                        console.log("Clip added to timeline:", newId);
                    } catch (invokeErr) {
                        console.error("Backend metadata retrieval failed for:", path, invokeErr);
                        alert(`Failed to process ${path}. Check console for details.`);
                    }
                }
            } else {
                console.log("No files selected in dialog.");
            }
        } catch (err) {
            console.error("Failed to open import dialog:", err);
            alert("Could not open file dialog. Check permissions.");
        }
    };

    const handleAddAsset = (name: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        const dur = 5 + Math.random() * 10;
        const start = Math.max(0, currentTime - dur / 2);

        addClip({
            id,
            name,
            start,
            duration: dur,
            trackId: 1,
            source: '',
            properties: {
                opacity: 100,
                scale: 100,
                rotation: 0,
                filters: {
                    blur: 0,
                    brightness: 100,
                    contrast: 100,
                    sepia: false,
                    grayscale: false,
                }
            }
        });
        setSelectedClipId(id);
        setCurrentTime(start + dur / 2);
    };

    const tabs = [
        { id: 'media', icon: Layers, label: 'Media' },
        { id: 'effects', icon: Sparkles, label: 'FX' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'audio', icon: Music, label: 'Audio' },
    ];

    return (
        <div className="flex flex-col h-full bg-background/80 backdrop-blur-3xl border-r border-border z-20">
            <div className="flex p-2 gap-1 bg-surface m-3 rounded-2xl border border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1.5 transition-all relative ${activeTab === tab.id ? 'bg-accent text-background' : 'text-textDim hover:text-textMain hover:bg-surfaceHighlight'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTab" className="absolute inset-0 bg-accent rounded-xl" />
                        )}
                        <tab.icon size={18} className="relative z-10" />
                        <span className="text-[10px] uppercase font-black tracking-widest relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-4">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textDim" size={14} />
                    <input
                        placeholder="Search assets..."
                        className="w-full bg-surface border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs focus:border-accent focus:ring-0 transition-all outline-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    <AnimatePresence mode="wait">
                        {activeTab === 'media' && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                key="media"
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-textDim">Local Storage</h3>
                                    <Cloud size={12} className="text-textDim" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { name: 'Cinema_Shot.mov', color: 'from-white/5' },
                                        { name: 'Drone_View.mp4', color: 'from-white/10' },
                                        { name: 'Portrait.mp4', color: 'from-white/5' },
                                        { name: 'B-Roll.mp4', color: 'from-white/10' }
                                    ].map((asset) => (
                                        <motion.div
                                            key={asset.name}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`aspect-[4/3] bg-gradient-to-br ${asset.color} to-surface rounded-xl border border-border flex flex-col items-center justify-center cursor-pointer glass-card relative overflow-hidden group`}
                                            onClick={() => handleAddAsset(asset.name)}
                                        >
                                            <Video size={24} className="text-textDim group-hover:text-accent group-hover:scale-110 transition-all duration-300" />
                                            <div className="absolute bottom-2 left-2 right-2 truncate text-[9px] font-bold text-textDim group-hover:text-textMain transition-colors">{asset.name}</div>
                                        </motion.div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleImportMedia}
                                    className="group w-full py-4 bg-surfaceHighlight border border-white/5 rounded-2xl text-xs font-bold text-textMain hover:bg-accent hover:text-background hover:border-accent transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20"
                                >
                                    <HardDrive size={14} className="group-hover:animate-bounce" />
                                    Import Media
                                </button>
                            </motion.div>
                        )}

                        {activeTab === 'effects' && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                key="fx"
                                className="space-y-2"
                            >
                                {['Hyper Glow', 'Film Grain Pro', 'Neon Pulse', 'Edge Detection', 'Chromatic Fix'].map((effect, i) => (
                                    <motion.div
                                        key={effect}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-accent/10 hover:border-accent/30 cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                                                <Sparkles size={14} />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">{effect}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
