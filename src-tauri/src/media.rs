use serde::Serialize;
use std::process::Command;
use tauri::command;

#[derive(Serialize)]
pub struct MediaMetadata {
    pub duration: f64,
    pub format: String,
    pub resolution: String,
}

#[command]
pub async fn get_media_metadata(path: String) -> Result<MediaMetadata, String> {
    println!("Backend: Metadata request for: {}", path);
    
    let possible_paths = vec![
        "src-tauri/bin/ffprobe.exe",
        "bin/ffprobe.exe",
        "../src-tauri/bin/ffprobe.exe",
    ];

    let mut cmd = "ffprobe".to_string();
    for p in possible_paths {
        if let Ok(path) = std::env::current_dir().map(|d| d.join(p)) {
             if path.exists() {
                 cmd = path.to_string_lossy().to_string();
                 break;
             }
        }
    }

    let output = Command::new(cmd)
        .args(&["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", &path])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let duration_str = String::from_utf8_lossy(&o.stdout);
            let duration = duration_str.trim().parse::<f64>().unwrap_or(0.0);
            
            let is_audio = path.ends_with(".mp3") || path.ends_with(".wav") || path.ends_with(".aac");
            let is_image = path.ends_with(".png") || path.ends_with(".jpg") || path.ends_with(".jpeg") || path.ends_with(".webp") || path.ends_with(".gif") || path.ends_with(".svg");

            Ok(MediaMetadata {
                duration,
                format: if is_image { "image" } else if is_audio { "audio" } else { "video" }.to_string(), 
                resolution: if is_audio { "N/A" } else { "1920x1080" }.to_string(),
            })
        },
        _ => {
            println!("FFmpeg not found or failed. Returning default metadata.");
            let is_audio = path.ends_with(".mp3") || path.ends_with(".wav") || path.ends_with(".aac");
            let is_image = path.ends_with(".png") || path.ends_with(".jpg") || path.ends_with(".jpeg") || path.ends_with(".webp") || path.ends_with(".gif") || path.ends_with(".svg");
            
            Ok(MediaMetadata {
                duration: if is_image { 5.0 } else { 10.0 },
                format: if is_image { "image" } else if is_audio { "audio" } else { "video" }.to_string(),
                resolution: "unknown".to_string(),
            })
        }
    }
}
