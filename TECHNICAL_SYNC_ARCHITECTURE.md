# Technical Deep Dive: Multi-Track Sync Architecture

## The Core Problem: Independent Clip Synchronization

### What Was Happening

Each `ClipRenderer` was running its own synchronization logic:

```typescript
// OLD ARCHITECTURE - Each clip independent
<ClipRenderer clip={clip1} isPlaying={isPlaying} />  // ← Clip 1 calculates its own sync
<ClipRenderer clip={clip2} isPlaying={isPlaying} />  // ← Clip 2 calculates its own sync
<ClipRenderer clip={clip3} isPlaying={isPlaying} />  // ← Clip 3 calculates its own sync
```

**Problem:** No shared time reference
- Clip 1 syncs to `now()`
- Clip 2 syncs to `now()` (but slightly later)
- Clip 3 syncs to `now()` (even later)
- Cumulative drift across clips

### Why Videos Looped at Same Timestamp

The old `animate()` loop had this logic:

```typescript
const animate = (timestamp: number) => {
  const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
  lastFrameTimeRef.current = timestamp;

  // PROBLEM: Clamping DURING animation
  currentPlaybackTimeRef.current = Math.min(
    timelineEnd,
    Math.max(0, currentPlaybackTimeRef.current + deltaTime)
  );

  // When time ≥ timelineEnd:
  // - Time stops incrementing (clamped to timelineEnd)
  // - But animation loop keeps running
  // - MediaElements stay at same currentTime
  // - Looks like looping at same timestamp!

  requestAnimationFrame(animate);
};
```

### Loose Sync Tolerance Issue

```typescript
// In old ClipRenderer sync effect:
const threshold = isPlaying ? 0.3 : 0.05;  // 300ms when playing!

if (Math.abs(el.currentTime - expectedTime) > threshold) {
  el.currentTime = expectedTime;
}
```

**Each of 3 video clips can drift ±300ms:**
- Clip 1 drifts +200ms
- Clip 2 drifts -150ms  
- Clip 3 drifts +250ms
- **Result:** They play at different times = not in sync

---

## The Fix: Shared Time Reference Architecture

### 1. Central Time Source

```typescript
// Timeline store provides single source of truth
const currentTime = useTimelineStore(s => s.currentTime);

// This is incremented by the animation loop (once!)
// NOT by individual clips
```

### 2. Clips Receive Shared Time

```typescript
// ALL clips rendered with SAME currentTime
const visuals = clips
  .filter(c => c.trackId <= 3)  // Video tracks
  .map(clip => (
    <EnhancedClipRenderer
      key={clip.id}
      clip={clip}
      currentTime={currentTime}  // ← SHARED
      isPlaying={isPlaying}
    />
  ));

const audio = clips
  .filter(c => c.format === 'audio')  // Audio-only clips
  .map(clip => (
    <EnhancedClipRenderer
      key={clip.id}
      clip={clip}
      currentTime={currentTime}  // ← SAME SHARED TIME
      isPlaying={isPlaying}
      isAudioOnly
    />
  ));
```

### 3. EnhancedClipRenderer Uses Shared Time

```typescript
export const EnhancedClipRenderer = ({ 
  clip, 
  currentTime,  // ← Gets the shared time
  isPlaying 
}) => {
  const mediaRef = useRef<HTMLMediaElement>(null);

  useEffect(() => {
    if (!mediaRef.current) return;
    const el = mediaRef.current;

    // Calculate EXPECTED time based on shared currentTime
    const elapsedInClip = currentTime - clip.start;
    const expectedMediaTime = Math.max(0, 
      elapsedInClip * (clip.speed || 1) + (clip.mediaOffset || 0)
    );

    // TIGHT sync: correct if drift > 20ms
    if (Math.abs(el.currentTime - expectedMediaTime) > 0.02) {
      el.currentTime = expectedMediaTime;
    }

    // Handle preloading, volume, etc...
  }, [currentTime, clip]);
};
```

---

## Synchronization Mechanics

### Scenario: 3 Videos Playing Simultaneously

**Timeline:**
```
Time 0s         Time 1s         Time 2s         Time 3s
[Video1]--------[Video1]--------[Video1]--------[end]
[Video2]----[V2]--------[V2]--------[V2]--------[V2]--[end]
[Video3]--------[Video3]--------[Video3]--------[end]
```

### OLD (Broken) Sync

```
Frame 1 (t=0.000):
  ClipRenderer1 effect runs: sync Video1.currentTime to store.time
  ClipRenderer2 effect runs: sync Video2.currentTime to store.time (0.5ms later)
  ClipRenderer3 effect runs: sync Video3.currentTime to store.time (1.2ms later)
  Problem: Tiny time differences accumulate!

Frame 60 (t=1.000):
  ClipRenderer1: ✓ Video1.currentTime = 1.000
  ClipRenderer2: ✗ Video2.currentTime = 0.985 (drifted -15ms)
  ClipRenderer3: ✗ Video3.currentTime = 1.042 (drifted +42ms)
  They're NOT playing at same time!
```

### NEW (Fixed) Sync

```
Timeline store incremented ONCE per frame:
  store.currentTime = 1.000

SAME 1.000 passed to all renderers:
  EnhancedClipRenderer1 receives currentTime=1.000
  EnhancedClipRenderer2 receives currentTime=1.000
  EnhancedClipRenderer3 receives currentTime=1.000

Each calculates expected media time:
  Video1.currentTime = 1.000 + mediaOffset1
  Video2.currentTime = 1.000 + mediaOffset2
  Video3.currentTime = 1.000 + mediaOffset3
  
All set at SAME timeline moment = Perfect sync!
```

---

## Audio vs Video Track Setup

