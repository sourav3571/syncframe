import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTimelineStore } from '../../store/useTimelineStore';
import { Scissors, MousePointer2, ZoomIn, ZoomOut, Clock, Trash2, Eye, Volume2, Music } from 'lucide-react';

// Sub-component for the live time display to isolate re-renders
const TimeDisplay = () => {
    const currentTime = useTimelineStore(s => s.currentTime);
    return (
        <div className="flex items-center gap-2 text-[10px] font-bold text-textDim uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-border">
            <Clock size={12} className="text-accent" />
            <span className="mono text-accent">{new Date(currentTime * 1000).toISOString().substr(11, 10)}</span>
        </div>
    );
};

// Sub-component for the playhead and auto-scroll logic
const Playhead = ({ timelineRef, zoom, tracksCount, isLineDragging, setIsLineDragging, setIsAutoScrollEnabled, isAutoScrollEnabled }: { 
    timelineRef: React.RefObject<HTMLDivElement | null>, 
    zoom: number, 
    tracksCount: number,
    isLineDragging: boolean,
    setIsLineDragging: (v: boolean) => void,
    setIsAutoScrollEnabled: (v: boolean) => void,
    isAutoScrollEnabled: boolean
}) => {
    const currentTime = useTimelineStore(s => s.currentTime);

    React.useEffect(() => {
        const el = timelineRef.current;
        if (!el || isLineDragging || !isAutoScrollEnabled) return;

        const centerX = currentTime * zoom - el.clientWidth / 2;
        el.scrollTo({ left: Math.max(0, centerX), behavior: 'auto' });
    }, [currentTime, zoom, isLineDragging, isAutoScrollEnabled, timelineRef]);

    return (
        <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-ew-resize"
            onMouseDown={(e) => { e.stopPropagation(); setIsLineDragging(true); setIsAutoScrollEnabled(false); }}
            style={{
                left: currentTime * zoom,
                height: tracksCount * 64 + 40,
                pointerEvents: isLineDragging ? 'auto' : 'auto',
            }}
        >
            <div className="w-4 h-5 bg-red-500 absolute -top-1 -left-[7px] [clip-path:polygon(0%_0%,100%_0%,100%_70%,50%_100%,0%_70%)]" />
        </div>
    );
};

