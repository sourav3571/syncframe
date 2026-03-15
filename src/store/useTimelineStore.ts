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
  mediaOffset?: number;
  hasAudio?: boolean;
  trimStart?: number;
  trimEnd?: number;
  isSynced?: boolean;
  syncOffset?: number;
  memeTemplate?: string;
  properties: {
    opacity: number;
    scale: number;
    rotation: number;
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
    speed?: number;
    crop?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
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
  hasAudio?: boolean;
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
  moveClipLive: (id: string, start: number) => void;
  splitClip: (id: string, time: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setSelectedClipId: (id: string | null) => void;
  addMediaToLibrary: (media: MediaAsset) => void;
  removeMediaFromLibrary: (id: string) => void;
  initializeTracks: () => void;
  pastClips: Clip[][];
  futureClips: Clip[][];
  undo: () => void;
  redo: () => void;
  commitToHistory: () => void;
  trimClip: (id: string, start: number, end: number) => void;
  syncClips: (clipIds: string[], referenceTime: number) => void;
  applyMemeTemplate: (clipIds: string[], template: string) => void;
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
      pastClips: [],
      futureClips: [],
      commitToHistory: () => set((state) => ({
        pastClips: [...state.pastClips.slice(-19), state.clips],
        futureClips: []
      })),
      undo: () => set((state) => {
        if (state.pastClips.length === 0) return state;
        const previous = state.pastClips[state.pastClips.length - 1];
        return {
          clips: previous,
          pastClips: state.pastClips.slice(0, -1),
          futureClips: [state.clips, ...state.futureClips]
        };
      }),
      redo: () => set((state) => {
        if (state.futureClips.length === 0) return state;
        const next = state.futureClips[0];
        return {
          clips: next,
          pastClips: [...state.pastClips, state.clips],
          futureClips: state.futureClips.slice(1)
        };
      }),
      mediaLibrary: [],
      currentTime: 0,
      isPlaying: false,
      zoom: 10,
      selectedClipId: null,
      addClip: (clip) => {
        get().commitToHistory();
        const safeClip = { ...clip, start: Math.max(0, clip.start) };
        set((state) => ({ clips: [...state.clips, safeClip] }));
      },
      removeClip: (id) => {
        get().commitToHistory();
        set((state) => ({ clips: state.clips.filter((c) => c.id !== id) }));
      },
      updateClip: (id, updates) => {
        get().commitToHistory();
        const safeUpdates = {
          ...updates,
          ...(updates.start !== undefined ? { start: Math.max(0, updates.start) } : {}),
        };
        set((state) => ({
          clips: state.clips.map((c) => (c.id === id ? { ...c, ...safeUpdates } : c)),
        }));
      },
      moveClipLive: (id, start) => {
        set((state) => ({
          clips: state.clips.map((c) => (c.id === id ? { ...c, start: Math.max(0, start) } : c)),
        }));
      },
      splitClip: (id, time) => {
        get().commitToHistory();
        set((state) => {
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
        });
      },
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
      trimClip: (id, start, end) => {
        get().commitToHistory();
        set((state) => ({
          clips: state.clips.map((c) => 
            c.id === id 
              ? { 
                  ...c, 
                  trimStart: Math.max(0, start),
                  trimEnd: Math.min(c.duration, end)
                }
              : c
          ),
        }));
      },
      syncClips: (clipIds, referenceTime) => {
        get().commitToHistory();
        set((state) => ({
          clips: state.clips.map((c) => 
            clipIds.includes(c.id)
              ? { 
                  ...c,
                  isSynced: true,
                  syncOffset: referenceTime - c.start,
                  start: referenceTime,
                  properties: {
                    ...c.properties,
                    fadeIn: 300,
                    fadeOut: 300
                  }
                }
              : c
          ),
        }));
      },
      applyMemeTemplate: (clipIds, template) => {
        get().commitToHistory();
        set((state) => ({
          clips: state.clips.map((c) =>
            clipIds.includes(c.id)
              ? {
                  ...c,
                  memeTemplate: template,
                  properties: {
                    ...c.properties,
                    scale: 100,
                    rotation: 0,
                    opacity: 100,
                    filters: { blur: 0, brightness: 100, contrast: 100, sepia: false, grayscale: false }
                  }
                }
              : c
          ),
        }));
      },
    }),
    {
      name: 'syncframe-timeline-storage',
      version: 2, // Bumped to version 2 to ensure tracks 4 & 5 are available
    }
  )
);
