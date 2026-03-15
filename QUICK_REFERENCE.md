# 🚀 SyncFrame v3.0 Quick Reference

## Keyboard Shortcuts (Recommended)

| Action | Windows | Mac |
|--------|---------|-----|
| Play/Pause | `Space` | `Space` |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Y` | `Cmd+Y` |
| Save Project | `Ctrl+S` | `Cmd+S` |
| Load Project | `Ctrl+O` | `Cmd+O` |
| Trim Tool | `Ctrl+T` | `Cmd+T` |
| Multi-Sync | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Meme Template | `Ctrl+Shift+M` | `Cmd+Shift+M` |
| Smart Export | `Ctrl+Shift+E` | `Cmd+Shift+E` |
| Fullscreen | `F11` / `F` | `Fn+F` |

---

## 🎯 Quick Start

### 1. Trim a Clip
```
Select clip → Properties Panel → "Smooth Trim"
→ Drag handles → Click "Apply Trim"
```

### 2. Sync Multiple Videos
```
Select clips → Properties Panel → "Multi-Video Sync"
→ Choose audio/visual/manual → Click "Auto-Sync" or set time
→ Adjust confidence if needed → "Apply"
```

### 3. Apply Template
```
Select clip(s) → Properties Panel → "Meme Template"
→ Click template → Review properties → "Apply Template"
```

### 4. Smart Export
```
Click "✨ Smart Export" button → "Analyze Project"
→ View recommendations → Click "Use AI" or customize
→ "Start Render" → Wait for completion
```

---

## 📊 Template Quick Reference

| Template | Best For | Position |
|----------|----------|----------|
| 📝 Impact Top | Headlines, Themes | Top |
| 📄 Impact Bottom | Captions, Credits | Bottom |
| 👥 Drake | Comparisons, Reactions | Side-by-side |
| 😲 Surprised | Dramatic moments | Center |
| 🏷️ Watermark | Branding, Attribution | Corner |
| 💡 Neon | Modern vibes, Hype | Center/Overlay |
| 📺 Caption | Subtitles, Explanations | Bottom |
| 💬 Dual Reaction | Two reactions | Split center |

---

## 🎬 Sync Method Quick Guide

### 🔊 Audio Sync
- **Use when**: Videos have clear audio
- **Best for**: Interviews, concerts, multi-cam
- **Confidence**: Aim for > 0.85
- **Time**: 2-5 seconds per pair

### 👁️ Visual Sync
- **Use when**: Audio not available or different
- **Best for**: Silent footage, movies, clips
- **Confidence**: Expect 0.7-0.85
- **Time**: 5-10 seconds per pair

### 🎚️ Manual Sync
- **Use when**: Auto-sync not accurate enough
- **Best for**: Precise timing, fine-tuning
- **Confidence**: 1.0 if user correct
- **Time**: Instant (you adjust)

---

## 📈 Export Quality Tiers

| Content | Resolution | Bitrate | Codec | Preset | Size/min |
|---------|-----------|---------|-------|--------|----------|
| Social Media | 720p | 2-3Mbps | H264 | Fast | 15-22MB |
| YouTube | 1080p | 6-8Mbps | H264 | Medium | 45-60MB |
| Streaming | 1080p | 4-5Mbps | H264 | Medium | 30-37MB |
| Archive | 2160p | 12-15Mbps | HEVC | Slow | 90-112MB |
| Preview | 480p | 500Kbps | H264 | Ultrafast | 3-4MB |

---

## ⚡ Performance Tips

### Faster Editing
1. Use proxy video generation for 4K
2. Close unused panels (media library, etc.)
3. Lower zoom level for timeline
4. Use hardware acceleration

### Faster Rendering
1. Use "Fast" preset (save ~30% time)
2. Lower resolution if possible
3. Reduce bitrate where acceptable
4. Enable hardware encoding (automatic)

### Better Sync
1. Start with audio (faster, more accurate)
2. Use longer clips (more data = better match)
3. Handle video with clear scene changes
4. Verify sync before rendering

### Better Export Quality
1. Use "Slow" preset for important videos
2. Match source resolution
3. Use HEVC if target supports it
4. Use Smart Export for auto-optimization

---

## 🎯 Common Workflows

### Workflow 1: Reaction Video
```
↓ Import clips
↓ Trim reaction using TrimTool
↓ Sync with source using Audio Sync
↓ Apply Surprised Reaction template
↓ Smart Export → YouTube quality
✅ Ready to upload
```

### Workflow 2: Music Video (Multi-Angle)
```
↓ Import 3 camera angles
↓ All Shots Audio Sync
↓ Assign to tracks 1, 2, 3
↓ Add Drake template for comparisons
↓ Add stickers & text as needed
↓ Smart Export → 1080p archive
✅ Final product ready
```

### Workflow 3: Tutorial Series
```
↓ Import multiple takes
↓ Trim best sections
↓ Manual sync of takes
↓ Apply consistent Caption template
↓ Smart Export (sets quality once)
↓ Save project for reuse
✅ Whole series consistent quality
```

### Workflow 4: Content Assembly
```
↓ Import clips from multiple sources
↓ Adaptive sync (audio→visual→manual)
↓ Trim highlights only
↓ Apply branded template
↓ Add transitions & effects
↓ Smart Export with AI recs
✅ Polished final video
```

---

## 🔧 Troubleshooting Tips

### Trim Tool Not Opening?
- Ensure clip selected in timeline
- Check clip duration > 0.1 seconds
- Try refresh (press F5)

### Sync Showing Low Confidence?
- Try a different method (audio→visual)
- Check clips have clear features
- Ensure clips start within ~30 seconds of each other

### Template Colors Wrong?
- Click color swatch to customize
- Use contrast checker for accessibility
- Test on mobile before exporting

### Export Too Slow?
- Use "Fast" preset instead of "Slow"
- Reduce resolution (720p instead of 1080p)
- Close background applications
- Check FFmpeg latest version

### Export File Too Large?
- Reduce bitrate (trade quality)
- Lower resolution (trade sharpness)
- Use H264 instead of HEVC
- Reduce duration (cut scenes)

---

## 🎨 Pro Tips

### Trim Tips
- Hold Shift while dragging for 1-frame precision
- Dragging past handles reverses trim points
- Applied fade is 300ms (customizable in code)
- Trim is non-destructive (undo via Ctrl+Z)

### Sync Tips
- Audio sync takes longest but most accurate
- Visual sync works on any content
- Manual sync is fastest for already-aligned clips
- Chain syncs together: sync A+B, then B+C

### Template Tips
- Apply templates before other effects
- Customize colors to match brand
- Preview on mobile size before export
- Save screenshots of custom templates

### Export Tips
- Always "Analyze Project" first
- Use "AI Recommendations" for consistency
- Save project before rendering
- Test render on sample before full video

---

## 📞 Getting Help

### Check These Resources
1. **FEATURES.md** - Full feature documentation
2. **DEVELOPER_GUIDE.md** - Technical deep dive
3. **IMPLEMENTATION_SUMMARY.md** - What was built
4. **System Engine Panel** - Error messages (top right)

### Common Issues
**"FFmpeg not found"**
- Install FFmpeg: https://ffmpeg.org/download.html
- Add to PATH environment variable
- Restart application

**"Clip won't trim"**
- Check clip has valid source
- Verify clip duration > 0.1 seconds
- Try creating new clip

**"Sync too slow"**
- Use Visual or Manual instead of Audio
- Try shorter clips (< 2 minutes)
- Check system has enough RAM

**"Export fails"**
- Check output folder is writable
- Verify FFmpeg installation
- Try lower resolution
- Check error log in System Engine

---

## 🎓 Learning Path

### Beginner (10 min)
1. Learn basic trim workflow
2. Practice on sample video
3. Try one template

### Intermediate (30 min)
1. Master all sync methods
2. Create reaction video
3. Try smart export

### Advanced (1 hour+)
1. Multi-video synchronization
2. Batch template application
3. Custom export settings
4. Workflow optimization

---

## 📱 Mobile/Tablet Support

Currently optimized for desktop:
- **Recommended**: 1920x1080 or larger
- **Minimum**: 1366x768
- **Mobile**: Limited support (basic editing only)

---

## 💾 Keyboard Shortcuts (Custom Setup)

To add custom shortcuts, modify in code:
```json
{
  "trim": "Ctrl+T",
  "sync": "Ctrl+Shift+S"
}
```
Or request in Settings panel (coming in v3.1)

---

## 🔄 Version & Updates

**Current Version**: 3.0 (v3.0)
**Release Date**: March 13, 2026
**Next Version**: 3.1 (Q2 2026)

---

## 📋 Checklist Before Rendering

- [ ] All clips trimmed to desired length
- [ ] All clips synced (if multi-clip)
- [ ] All clips have template applied
- [ ] Preview looks correct (Play button)
- [ ] Project saved (Ctrl+S)
- [ ] Render settings reviewed
- [ ] Output folder accessible
- [ ] Enough disk space (check size estimate)

---

**Last Updated**: March 13, 2026
**Quick Reference v1.0**

*For detailed info, see FEATURES.md & DEVELOPER_GUIDE.md*