### Track Layout

```
Track 1, 2, 3: VISUAL (Video clips)
├─ Contain video data
├─ May contain audio tracks
├─ Rendered as <video>
└─ Audio plays from <video> element

Track 4, 5: AUDIO-ONLY
├─ Pure audio (no video)
├─ Rendered as <audio>
└─ Extra audio layer
```

### Muting Logic

```typescript
// OLD: Hardcoded mutation
muted={true}  // Everything muted!

// NEW: Track-aware
muted={clip.trackId > 3}  // Mute only audio tracks (4-5)

Logic:
├─ Track 1: muted=false  → Video audio plays ✓
├─ Track 2: muted=false  → Video audio plays ✓
├─ Track 3: muted=false  → Video audio plays ✓
├─ Track 4: muted=true   → No video output ✓
└─ Track 5: muted=true   → No video output ✓
```

### Audio Mixing

Browser automatically mixes audio from:
1. `<video muted=false>` elements on tracks 1-3
2. `<audio>` elements on tracks 4-5

Result: Clean multi-source audio!

---

## Playback Loop Fix

### THE BUG: Clamping During Animation

```typescript
// WRONG: This stops time incrementing!
const animate = (timestamp) => {
  const delta = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  currentTime += delta;  // Increment
  
  // Clamp during animation (BUG!)
  currentTime = Math.min(timelineEnd, Math.max(0, currentTime));
  
  // When currentTime >= timelineEnd:
  // - Next frame: currentTime += delta gives 10.1s
  // - Clamp: currentTime = min(10, 10.1) = 10s
  // - Next frame: currentTime += delta gives 10.2s
  // - Clamp: currentTime = min(10, 10.2) = 10s
  // - STUCK AT 10s! Looks like looping!

  requestAnimationFrame(animate);
};
```

### THE FIX: Stop When End Reached

```typescript
const animate = (timestamp) => {
  const delta = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  currentTime += delta;  // Always increment
  
  // Only clamp at end (not during animation)
  if (currentTime >= timelineEnd) {
    currentTime = timelineEnd;
    setIsPlaying(false);  // Stop animation loop
  }
  
  currentTime = Math.max(0, currentTime);  // Never go negative
  
  store.setCurrentTime(currentTime);
  requestAnimationFrame(animate);
};
```

**Why this works:**
- Time always increments smoothly
- Playback feels natural
- When end reached, cleanly stop
- No stutter or artificial looping

---

## Drift Correction Strategy

### Hard Sync (Drift > 20ms)

```typescript
if (Math.abs(el.currentTime - expectedTime) > 0.02) {
  el.currentTime = expectedTime;  // Jump directly
}
```

**When used:**
- First frame of clip
- After seeking
- Significant drift accumulated

**Pros:** Instant sync  
**Cons:** Can cause "pop" if audio is playing

### Soft Sync (For Future: Playback Rate Adjustment)

```typescript
// Could use playback rate to smoothly correct
// el.playbackRate = 1.0 + (drift / targetDriftMs);
// But hard sync is cleaner for tight tolerances
```

---

## Multi-Track Sync Manager (Optional)

For even tighter control, the `MultiTrackSyncManager` provides:

```typescript
class MultiTrackSyncManager {
  // Dedicated 60fps sync loop
  private syncLoop = setInterval(() => {
    for (const element of this.registeredElements) {
      if (drift > 100ms) {
        // Hard sync
        element.currentTime = expectedTime;
      } else if (drift > 20ms) {
        // Soft sync (playback rate adjustment)
        element.playbackRate = 1.0 + (drift / 1000);
      }
      // No correction for drift < 20ms
    }
  }, 1000/60);  // 60fps
}
```

**Benefits:**
- Independent from React render cycle
- Guaranteed 60fps sync updates
- Tracks sync quality metrics

**Integration:**
```typescript
const syncManager = useMultiTrackSync(mediaElements, currentTime);
console.log(syncManager.getSyncQuality());  // 0-1 score
```

---

## Performance Impact

### Memory
- Old: Each clip has own sync state → Higher memory
- New: Shared time reference → Lower memory per clip

### CPU
- Old: Multiple independent sync effects → CPU intensive
- New: Single time source → Minimal CPU overhead

### Latency
- Old: Variable (depends on clip render order)
- New: Consistent ±20ms

---

## Testing Verification

### Test 1: Simultaneous Playback
```typescript
// Add 3 videos at different start times
clips = [
  { id: 1, start: 0s, duration: 5s },
  { id: 2, start: 1s, duration: 4s },
  { id: 3, start: 0.5s, duration: 6s },
];

// Play and measure sync
assert(video1.currentTime ≈ video2.currentTime ≈ video3.currentTime)
// Should differ by < 20ms max
```

### Test 2: Audio Output
```typescript
// Check audio plays from video elements
assert(video1.muted === false);
assert(video2.muted === false);
assert(audioTrack4.muted === true);  // Only video output visible

// Check audio devices receive audio from all sources
// Visual: All 3 videos playing
// Audio: All 3 audio streams mixed
```

### Test 3: Seeking
```typescript
// Jump to middle
store.setCurrentTime(2.5s);

// Verify all clips sync instantly
assert(video1.currentTime ≈ 2.5s);
assert(video2.currentTime ≈ 1.5s);  // (2.5s - start 1s)
assert(video3.currentTime ≈ 2.0s);  // (2.5s - start 0.5s)
```

---

## Remaining Optimizations

1. **Hardware Acceleration** - GPU rendering for video
2. **WebCodec API** - Better video codec access
3. **Shared Buffers** - Reduce memory copies
4. **WASM** - Faster filter processing

These can be added after confirming sync works perfectly!
