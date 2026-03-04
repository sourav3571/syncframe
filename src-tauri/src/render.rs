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
    pub start: f64,
    pub duration: f64,
    pub track_type: String,
    pub track_id: i32,
}

#[tauri::command]
pub async fn start_render(app: AppHandle, output_path: String, encoder: String, clips: Vec<RenderClip>) -> Result<(), String> {
    if clips.is_empty() {
        return Err("Timeline is empty".to_string());
    }

    let mut args = Vec::new();
    
    for clip in &clips {
        if clip.source.is_empty() {
             return Err(format!("Clip {} has no source file", clip.id));
        }
        args.push("-i".to_string());
        args.push(clip.source.clone());
    }

    let mut filter_complex = String::new();
    
    // 1. Create base black canvas (assuming 10 minute max for now or calculate from clips)
    let total_duration = clips.iter().map(|c| c.start + c.duration).fold(0.0, f64::max).max(1.0);
    filter_complex.push_str(&format!("color=s=1920x1080:c=black:d={}[base];", total_duration));

    let mut last_video_label = "base".to_string();
    let mut video_input_count = 0;

    // Overlay order: Bottom to Top (Video 3, then 2, then 1)
    for target_track in (1..=3).rev() {
        let track_clips: Vec<(usize, &RenderClip)> = clips.iter().enumerate()
            .filter(|(_, c)| c.track_type == "video" && c.track_id == target_track)
            .collect();

        for (i, clip) in track_clips {
            let v_label = format!("v{}", i);
            let ovl_label = format!("ovl{}", i);
            
            // Prep the individual clip: trim and set PTS
            filter_complex.push_str(&format!("[{}:v]trim=duration={},setpts=PTS-STARTPTS[{}];", i, clip.duration, v_label));
            
            // Overlay it on the current stack at the specific start time
            filter_complex.push_str(&format!("[{}][{}]overlay=x=0:y=0:enable='between(t,{},{})'[{}];", 
                last_video_label, v_label, clip.start, clip.start + clip.duration, ovl_label));
            
            last_video_label = ovl_label;
            video_input_count += 1;
        }
    }

    // Define the final video output label
    let main_v = if video_input_count > 0 { last_video_label } else { "base".to_string() };

    // 2. Audio Processing (Mixing all tracks)
    let mut amix_inputs = String::new();
    let mut audio_count = 0;

    for (i, clip) in clips.iter().enumerate() {
        let delay_ms = (clip.start * 1000.0) as i64;
        let label = if clip.track_type == "video" { format!("a_vid_{}", i) } else { format!("a_ext_{}", i) };
        
        filter_complex.push_str(&format!("[{}:a]atrim=duration={},asetpts=PTS-STARTPTS,adelay={}|{}[{}];", 
            i, clip.duration, delay_ms, delay_ms, label));
        
        amix_inputs.push_str(&format!("[{}]", label));
        audio_count += 1;
    }
    
    if audio_count > 0 {
        filter_complex.push_str(&format!("{}amix=inputs={}:duration=longest:dropout_transition=2[outa];", amix_inputs, audio_count));
    } else {
        filter_complex.push_str("anullsrc=channel_layout=stereo:sample_rate=44100[outa];"); 
    }

    args.push("-filter_complex".to_string());
    args.push(filter_complex);
    
    args.push("-map".to_string());
    args.push(format!("[{}]", main_v));
    args.push("-map".to_string());
    args.push("[outa]".to_string());

    args.push("-c:v".to_string());
    args.push(encoder); 
    args.push("-c:a".to_string());
    args.push("aac".to_string());
    
    args.push("-shortest".to_string()); // Ensure it doesn't run forever if anullsrc is used poorly
    args.push("-y".to_string());
    args.push(output_path.clone());

    println!("Executing FFmpeg: ffmpeg {:?}", args);

    tokio::spawn(async move {
        app.emit("render-progress", RenderProgress { percentage: 0.0, status: "Starting Media Engine...".into() }).ok();

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
    Ok(())
}
