# SyncFrame v3.0 - Developer Integration Guide

## Architecture Overview

### Frontend Components (React/TypeScript)

#### New Components
```
src/components/
├── TrimTool.tsx          # Smooth trimming interface with drag handles
├── MultiVideoSync.tsx    # Multi-clip synchronization UI
├── MemeTemplate.tsx      # Template selection and application
└── SmartRender.tsx       # Intelligent export with AI recommendations
```

#### Enhanced Components
```
src/components/
├── PropertiesPanel.tsx   # Updated with new tool buttons
└── App.tsx               # Smart Export button in header
```

#### Store Updates
```
src/store/
└── useTimelineStore.ts   # New trim, sync, and template methods
```

### Backend Modules (Rust/Tauri)

#### New Modules
```
src-tauri/src/
├── smart_features.rs     # Scene detection, recommendations, quality analysis
└── audio_sync.rs         # Enhanced (previously basic, now multi-method)
```

#### Updated Modules
```
src-tauri/src/
├── lib.rs               # New command handlers registered
├── media.rs             # Enhanced metadata extraction
└── render.rs            # Improved with smart presets
```

---

## State Management Updates

### Zustand Store Additions

```typescript
// New Clip properties
interface Clip {
  trimStart?: number;      // Start trim point (seconds)
  trimEnd?: number;        // End trim point (seconds)
  isSynced?: boolean;      // Sync flag
  syncOffset?: number;     // Offset applied during sync
  memeTemplate?: string;   // Template ID applied
}

// New Actions
trimClip(id: string, start: number, end: number) -> void
syncClips(clipIds: string[], referenceTime: number) -> void
applyMemeTemplate(clipIds: string[], template: string) -> void
```

---

## API Commands (Frontend → Backend)

### Smart Features API

#### Scene Detection
```rust
#[command]
pub async fn detect_scenes(video_path: String) -> Result<Vec<SceneDetection>, String>

// Response
SceneDetection {
    timestamp: f64,
    confidence: f32,
    description: String
}
```

#### Subtitle Generation
```rust
#[command]
pub async fn generate_subtitles(
    video_path: String,
    language: Option<String>
) -> Result<Vec<Subtitle>, String>
```

#### Export Recommendations
```rust
#[command]
pub async fn recommend_export_settings(
    video_width: u32,
    video_height: u32,
    fps: f32,
    duration: f64,
) -> Result<SmartExportSettings, String>
```

#### Quality Analysis
```rust
#[command]
pub async fn analyze_video_quality(video_path: String) 
    -> Result<QualityAnalysis, String>
```

#### Proxy Generation
```rust
#[command]
pub async fn proxy_video(
    video_path: String,
    output_path: String,
    scale: Option<String>,
) -> Result<String, String>
```

### Enhanced Sync API

#### Multi-Method Audio/Visual Sync
```rust
#[command]
pub async fn auto_align_clips(
    paths: Vec<String>,
    method: Option<String>  // "audio" | "visual" | "manual"
) -> Result<Vec<SyncInfo>, String>

// Response
SyncInfo {
    clip_index: usize,
    offset_seconds: f64,
    confidence: f32
}
```

---

## Component Integration Points

### PropertiesPanel Integration

The PropertiesPanel now acts as a command center for advanced tools:

```tsx
// Advanced Tools Section (in PropertiesPanel)
<button onClick={() => setShowTrimTool(true)}>
  <Scissors /> Smooth Trim
</button>

<button onClick={() => setShowSyncTool(true)}>
  <Link2 /> Multi-Video Sync
</button>

<button onClick={() => setShowMemeTemplate(true)}>
  <Smile /> Meme Template
</button>
```

### App Header Integration

Smart Export button added to main header:

```tsx
<motion.button
  onClick={() => setIsSmartRenderOpen(true)}
  className="bg-gradient-to-r from-blue-500 to-cyan-500"
>
  ✨ Smart Export
</motion.button>
```

---

## Data Flow Examples

### Trim Tool Flow
```
User → Selection → Properties Panel
  → TrimTool Modal (visual adjustment)
  → trimClip(id, start, end)
  → updateClip(id, { duration, mediaOffset })
  → Store persisted
```

### Multi-Sync Flow
```
User → Selection → Properties Panel
  → MultiVideoSync Modal
  → Choose method (audio/visual/manual)
  → Backend: auto_align_clips(paths, method)
  → UI displays confidence scores
  → User adjusts offsets
  → syncClips(ids[], referenceTime)
  → Store updated
```

### Smart Export Flow
```
User → "Smart Export" button
  → SmartRender Modal (step: analyze)
  → Backend: analyze_video_quality(path)
  → Display recommendations
  → (step: settings) User adjusts or auto-recommends
  → (step: rendering) start_render(config)
  → Progress display & completion
```

---

## Algorithm Details

