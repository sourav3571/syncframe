use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;
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
    pub media_offset: f64,
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

#[tauri::command]
pub async fn start_render(app: AppHandle, output_path: String, encoder: String, resolution: String, fps: i32, clips: Vec<RenderClip>) -> Result<(), String> {
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
    
    // 1. Create base black canvas
    let total_duration = clips.iter().map(|c| c.start + c.duration).fold(0.0, f64::max).max(1.0);
    filter_complex.push_str(&format!("color=s={}:c=black:d={}[base];", resolution, total_duration));

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
            let media_duration = clip.duration * clip.speed;
            let mut v_filters = format!("trim=start={}:duration={},setpts=PTS-STARTPTS", clip.media_offset, media_duration);
            
            if (clip.speed - 1.0).abs() > 0.01 {
                let setpts_factor = 1.0 / clip.speed;
                v_filters.push_str(&format!(",setpts={}*PTS", setpts_factor));
            }

            if clip.crop_t > 0.0 || clip.crop_b > 0.0 || clip.crop_l > 0.0 || clip.crop_r > 0.0 {
                v_filters.push_str(&format!(",crop=in_w*(1-({l}+{r})/100):in_h*(1-({t}+{b})/100):in_w*{l}/100:in_h*{t}/100",
                    l=clip.crop_l, r=clip.crop_r, t=clip.crop_t, b=clip.crop_b));
            }
            
            filter_complex.push_str(&format!("[{}:v]{}[{}];", i, v_filters, v_label));
            
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
        if !clip.has_audio {
            continue;
        }
        
        let delay_ms = (clip.start * 1000.0) as i64;
        let label = if clip.track_type == "video" { format!("a_vid_{}", i) } else { format!("a_ext_{}", i) };
        let media_duration = clip.duration * clip.speed;
        
        let mut a_filters = format!("atrim=start={}:duration={},asetpts=PTS-STARTPTS", clip.media_offset, media_duration);
        
        if (clip.speed - 1.0).abs() > 0.01 {
            a_filters.push_str(&format!(",atempo={}", clip.speed));
        }
        
        if (clip.volume - 1.0).abs() > 0.01 {
            a_filters.push_str(&format!(",volume={}", clip.volume));
        }
        if clip.fade_in > 0.0 {
            a_filters.push_str(&format!(",afade=t=in:ss=0:d={}", clip.fade_in));
        }
        if clip.fade_out > 0.0 {
            let st = clip.duration - clip.fade_out;
            a_filters.push_str(&format!(",afade=t=out:st={}:d={}", st, clip.fade_out));
        }
        
        filter_complex.push_str(&format!("[{}:a]{},adelay={}|{}[{}];", i, a_filters, delay_ms, delay_ms, label));
        
        amix_inputs.push_str(&format!("[{}]", label));
        audio_count += 1;
    }
    
    if audio_count == 1 {
        // If there's only 1 audio track, we don't need amix. We can just use the first scaled/trimmed input.
        let single_a_label = amix_inputs.trim_matches(|c| c == '[' || c == ']');
        filter_complex.push_str(&format!("[{}]anull[outa];", single_a_label));
        
        args.push("-filter_complex".to_string());
        args.push(filter_complex);
        
        args.push("-map".to_string());
        args.push(format!("[{}]", main_v));
        args.push("-map".to_string());
        args.push("[outa]".to_string());
    } else if audio_count > 1 {
        // Use normalize=0 so it doesn't quiet down the audio for every new track added
        filter_complex.push_str(&format!("{}amix=inputs={}:duration=longest:dropout_transition=2:normalize=0[outa];", amix_inputs, audio_count));
        
        args.push("-filter_complex".to_string());
        args.push(filter_complex);
        
        args.push("-map".to_string());
        args.push(format!("[{}]", main_v));
        args.push("-map".to_string());
        args.push("[outa]".to_string());
    } else {
        // No audio streams to process, just map video
        args.push("-filter_complex".to_string());
        args.push(filter_complex);
        
        args.push("-map".to_string());
        args.push(format!("[{}]", main_v));
    }

    args.push("-c:v".to_string());
    args.push(encoder); 
    args.push("-r".to_string());
    args.push(fps.to_string());
    
    if audio_count > 0 {
        args.push("-c:a".to_string());
        args.push("aac".to_string());
    }
    
    args.push("-shortest".to_string()); // Ensure it doesn't run forever if anullsrc is used poorly
    args.push("-y".to_string());
    args.push(output_path.clone());

    println!("Executing FFmpeg: ffmpeg {:?}", args);

    tokio::spawn(async move {
        app.emit("render-progress", RenderProgress { percentage: 0.0, status: "Starting Media Engine...".into() }).ok();

        let sidecar_command = match app.shell().sidecar("ffmpeg") {
            Ok(cmd) => cmd.args(&args),
            Err(e) => {
                app.emit("render-progress", RenderProgress { percentage: 0.0, status: format!("Sidecar Error: {}", e) }).ok();
                return;
            }
        };

        let output = sidecar_command.output();

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
pub async fn generate_proxy(app: AppHandle, input: String, output: String) -> Result<(), String> {
    println!("Generating proxy for {} -> {}", input, output);
    let mut args = Vec::new();
    args.push("-i".to_string());
    args.push(input);
    args.push("-vf".to_string());
    args.push("scale=-2:720".to_string());
    args.push("-c:v".to_string());
    args.push("libx264".to_string());
    args.push("-preset".to_string());
    args.push("ultrafast".to_string());
    args.push("-crf".to_string());
    args.push("28".to_string());
    args.push("-y".to_string());
    args.push(output);

    let sidecar_command = app.shell().sidecar("ffmpeg")
        .map_err(|e| format!("Failed to find ffmpeg sidecar: {}", e))?
        .args(&args);

    let output_res = sidecar_command.output();

    match output_res {
        Ok(o) if o.status.success() => Ok(()),
        Ok(o) => {
            let err = String::from_utf8_lossy(&o.stderr);
            Err(format!("Failed to generate proxy: {}", err))
        },
        Err(e) => Err(format!("Error running ffmpeg: {}", e))
    }
}
