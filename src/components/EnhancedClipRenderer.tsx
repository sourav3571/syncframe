// Enhanced Multi-Track Clip Renderer
// Ensures perfect synchronization across multiple video and audio clips
import { useRef, useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface EnhancedClipRendererProps {
  clip: any;
  isPlaying: boolean;
  isAudioOnly?: boolean;
  currentTime: number;
  muted?: boolean;
}

export const EnhancedClipRenderer = ({
  clip,
  isPlaying,
  isAudioOnly = false,
  currentTime,
  muted = false,
}: EnhancedClipRendererProps) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [loadedMetadata, setLoadedMetadata] = useState(false);

  // Resolve media source
  const resolveSource = (src: string) => {
    if (!src) return "";
    let finalSrc = src;
    if (src.startsWith('http') || src.startsWith('asset:') || src.startsWith('data:')) {
      finalSrc = src;
    } else if (src.startsWith('/')) {
      finalSrc = new URL(src, window.location.origin).href;
    } else {
      finalSrc = convertFileSrc(src);
    }
    
    if (isAudioOnly && clip.format === 'video') {
      return `${finalSrc}${finalSrc.includes('?') ? '&' : '?'}audioId=${clip.id}`;
    }
    return finalSrc;
  };

  const source = resolveSource(clip.source || "");
  const isActive = currentTime >= clip.start && currentTime < clip.start + clip.duration;

  // Check if clip is approaching (within 1 second)
  const isApproaching = currentTime > clip.start - 1.0 && currentTime < clip.start;

  // Load metadata when approaching
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    if (isApproaching || isActive) {
      el.load();
      el.play().then(() => el.pause()).catch(() => {});
    }
  }, [isApproaching, isActive]);

  // Main synchronization effect
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !loadedMetadata || !source) return;

    try {
      // Calculate expected media time based on clip timeline position
      const speed = clip.properties?.speed || 1;
      const mediaOffset = clip.mediaOffset || 0;
      
      // Time since clip started on timeline
      const elapsedTimeInClip = (currentTime - clip.start) * speed;
      const expectedMediaTime = Math.max(0, elapsedTimeInClip + mediaOffset);
      const clampedMediaTime = Math.min(expectedMediaTime, clip.duration);

      // 1. Set playback rate FIRST (before seeking)
      if (el.playbackRate !== speed) {
        el.playbackRate = speed;
      }

      // 2. Handle Play/Pause
      if (isPlaying && isActive) {
        if (el.paused) {
          el.play().catch(err => {
            console.warn(`Playback failed for ${clip.name}:`, err);
          });
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
      }

      // 3. CRITICAL: Synchronize media time with sub-frame precision for 90fps focus
      // Use "Soft Sync": adjust playbackRate instead of hard-seeking for minor drifts
      const drift = el.currentTime - clampedMediaTime;
      const absDrift = Math.abs(drift);
      
      if (absDrift > 0.15 && !el.seeking) {
        // Hard sync for large jumps (>150ms)
        el.currentTime = clampedMediaTime;
        el.playbackRate = speed;
      } else if (absDrift > 0.008) {
        // 90fps frame is ~11.1ms. We catch drifts above 8ms.
        // Soft sync: Adjust playback speed slightly (+/- 5%) to align over time
        const adjustment = drift > 0 ? 0.95 : 1.05;
        if (el.playbackRate !== speed * adjustment) {
          el.playbackRate = speed * adjustment;
        }
      } else if (el.playbackRate !== speed) {
        // Within tolerance, ensure base speed
        el.playbackRate = speed;
      }

      // 4. Handle volume and fades
      let targetVolume = 0;
      if (isActive) {
        const baseVolume = (clip.properties?.volume !== undefined ? clip.properties.volume : 100) / 100;
        targetVolume = baseVolume;

        // Apply fade in
        const fadeIn = clip.properties?.fadeIn || 0;
        if (fadeIn > 0) {
          const elapsed = currentTime - clip.start;
          if (elapsed < fadeIn) {
            targetVolume *= (elapsed / fadeIn);
          }
        }

        // Apply fade out
        const fadeOut = clip.properties?.fadeOut || 0;
        if (fadeOut > 0) {
          const remaining = (clip.start + clip.duration) - currentTime;
          if (remaining < fadeOut) {
            targetVolume *= (remaining / fadeOut);
          }
        }
      }

      // Smooth volume transitions
      const volumeDiff = Math.abs(el.volume - targetVolume);
      if (volumeDiff > 0.05) {
        el.volume = el.volume + (targetVolume - el.volume) * 0.1;
      } else if (volumeDiff > 0.01) {
        el.volume = targetVolume;
      }
    } catch (err) {
      console.error(`[EnhancedClipRenderer] Sync error for ${clip.name}:`, err);
    }

  }, [isPlaying, currentTime, isActive, clip, loadedMetadata, source]);

  const handleLoadedMetadata = () => {
    setLoadedMetadata(true);
  };

  const handleError = (e: any) => {
    const errorMsg = `Media Error [${clip.name}]: ${e.target.error?.message || 'Unknown'}`;
    console.error(errorMsg);
  };

  if (isAudioOnly) {
    return (
      <audio
        ref={mediaRef as any}
        src={source}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0.01 }}
      />
    );
  }

  // Video rendering
  const properties = clip.properties || {};
  let filterString = '';
  if (properties.filters) {
    filterString = `blur(${properties.filters.blur || 0}px) brightness(${properties.filters.brightness || 100}%) contrast(${properties.filters.contrast || 100}%) ${properties.filters.sepia ? 'sepia(1)' : ''} ${properties.filters.grayscale ? 'grayscale(1)' : ''}`;
    if (properties.filters.custom && properties.filters.custom !== 'none') {
      filterString += ` ${properties.filters.custom}`;
    }
  }
  if (properties.adjustments) {
    const adj = properties.adjustments;
    filterString += ` saturate(${adj.saturation || 100}%) brightness(${100 + (adj.exposure || 0)}%) hue-rotate(${adj.tint || 0}deg)`;
  }

  // Render text clips
  if (clip.format === 'text') {
    return (
      <div
        style={{
          fontFamily: properties.textStyle?.font || 'Inter',
          color: properties.textStyle?.color || 'white',
          textShadow: properties.textStyle?.shadow || 'none',
          animation: properties.textStyle?.animation && properties.textStyle?.animation !== 'none' ? `${properties.textStyle?.animation} 2s infinite` : 'none',
          opacity: isActive ? 1 : 0,
          transition: 'opacity 0.2s ease-out'
        }}
        className="text-4xl font-black text-center"
      >
        {clip.textContent || 'Text'}
      </div>
    );
  }

  // Render sticker clips
  if (clip.format === 'sticker') {
    return <div className="text-8xl drop-shadow-2xl">{clip.stickerId}</div>;
  }

  // Render image clips
  if (clip.format === 'image') {
    return <img src={source} className="w-full h-full object-cover shadow-2xl" alt={clip.name} />;
  }

  // Render filter/adjustment clips
  if (clip.format === 'filter' || clip.format === 'adjustment') {
    return (
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ backdropFilter: filterString }}
      />
    );
  }

  // Render video clips
  return (
    <video
      ref={mediaRef as any}
      src={source}
      className="w-full h-full object-cover"
      playsInline
      muted={muted}
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onError={handleError}
      style={{
        filter: clip.format === 'video' ? filterString : 'none',
        transformOrigin: 'center center'
      }}
    />
  );
};