### Audio Sync Correlation
```rust
fn correlate_audio(ref_data: &[u8], target_data: &[u8]) -> f64 {
    // 1. Convert byte buffers to f32 samples
    // 2. Search 10-second window with 100ms step
    // 3. Calculate cross-correlation at each offset
    // 4. Return offset with max correlation
    // 5. Confidence = energy ratio similarity
}
```

### Visual Sync Scene Detection
```rust
fn detect_scene_offset(ref_frames: &[u8], target_frames: &[u8]) -> f64 {
    // 1. Hash frame data for quick comparison
    // 2. Calculate rolling hash similarity
    // 3. Detect scene changes via frame differences
    // 4. Return matching scene offset
    // 5. Confidence based on hash match rate
}
```

### Smart Export Decision
```rust
fn analyze_and_recommend(width, height, fps, duration) {
    // 1. Calculate pixel count and bitrate base
    // 2. Determine resolution tier (480p/720p/1080p/2160p)
    // 3. Select codec (H.264 for lower, HEVC for higher)
    // 4. Choose preset (fast/medium/slow)
    // 5. Calculate bitrate = pixel_count * fps / 1M * 1.5x
}
```

---

## Performance Considerations

### Memory Usage
- **TrimTool**: ~2MB (preview buffer)
- **MultiVideoSync**: ~50MB per video analyzed
- **SmartRender**: ~30MB for analysis
- **MemeTemplate**: ~0.5MB (lightweight)

### Processing Time
- Audio sync: 2-5 seconds per clip pair
- Visual sync: 5-10 seconds per pair
- Quality analysis: 1-2 seconds
- Proxy generation: 10-30 seconds (depends on resolution)

### Optimization Tips
1. Use proxy video for 4K+ content
2. Enable hardware acceleration in system capabilities
3. Batch process similar clips together
4. Cache sync results for repeated operations

---

## Testing Guide

### Unit Tests to Add

```typescript
// TrimTool.test.tsx
describe('TrimTool', () => {
  test('should set correct trimStart and trimEnd', () => {
    // Mock useTimelineStore
    // Render TrimTool
    // Simulate drag handles
    // Verify trimClip called with correct params
  });
});

// MultiVideoSync.test.tsx
describe('MultiVideoSync', () => {
  test('should handle audio sync method', async () => {
    // Mock invoke for auto_align_clips
    // Select audio method
    // Verify correct parameters passed
    // Check result display
  });
});

// SmartRender.test.tsx
describe('SmartRender', () => {
  test('should analyze video quality', async () => {
    // Mock analyze_video_quality
    // Step through workflow
    // Verify settings recommendations
  });
});
```

### Integration Tests

```typescript
// E2E: Complete workflow
describe('SyncFrame E2E', () => {
  test('full workflow: trim → sync → template → export', () => {
    // Import clips
    // Trim using TrimTool
    // Sync clips using MultiVideoSync
    // Apply MemeTemplate
    // Export using SmartRender
    // Verify output quality
  });
});
```

---

## Deployment Checklist

- [ ] Verify all tests pass
- [ ] Check Rust compilation warnings
- [ ] Test FFmpeg integration
- [ ] Verify WASM module loading
- [ ] Check Tauri command registration
- [ ] Test on Windows/Mac/Linux
- [ ] Validate keyboard shortcuts
- [ ] Test with large files (4K+)
- [ ] Verify error handling
- [ ] Check performance profiling

---

## Future Enhancement Ideas

### Short-term (V3.1)
- [ ] Custom template creation UI
- [ ] Keyboard shortcuts for tools
- [ ] Batch operations support
- [ ] Preview quality rendering

### Medium-term (V3.2+)
- [ ] ML-based auto-trimming (detect interesting scenes)
- [ ] Real-time subtitle generation (WebRTC)
- [ ] GPU-accelerated sync analysis
- [ ] Cloud rendering support
- [ ] Custom effect templates

### Long-term (V4.0)
- [ ] Plugin system for effects
- [ ] Collaborative editing
- [ ] AI-powered scene recommendations
- [ ] automatic story assembly
- [ ] Real-time collaborative sync

---

## Code Style & Conventions

### TypeScript/React
```typescript
// Component naming
export const ComponentName = ({ prop1, prop2 }: Props) => {
  const [state, setState] = useState(default);
  
  // Handler naming
  const handleAction = () => { ... };
  
  // Always use AnimatePresence for modal dialogs
};
```

### Rust
```rust
// Command naming
#[command]
pub async fn function_name(param: Type) -> Result<Output, String> {
    // Descriptive error messages
    Err(format!("Operation failed: {}", error))
}
```

---

## Documentation Standards

All new features should include:
1. JSDoc comments for functions
2. Inline comments for complex logic
3. README section in FEATURES.md
4. Usage examples
5. API documentation
6. Error handling documentation

---

**Last Updated**: March 2026
**Version**: SyncFrame 3.0
**Maintainer**: Development Team
