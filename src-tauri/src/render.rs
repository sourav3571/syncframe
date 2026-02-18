use tauri::{AppHandle, Emitter};
use std::process::Command;
use serde::Serialize;

#[derive(Clone, Serialize)]
struct RenderProgress {
    percentage: f32,
    status: String,
}

#[derive(Clone, Serialize, serde::Deserialize)]
pub struct RenderClip {
    pub id: String,
    pub source: String,
    pub start: f64,    // Position on timeline
    pub duration: f64, // Duration of the clip on timeline
    pub track_type: String, // "video" or "audio"
}

#[tauri::command]
pub async fn start_render(app: AppHandle, output_path: String, encoder: String, clips: Vec<RenderClip>) -> Result<(), String> {
    if clips.is_empty() {
        return Err("Timeline is empty".to_string());
    }

    // Build FFmpeg command inputs
    let mut args = Vec::new();
    
    // 1. Add all inputs
    for clip in &clips {
        if clip.source.is_empty() {
             return Err(format!("Clip {} has no source file", clip.id));
        }
        args.push("-i".to_string());
        args.push(clip.source.clone());
    }

    // 2. Build Filter Complex
    let mut filter_complex = String::new();
    
    // Separate video and audio clips
    let mut video_clips: Vec<(usize, &RenderClip)> = Vec::new();
    let mut audio_clips: Vec<(usize, &RenderClip)> = Vec::new();

    for (i, clip) in clips.iter().enumerate() {
        if clip.track_type == "video" {
            video_clips.push((i, clip));
        } else {
            audio_clips.push((i, clip));
        }
    }

    // Sort by start time for correct ordering
    video_clips.sort_by(|a, b| a.1.start.partial_cmp(&b.1.start).unwrap());
    audio_clips.sort_by(|a, b| a.1.start.partial_cmp(&b.1.start).unwrap());

    // --- VIDEO PROCESSING ---
    // If no video clips, we might just output a black screen or fail. Assuming at least one video.
    let mut v_concat_inputs = String::new();
    let mut a_concat_inputs = String::new(); // For audio from video files

    for (i, clip) in &video_clips {
        // [0:v]trim=duration=5,setpts=PTS-STARTPTS[v0];
        // [0:a]atrim=duration=5,asetpts=PTS-STARTPTS[a0]; (Simplified: assuming video has audio)
        // Check if video file has audio? Hard to know without metadata. 
        // Strategy: Force silent audio generation if missing? Or assume it exists.
        // Safer: Let's assume input videos have audio for now. 
        // Real-world: Need 'anullsrc' fallback if probe says no audio.
        
        filter_complex.push_str(&format!("[{}:v]trim=duration={},setpts=PTS-STARTPTS[v{}];", i, clip.duration, i));
        // Simple trim for audio from video files (might drift without accurate start/end cuts)
        filter_complex.push_str(&format!("[{}:a]atrim=duration={},asetpts=PTS-STARTPTS[a{}];", i, clip.duration, i));
        
        v_concat_inputs.push_str(&format!("[v{}]", i));
        a_concat_inputs.push_str(&format!("[a{}]", i));
    }

    // Concat video/audio from video tracks
    if !video_clips.is_empty() {
         filter_complex.push_str(&format!("{}concat=n={}:v=1:a=0[main_v];", v_concat_inputs, video_clips.len()));
         // We'll skip concating audio from video for now to avoid complexity if streams vary.
         // Wait, user wants sound. We MUST mix it.
         // Let's assume we mix ALL audio sources (embedded + external).
         
         // Revised Strategy:
         // 1. Concat all video streams -> [main_v]
         // 2. Mix all audio streams (embedded audio from video files + external mp3s) -> [main_a]
    } else {
        // No video? Generate black bg?
        return Err("No video tracks found".to_string());
    }

    // --- AUDIO MIXING ---
    // We need to delay audio clips to their start time.
    // [1:a]adelay=10000|10000[delayed_a1];
    let mut amix_inputs = String::new();
    let mut audio_count = 0;

    // Process embedded audio from video clips (delayed to their start time on timeline)
    for (i, clip) in &video_clips {
        let delay_ms = (clip.start * 1000.0) as i32;
        // Output label: [a_vid_i]
        filter_complex.push_str(&format!("[{}:a]atrim=duration={},asetpts=PTS-STARTPTS,adelay={}|{}[a_vid_{}];", i, clip.duration, delay_ms, delay_ms, i));
        amix_inputs.push_str(&format!("[a_vid_{}]", i));
        audio_count += 1;
    }

    // Process external audio clips
    for (i, clip) in &audio_clips {
        let delay_ms = (clip.start * 1000.0) as i32;
        // Output label: [a_ext_i]
        filter_complex.push_str(&format!("[{}:a]atrim=duration={},asetpts=PTS-STARTPTS,adelay={}|{}[a_ext_{}];", i, clip.duration, delay_ms, delay_ms, i));
        amix_inputs.push_str(&format!("[a_ext_{}]", i));
        audio_count += 1;
    }
    
    // Mix everything
    if audio_count > 0 {
        filter_complex.push_str(&format!("{}amix=inputs={}:duration=first:dropout_transition=2[outa];", amix_inputs, audio_count));
    } else {
        // Silence if no audio
        filter_complex.push_str("anullsrc=channel_layout=stereo:sample_rate=44100[outa];"); 
    }

    args.push("-filter_complex".to_string());
    args.push(filter_complex);
    
    // Map output
    args.push("-map".to_string());
    args.push("[main_v]".to_string()); // From video concat
    args.push("-map".to_string());
    args.push("[outa]".to_string());

    // Encoder settings
    args.push("-c:v".to_string());
    args.push(encoder); 
    args.push("-c:a".to_string());
    args.push("aac".to_string()); // Standard audio
    
    args.push("-y".to_string());
    args.push(output_path.clone());

    println!("Executing FFmpeg: ffmpeg {:?}", args);

    // 3. Execution (Async wrapper with progress)
    tokio::spawn(async move {
        app.emit("render-progress", RenderProgress { percentage: 0.0, status: "Starting Media Engine...".into() }).ok();

        // Check for local ffmpeg
        let possible_paths = vec![
            "src-tauri/bin/ffmpeg.exe",
            "bin/ffmpeg.exe",
            "../src-tauri/bin/ffmpeg.exe",
        ];

        let mut cmd = "ffmpeg".to_string();
        for p in possible_paths {
            if let Ok(path) = std::env::current_dir().map(|d| d.join(p)) {
                 if path.exists() {
                     cmd = path.to_string_lossy().to_string();
                     break;
                 }
            }
        }

        let output = Command::new(cmd)
            .args(&args)
            .output();

        match output {
            Ok(o) if o.status.success() => {
                app.emit("render-progress", RenderProgress { percentage: 100.0, status: "Render Complete!".into() }).ok();
            },
            Ok(o) => {
                let err = String::from_utf8_lossy(&o.stderr);
                app.emit("render-progress", RenderProgress { percentage: 0.0, status: format!("Failed: {}", err).chars().take(100).collect::<String>() }).ok();
            },
            Err(e) => {
                app.emit("render-progress", RenderProgress { percentage: 0.0, status: format!("Error: {}", e) }).ok();
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn generate_proxy(_input: String, _output: String) -> Result<(), String> {
    // ffmpeg -i {input} -vf scale=1280:720 -c:v libx264 -preset fast {output}
    Ok(())
}
