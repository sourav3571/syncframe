import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Clip {
  id: string;
  name: string;
  start: number;
  duration: number;
  trackId: number;
  source?: string;
  format?: 'video' | 'audio' | 'image' | 'text' | 'sticker' | 'filter' | 'adjustment';
  textContent?: string;
  stickerId?: string;
  assetId?: string;
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
      custom?: string;
    };
    adjustments?: {
      saturation: number;
      exposure: number;
      temp: number;
      tint: number;
      highlights: number;
      shadows: number;
      vignette: number;
    };
    textStyle?: {
      font: string;
      color: string;
      shadow: string;
      animation: string;
    };
  };
}

export interface Track {
  id: number;
  name: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  source: string;
  format: 'video' | 'audio' | 'image';
  duration: number;
  lastUsed: number;
}

interface TimelineState {
  tracks: Track[];
  clips: Clip[];
  mediaLibrary: MediaAsset[];
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  selectedClipId: string | null;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  splitClip: (id: string, time: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setSelectedClipId: (id: string | null) => void;
  addMediaToLibrary: (media: MediaAsset) => void;
  removeMediaFromLibrary: (id: string) => void;
  initializeTracks: () => void;
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      tracks: [
        { id: 1, name: 'Video 1' },
        { id: 2, name: 'Video 2' },
        { id: 3, name: 'Video 3' },
        { id: 4, name: 'Audio 1' },
        { id: 5, name: 'Audio 2' },
      ],
      initializeTracks: () => {
        const currentTracks = get().tracks;
        if (currentTracks.length < 5) {
          set({
            tracks: [
              { id: 1, name: 'Video 1' },
              { id: 2, name: 'Video 2' },
              { id: 3, name: 'Video 3' },
              { id: 4, name: 'Audio 1' },
              { id: 5, name: 'Audio 2' },
            ]
          });
        }
      },
      clips: [],
      mediaLibrary: [],
      currentTime: 0,
      isPlaying: false,
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
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setZoom: (zoom) => set({ zoom }),
      setSelectedClipId: (id) => set({ selectedClipId: id }),
      addMediaToLibrary: (media) => set((state) => {
        const exists = state.mediaLibrary.find(m => m.source === media.source);
        if (exists) return state;
        return { mediaLibrary: [media, ...state.mediaLibrary] };
      }),
      removeMediaFromLibrary: (id) => set((state) => ({
        mediaLibrary: state.mediaLibrary.filter(m => m.id !== id)
      })),
    }),
    {
      name: 'syncframe-timeline-storage',
      version: 2, // Bumped to version 2 to ensure tracks 4 & 5 are available
    }
  )
);
