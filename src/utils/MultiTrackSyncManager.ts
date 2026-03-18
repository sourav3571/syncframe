// Advanced Multi-Track Playback Synchronization System
// Ensures multiple clips on different tracks play smoothly and simultaneously

import { useRef, useEffect, useState } from 'react';

interface MultiTrackSyncState {
  mediaElements: Map<string, HTMLMediaElement>;
  masterVideoElement: HTMLVideoElement | null;
  syncIntervalId: number | null;
  lastSyncTime: number;
  driftSamples: number[];
}

export class MultiTrackSyncManager {
  private state: MultiTrackSyncState = {
    mediaElements: new Map(),
    masterVideoElement: null,
    syncIntervalId: null,
    lastSyncTime: 0,
    driftSamples: [],
  };

  private config = {
    syncCheckInterval: 16.67, // 60fps = ~16.67ms
    maxDrift: 0.05, // 50ms maximum drift tolerance
    correctionThreshold: 0.02, // 20ms before correcting
    hardSyncThreshold: 0.1, // 100ms = hard sync required
  };

  registerMediaElement(id: string, element: HTMLMediaElement, isMaster: boolean = false) {
    this.state.mediaElements.set(id, element);
    if (isMaster && element instanceof HTMLVideoElement) {
      this.state.masterVideoElement = element;
    }
  }

  unregisterMediaElement(id: string) {
    this.state.mediaElements.delete(id);
  }

  /**
   * Synchronize all media elements to the master time
   * This ensures all clips on different tracks play together perfectly
   */
  syncAllMediaElements(masterTime: number) {
    if (!this.state.masterVideoElement) return;

    let maxDrift = 0;
    const drifts: number[] = [];

    // Sync each media element to master time
    for (const [, element] of this.state.mediaElements) {
      const drift = Math.abs(element.currentTime - masterTime);
      drifts.push(drift);
      maxDrift = Math.max(maxDrift, drift);

      // Only correct if drift exceeds threshold
      if (drift > this.config.correctionThreshold) {
        if (drift > this.config.hardSyncThreshold) {
          // Hard sync: Direct time jump
          element.currentTime = masterTime;
        } else {
          // Soft sync: Adjust playback rate gradually
          const rate = masterTime > element.currentTime ? 1.05 : 0.95;
          if (Math.abs(element.playbackRate - rate) > 0.01) {
            element.playbackRate = rate;
          }
        }
      } else if (Math.abs(element.playbackRate - 1.0) > 0.01) {
        // Return to normal rate when in sync
        element.playbackRate = 1.0;
      }
    }

    // Track drift metrics
    this.state.driftSamples = drifts;
    if (this.state.driftSamples.length > 120) {
      this.state.driftSamples.shift();
    }
  }

  /**
   * Get average sync quality (0-1, where 1 is perfect)
   */
  getSyncQuality(): number {
    if (this.state.driftSamples.length === 0) return 1;

    const avgDrift = this.state.driftSamples.reduce((a, b) => a + b, 0) / this.state.driftSamples.length;
    const variance =
      this.state.driftSamples.reduce((sum, d) => sum + Math.pow(d - avgDrift, 2), 0) /
      this.state.driftSamples.length;
    const jitter = Math.sqrt(variance);

    const driftFactor = Math.max(0, 1 - avgDrift / this.config.maxDrift);
    const jitterFactor = Math.max(0, 1 - jitter / 0.05);

    return driftFactor * 0.6 + jitterFactor * 0.4;
  }

  startSyncLoop(timeProvider: () => number) {
    if (this.state.syncIntervalId) return;

    this.state.syncIntervalId = window.setInterval(() => {
      const masterTime = timeProvider();
      this.syncAllMediaElements(masterTime);
      this.state.lastSyncTime = performance.now();
    }, this.config.syncCheckInterval);
  }

  stopSyncLoop() {
    if (this.state.syncIntervalId) {
      clearInterval(this.state.syncIntervalId);
      this.state.syncIntervalId = null;
    }
  }

  destroy() {
    this.stopSyncLoop();
    this.state.mediaElements.clear();
  }
}

/**
 * React Hook for multi-track synchronization
 */
export const useMultiTrackSync = (isPlaying: boolean, currentTime: number) => {
  const managerRef = useRef<MultiTrackSyncManager | null>(null);
  const [syncQuality, setSyncQuality] = useState(1);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new MultiTrackSyncManager();
    }

    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (isPlaying && managerRef.current) {
      managerRef.current.startSyncLoop(() => currentTime);

      // Update sync quality display periodically
      const qualityInterval = setInterval(() => {
        setSyncQuality(managerRef.current?.getSyncQuality() || 1);
      }, 500);

      return () => clearInterval(qualityInterval);
    } else {
      managerRef.current?.stopSyncLoop();
    }
  }, [isPlaying, currentTime]);

  return {
    registerMedia: (id: string, element: HTMLMediaElement, isMaster?: boolean) => {
      managerRef.current?.registerMediaElement(id, element, isMaster);
    },
    unregisterMedia: (id: string) => {
      managerRef.current?.unregisterMediaElement(id);
    },
    syncQuality,
  };
};