export const Timeline = () => {
    const { tracks, clips, mediaLibrary, zoom, selectedClipId, setCurrentTime, setSelectedClipId, setZoom, splitClip, removeClip, updateClip } = useTimelineStore();
    // Use a reference for currentTime in callbacks to avoid re-renders
    const currentTimeRef = useRef(0);
    React.useEffect(() => {
        return useTimelineStore.subscribe(
            (state) => { currentTimeRef.current = state.currentTime; }
        );
    }, []);

    const timelineRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = React.useState<'select' | 'split'>('select');
    const [isLineDragging, setIsLineDragging] = React.useState(false);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);

    React.useEffect(() => {
        if (!isLineDragging || !timelineRef.current) return;

        const onMouseMove = (event: MouseEvent) => {
            const rect = timelineRef.current!.getBoundingClientRect();
            const localX = event.clientX - rect.left;
            let x = localX + timelineRef.current!.scrollLeft;
            x = Math.max(0, Math.min(x, timelineRef.current!.scrollWidth));
            setCurrentTime(x / zoom);
        };

        const onMouseUp = () => {
            setIsLineDragging(false);
            setTimeout(() => setIsAutoScrollEnabled(true), 150);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isLineDragging, zoom, setCurrentTime]);

    const handleTimelineClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.clip-item')) {
            if (mode === 'split' && selectedClipId) {
                splitClip(selectedClipId, currentTimeRef.current);
                setMode('select');
            }
            return;
        }
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        let x = localX + timelineRef.current.scrollLeft;
        x = Math.max(0, Math.min(x, timelineRef.current.scrollWidth));
        const time = Math.max(0, x / zoom);
        setCurrentTime(time);
        setSelectedClipId(null);
    };

    const handleClipClick = (e: React.MouseEvent, clip: any) => {
        e.stopPropagation();

        if (mode === 'split') {
            splitClip(clip.id, currentTimeRef.current);
            setMode('select');
            return;
        }

        setSelectedClipId(clip.id);

        if (currentTimeRef.current < clip.start || currentTimeRef.current > clip.start + clip.duration) {
            setCurrentTime(clip.start);
        }
    };

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
                    <TimeDisplay />
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
                <div className="w-[110px] bg-surface/60 border-r border-border flex flex-col pt-10 overflow-hidden">
                    <div
                        className="flex-1 overflow-y-auto scrollbar-hide"
                        ref={sidebarRef}
                    >
                        {tracks.map((track) => (
                            <div key={track.id} className="h-16 px-3 flex flex-col justify-center gap-1 group border-b border-border bg-background/50 hover:bg-background transition-colors relative">
                                <span className="text-[9px] font-black uppercase text-textDim group-hover:text-white transition-colors truncate w-full">{track.name}</span>
                                <div className="flex items-center gap-2">
                                    <button className="text-textDim hover:text-white transition-colors">
                                        {track.id >= 4 ? <Music size={12} /> : <Eye size={12} />}
                                    </button>
                                    <button className="text-textDim hover:text-white transition-colors"><Volume2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    ref={timelineRef}
                    className="flex-1 relative overflow-auto custom-scrollbar timeline-grid cursor-crosshair group/v"
                    onClick={handleTimelineClick}
                    onScroll={(e) => {
                        if (sidebarRef.current) {
                            sidebarRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
                        }
                    }}
                >
                    <div className="sticky top-0 h-10 border-b border-border z-50 bg-surface/20 backdrop-blur-md">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-6 h-4 w-px bg-white/10"
                                style={{ left: i * zoom * 5 }}
                            >
                                <span className="absolute -top-6 left-1 text-[8px] font-bold text-zinc-600 mono">{i * 5}s</span>
                            </div>
                        ))}
                    </div>

                    <div className="relative pt-0">
                        <Playhead 
                            timelineRef={timelineRef} 
                            zoom={zoom} 
                            tracksCount={tracks.length} 
                            isLineDragging={isLineDragging}
                            setIsLineDragging={setIsLineDragging}
                            isAutoScrollEnabled={isAutoScrollEnabled}
                            setIsAutoScrollEnabled={setIsAutoScrollEnabled}
                        />

                        {tracks.map((track) => (
                            <div key={track.id} className="h-16 border-b border-white/5 relative">
                                {clips.filter(c => c.trackId === track.id).map(clip => (
                                    <motion.div
                                        key={clip.id}
                                        layoutId={clip.id}
                                        onClick={(e) => handleClipClick(e, clip)}
                                        whileHover={{ scaleY: 1.05 }}
                                        className={`clip-item absolute h-12 top-2 rounded-lg flex flex-col justify-center px-3 overflow-hidden cursor-pointer transition-all border-2 group ${selectedClipId === clip.id
                                            ? 'bg-accent/30 border-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] z-10'
                                            : clip.format === 'audio'
                                                ? 'bg-indigo-500/30 border-indigo-400/20 hover:border-indigo-400/40'
                                                : 'bg-surfaceHighlight/60 border-white/5 hover:border-white/20'
                                            }`}
                                        style={{
                                            left: clip.start * zoom,
                                            width: Math.max(20, clip.duration * zoom)
                                        }}
                                        drag="x"
                                        dragMomentum={false}
                                        onDragEnd={(_, info) => {
                                            const newStart = Math.max(0, clip.start + info.offset.x / zoom);
                                            updateClip(clip.id, { start: newStart });
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1 translate-y-1">
                                            <div className="flex items-center gap-1.5 truncate">
                                                {clip.format === 'audio' && <Music size={10} className="text-indigo-400 shrink-0" />}
                                                <span className="text-[9px] font-black uppercase tracking-tight text-white group-hover:text-accent transition-colors truncate">{clip.name}</span>
                                            </div>
                                            <div className="text-[7px] font-mono opacity-50 shrink-0">{clip.duration.toFixed(1)}s</div>
                                        </div>
                                        <div className={`flex items-end gap-[1px] h-4 ${clip.format === 'audio' ? 'opacity-70' : 'opacity-20'} group-hover:opacity-40 transition-opacity translate-y-1`}>
                                            {Array.from({ length: 20 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-[2px] rounded-full ${clip.format === 'audio' ? 'bg-indigo-400' : 'bg-accent'}`}
                                                    style={{ height: `${20 + Math.sin(i * 0.5 + clip.start) * 30 + Math.random() * 50}%` }}
                                                />
                                            ))}
                                        </div>
                                        <motion.div
                                            drag="x"
                                            dragMomentum={false}
                                            onDragEnd={(e, info) => {
                                                e.stopPropagation();
                                                const offsetTime = info.offset.x / zoom;
                                                const newStart = Math.max(0, clip.start + offsetTime);
                                                const timeDiff = newStart - clip.start;
                                                const currentMediaOffset = clip.mediaOffset || 0;
                                                
                                                // Prevent negative media offset (trimming before start of video)
                                                if (currentMediaOffset + timeDiff < 0) return;
                                                
                                                // Prevent trimming beyond the end of the video from the left
                                                const newDuration = Math.max(0.5, clip.duration - timeDiff);
                                                
                                                updateClip(clip.id, {
                                                    start: newStart,
                                                    duration: newDuration,
                                                    mediaOffset: currentMediaOffset + timeDiff
                                                });
                                            }}
                                            className="absolute left-0 top-0 bottom-0 w-4 bg-black/20 hover:bg-white/40 cursor-ew-resize z-20 flex items-center justify-center border-r border-white/20"
                                            title="Trim Left Edge"
                                        >
                                            <div className="w-[2px] h-4 bg-white/60 rounded-full shrink-0" />
                                        </motion.div>
                                        <motion.div
                                            drag="x"
                                            dragMomentum={false}
                                            onDragEnd={(e, info) => {
                                                e.stopPropagation();
                                                const newWidthPx = clip.duration * zoom + info.offset.x;
                                                let newDuration = Math.max(0.5, newWidthPx / zoom);
                                                
                                                // Bound right edge by source media duration
                                                const sourceMedia = mediaLibrary.find(m => m.source === clip.source);
                                                if (sourceMedia) {
                                                    const maxDuration = sourceMedia.duration - (clip.mediaOffset || 0);
                                                    if (newDuration > maxDuration) {
                                                        newDuration = maxDuration;
                                                    }
                                                }
                                                
                                                updateClip(clip.id, { duration: newDuration });
                                            }}
                                            className="absolute right-0 top-0 bottom-0 w-4 bg-black/20 hover:bg-white/40 cursor-ew-resize z-20 flex items-center justify-center border-l border-white/20"
                                            title="Trim Right Edge"
                                        >
                                            <div className="w-[2px] h-4 bg-white/60 rounded-full shrink-0" />
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
