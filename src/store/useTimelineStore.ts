import { create } from 'zustand';

export interface Clip {
  id: string;
  name: string;
  start: number; // in seconds
  duration: number; // in seconds
  trackId: number;
  source?: string; // Real file path
  properties: {
    opacity: number;
    scale: number;
    rotation: number;
    filters: {
      blur: number;
      brightness: number;
      contrast: number;
      sepia: boolean;
      grayscale: boolean;
    };
  };
}

export interface Track {
  id: number;
  name: string;
}

interface TimelineState {
  tracks: Track[];
  clips: Clip[];
  currentTime: number;
  zoom: number;
  selectedClipId: string | null;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  splitClip: (id: string, time: number) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  setSelectedClipId: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  tracks: [
    { id: 1, name: 'Video 1' },
    { id: 2, name: 'Audio 1' },
  ],
  clips: [],
  currentTime: 0,
  zoom: 10,
  selectedClipId: null,
  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  removeClip: (id) => set((state) => ({ clips: state.clips.filter((c) => c.id !== id) })),
  updateClip: (id, updates) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  splitClip: (id, time) => set((state) => {
    const clipToSplit = state.clips.find(c => c.id === id);
    if (!clipToSplit) return state;

    const splitPoint = time - clipToSplit.start;
    if (splitPoint <= 0 || splitPoint >= clipToSplit.duration) return state;

    const newClip1 = { ...clipToSplit, duration: splitPoint };
    const newClip2 = {
      ...clipToSplit,
      id: Math.random().toString(36).substr(2, 9),
      start: time,
      duration: clipToSplit.duration - splitPoint,
      name: `${clipToSplit.name} (Part 2)`
    };

    return {
      clips: state.clips.filter(c => c.id !== id).concat([newClip1, newClip2])
    };
  }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
}));
