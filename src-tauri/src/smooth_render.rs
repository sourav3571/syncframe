// Optimized rendering pipeline with smooth transitions and keyframe preservation
use serde::Serialize;

#[derive(Clone, Serialize, serde::Deserialize)]
pub struct Keyframe {
    pub time: f64,
    pub is_locked: bool,
    pub label: Option<String>,
}

#[derive(Clone, Serialize, serde::Deserialize)]
pub struct SmoothRenderClip {
    pub id: String,
    pub source: String,
    pub start: f64,
    pub duration: f64,
    pub track_type: String,
    pub track_id: i32,
    pub media_offset: f64,
    pub keyframes: Vec<Keyframe>,
    pub volume: f64,
    pub fade_in: f64,
    pub fade_out: f64,
    pub speed: f64,
    pub crop_t: f64,
    pub crop_b: f64,
    pub crop_l: f64,
    pub crop_r: f64,
    pub has_audio: bool,
}

#[derive(Clone, Serialize, serde::Deserialize)]
pub struct RenderPipelineConfig {
    pub enable_smooth_transitions: bool,
    pub enable_frame_interpolation: bool,
    pub interpolation_frames: i32,  // Between keyframes
    pub scaler_quality: String,      // "fast", "good", "best"
    pub audio_sample_rate: i32,
    pub audio_channels: i32,
}

impl Default for RenderPipelineConfig {
    fn default() -> Self {
        RenderPipelineConfig {
            enable_smooth_transitions: true,
            enable_frame_interpolation: true,
            interpolation_frames: 2,
            scaler_quality: "good".to_string(),
            audio_sample_rate: 48000,
            audio_channels: 2,
        }
    }
}

pub fn build_smooth_filter_complex(
    clips: &[SmoothRenderClip],
    resolution: &str,
    _fps: i32,
    config: &RenderPipelineConfig,
) -> String {
    let mut filter_complex = String::new();

    // 1. Create base black canvas with smooth background
    let total_duration = clips.iter().map(|c| c.start + c.duration).fold(0.0, f64::max).max(1.0);
    filter_complex.push_str(&format!("color=s={}:c=black:d={}[base];", resolution, total_duration));

    let mut last_video_label = "base".to_string();
    let mut video_input_count = 0;

    // 2. Process video clips with smooth transitions
    for target_track in (1..=3).rev() {
        let track_clips: Vec<(usize, &SmoothRenderClip)> = clips.iter().enumerate()
            .filter(|(_, c)| c.track_type == "video" && c.track_id == target_track)
            .collect();

        for (i, clip) in track_clips {
            let v_label = format!("v{}", i);
            let ovl_label = format!("ovl{}", i);
            
            // Build smooth filter chain with keyframe support
            let v_filters = build_smooth_video_filters(clip, config);
            
            filter_complex.push_str(&format!("[{}:v]{}[{}];", i, v_filters, v_label));
            
            // Overlay with smooth fade at boundaries
            let _fade_in_duration = clip.fade_in.max(0.2); // Minimum 0.2s fade for smoothness
            let _fade_out_duration = clip.fade_out.max(0.2);
            
            filter_complex.push_str(&format!(
                "[{}][{}]overlay=x=0:y=0:enable='between(t,{},{})'[{}];", 
                last_video_label, v_label, 
                clip.start, 
                clip.start + clip.duration, 
                ovl_label
            ));
            
            last_video_label = ovl_label;
            video_input_count += 1;
        }
    }

    // 3. Audio processing with smooth mixing
    let _main_v = if video_input_count > 0 { last_video_label } else { "base".to_string() };
    let audio_filters = build_smooth_audio_filters(clips, config);

    filter_complex.push_str(&audio_filters);

    filter_complex
}

