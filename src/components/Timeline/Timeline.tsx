import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTimelineStore } from '../../store/useTimelineStore';
import { Scissors, MousePointer2, ZoomIn, ZoomOut, Clock, Trash2, Eye, Volume2 } from 'lucide-react';

export const Timeline = () => {
    const { tracks, clips, currentTime, zoom, selectedClipId, setCurrentTime, setSelectedClipId, setZoom, splitClip, removeClip, updateClip } = useTimelineStore();
    const timelineRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = React.useState<'select' | 'split'>('select');

    const handleTimelineClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.clip-item')) {
            if (mode === 'split' && selectedClipId) {
                splitClip(selectedClipId, currentTime);
                setMode('select');
            }
            return;
        }
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = x / zoom;
        if (time >= 0) {
            setCurrentTime(time);
            setSelectedClipId(null);
        }
    };

    const handleClipClick = (e: React.MouseEvent, clip: any) => {
        e.stopPropagation();
        setSelectedClipId(clip.id);

        if (currentTime < clip.start || currentTime > clip.start + clip.duration) {
            setCurrentTime(clip.start);
        }
    };

    React.useEffect(() => {
        const el = timelineRef.current;
        if (!el) return;
        const centerX = currentTime * zoom - el.clientWidth / 2;
        el.scrollTo({ left: Math.max(0, centerX), behavior: 'smooth' });
    }, [currentTime, zoom]);

    return (
        <div className="flex flex-col h-full bg-background border-t border-border select-none">
            <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-surface/40 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setMode('select')}
                            className={`p-1.5 rounded transition-colors ${mode === 'select' ? 'bg-white/10 text-accent' : 'text-textDim hover:text-white'}`}
                        >
                            <MousePointer2 size={16} />
                        </button>
                        <button
                            onClick={() => setMode('split')}
                            className={`p-1.5 rounded transition-colors ${mode === 'split' ? 'bg-white/10 text-red-400' : 'text-textDim hover:text-white'}`}
                        >
                            <Scissors size={16} />
                        </button>
                    </div>
                    {selectedClipId && (
                        <button
                            onClick={() => {
                                removeClip(selectedClipId);
                                setSelectedClipId(null);
                            }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-textDim hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <div className="flex items-center gap-2 text-[10px] font-bold text-textDim uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-border">
                        <Clock size={12} className="text-accent" />
                        <span className="mono text-accent">{new Date(currentTime * 1000).toISOString().substr(11, 10)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-border">
                        <button onClick={() => setZoom(Math.max(2, zoom - 2))} className="p-1 hover:bg-white/5 rounded"><ZoomOut size={14} /></button>
                        <div className="text-[9px] font-black text-textDim w-8 text-center">{Math.floor(zoom * 10)}%</div>
                        <button onClick={() => setZoom(zoom + 2)} className="p-1 hover:bg-white/5 rounded"><ZoomIn size={14} /></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[110px] bg-surface/60 border-r border-border flex flex-col pt-10">
                    {tracks.map((track) => (
                        <div key={track.id} className="h-24 px-3 flex flex-col justify-center gap-2 group border-b border-border bg-background/50 hover:bg-background transition-colors relative">
                            <span className="text-[9px] font-black uppercase text-textDim group-hover:text-white transition-colors truncate w-full">{track.name}</span>
                            <div className="flex items-center gap-2">
                                <button className="text-textDim hover:text-white transition-colors"><Eye size={12} /></button>
                                <button className="text-textDim hover:text-white transition-colors"><Volume2 size={12} /></button>
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500/50" />
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    ref={timelineRef}
                    className="flex-1 relative overflow-x-auto overflow-y-hidden timeline-grid cursor-crosshair group/v"
                    onClick={handleTimelineClick}
                >
                    <div className="h-10 border-b border-border relative bg-surface/20">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-6 h-4 w-px bg-white/10"
                                style={{ left: i * zoom * 5 }}
                            >
                                <span className="absolute -top-6 left-1 text-[8px] font-bold text-zinc-600 mono">{i * 5}s</span>
                            </div>
                        ))}
                    </div>

                    <motion.div
                        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        animate={{ x: currentTime * zoom }}
                        transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                    >
                        <div className="w-4 h-5 bg-red-500 absolute -top-1 -left-[7px] [clip-path:polygon(0%_0%,100%_0%,100%_70%,50%_100%,0%_70%)]" />
                    </motion.div>

                    {tracks.map((track) => (
                        <div key={track.id} className="h-24 border-b border-white/5 relative">
                            {clips.filter(c => c.trackId === track.id).map(clip => (
                                <motion.div
                                    key={clip.id}
                                    layoutId={clip.id}
                                    onClick={(e) => handleClipClick(e, clip)}
                                    whileHover={{ scaleY: 1.02 }}
                                    className={`clip-item absolute h-16 top-4 rounded-xl flex flex-col justify-center px-4 overflow-hidden cursor-pointer transition-all border-2 group ${selectedClipId === clip.id
                                        ? 'bg-accent/30 border-accent shadow-[0_0_25px_rgba(255,255,255,0.2)] z-10'
                                        : 'bg-surfaceHighlight/60 border-white/5 hover:border-white/20'
                                        }`}
                                    style={{
                                        left: clip.start * zoom,
                                        width: clip.duration * zoom
                                    }}
                                    drag="x"
                                    dragMomentum={false}
                                    onDragEnd={(_, info) => {
                                        const newStart = Math.max(0, (clip.start * zoom + info.offset.x) / zoom);
                                        updateClip(clip.id, { start: newStart });
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-tight text-white group-hover:text-accent transition-colors">{clip.name}</span>
                                        <div className="text-[8px] font-mono opacity-50">{clip.duration.toFixed(1)}s</div>
                                    </div>
                                    <div className="flex items-end gap-[1px] h-4 opacity-30 group-hover:opacity-60 transition-opacity">
                                        {Array.from({ length: 40 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-[2px] bg-accent rounded-full"
                                                style={{ height: `${20 + Math.random() * 80}%` }}
                                            />
                                        ))}
                                    </div>
                                    <motion.div
                                        drag="x"
                                        dragMomentum={false}
                                        onDragEnd={(_, info) => {
                                            const newWidthPx = clip.duration * zoom + info.offset.x;
                                            const newDuration = Math.max(0.5, newWidthPx / zoom);
                                            updateClip(clip.id, { duration: newDuration });
                                        }}
                                        className="absolute right-1 bottom-1 w-3 h-6 rounded-md bg-white/10 hover:bg-white/30 cursor-ew-resize"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