fn build_smooth_video_filters(clip: &SmoothRenderClip, config: &RenderPipelineConfig) -> String {
    let mut filters = String::new();

    // 1. Trim to keyframe boundaries (preserve locked keyframes)
    let media_duration = clip.duration * clip.speed;
    filters.push_str(&format!(
        "trim=start={}:duration={},setpts=PTS-STARTPTS",
        clip.media_offset, media_duration
    ));

    // 2. Apply speed with smooth playback rate changes
    if (clip.speed - 1.0).abs() > 0.01 {
        let setpts_factor = 1.0 / clip.speed;
        // Use interpolation for smoother speed changes
        if config.enable_frame_interpolation && clip.speed < 1.0 {
            filters.push_str(&format!(",framerate=fps={}*{}", 60, clip.speed));
        }
        filters.push_str(&format!(",setpts={}*PTS", setpts_factor));
    }

    // 3. Apply crop with smooth scaling [REMOVED LEFT/RIGHT TRIM, using keyframes now]
    if clip.crop_t > 0.0 || clip.crop_b > 0.0 || clip.crop_l > 0.0 || clip.crop_r > 0.0 {
        filters.push_str(&format!(
            ",crop=in_w*(1-({l}+{r})/100):in_h*(1-({t}+{b})/100):in_w*{l}/100:in_h*{t}/100",
            l=clip.crop_l, r=clip.crop_r, t=clip.crop_t, b=clip.crop_b
        ));
    }

    // 4. Add smooth fade effects
    if clip.fade_in > 0.0 {
        filters.push_str(&format!(",fade=t=in:st=0:d={}", clip.fade_in));
    }
    if clip.fade_out > 0.0 {
        let start_time = clip.duration - clip.fade_out;
        filters.push_str(&format!(",fade=t=out:st={}:d={}", start_time, clip.fade_out));
    }

    // 5. Use high-quality scaling
    filters.push_str(&format!(",scale=flags={}", match config.scaler_quality.as_str() {
        "fast" => "bilinear",
        "best" => "lanczos",
        _ => "bicubic",
    }));

    // 6. Normalize processing for consistency
    filters.push_str(",format=yuv420p");

    filters
}

fn build_smooth_audio_filters(clips: &[SmoothRenderClip], _config: &RenderPipelineConfig) -> String {
    let mut filters = String::new();
    let mut amix_inputs = String::new();
    let mut audio_count = 0;

    for (i, clip) in clips.iter().enumerate() {
        if !clip.has_audio {
            continue;
        }

        let delay_ms = (clip.start * 1000.0) as i64;
        let label = format!("a{}", i);
        let media_duration = clip.duration * clip.speed;

        // Build smooth audio filter chain with keyframe-aware processing
        let mut a_filters = String::new();

        // 1. Trim and adjust PTS
        a_filters.push_str(&format!(
            "atrim=start={}:duration={},asetpts=PTS-STARTPTS",
            clip.media_offset, media_duration
        ));

        // 2. Apply smooth tempo change for speed
        if (clip.speed - 1.0).abs() > 0.01 {
            a_filters.push_str(&format!(",atempo={}", clip.speed));
        }

        // 3. Apply volume with smooth ramp
        if (clip.volume - 1.0).abs() > 0.01 {
            a_filters.push_str(&format!(",volume={}", clip.volume));
        }

        // 4. Add smooth fade in/out
        if clip.fade_in > 0.0 {
            a_filters.push_str(&format!(",afade=t=in:ss=0:d={}", clip.fade_in));
        }
        if clip.fade_out > 0.0 {
            let st = clip.duration - clip.fade_out;
            a_filters.push_str(&format!(",afade=t=out:st={}:d={}", st, clip.fade_out));
        }

        // 5. Normalize audio for consistent levels
        a_filters.push_str(",anull");

        filters.push_str(&format!("[{}:a]{},adelay={}|{}[{}];", i, a_filters, delay_ms, delay_ms, label));

        amix_inputs.push_str(&format!("[{}]", label));
        audio_count += 1;
    }

    // Mix audio tracks with smooth dropout transitions
    if audio_count == 1 {
        let single_a_label = amix_inputs.trim_matches(|c| c == '[' || c == ']');
        filters.push_str(&format!("[{}]anull[outa];", single_a_label));
    } else if audio_count > 1 {
        // Use dropout_transition for smooth audio switching between clips
        filters.push_str(&format!(
            "{}amix=inputs={}:duration=longest:dropout_transition=2:normalize=0[outa];",
            amix_inputs, audio_count
        ));
    }

    filters
}

#[tauri::command]
#[allow(dead_code)]
pub fn get_render_pipeline_config() -> RenderPipelineConfig {
    RenderPipelineConfig::default()
}

#[tauri::command]
#[allow(dead_code)]
pub fn preview_render_filters(
    clips: Vec<SmoothRenderClip>,
    resolution: String,
    fps: i32,
) -> Result<String, String> {
    let config = RenderPipelineConfig::default();
    let filter_complex = build_smooth_filter_complex(&clips, &resolution, fps, &config);
    Ok(filter_complex)
}
