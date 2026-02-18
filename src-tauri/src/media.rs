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
    // Basic implementation using ffprobe (if available) or fallback to file size/dummy
    // In a real app, we'd use 'ffprobe' or a crate. For now, let's try to run ffprobe.
    // If ffprobe is missing, we return a safe default so the app doesn't crash.
    
    // Check for local ffprobe in src-tauri/bin (or adjacent to exe in release)
    // We check multiple possible locations because CWD can vary (root vs src-tauri)
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

            Ok(MediaMetadata {
                duration,
                format: if is_audio { "audio" } else { "video" }.to_string(), 
                resolution: if is_audio { "N/A" } else { "1920x1080" }.to_string(), // Would need another probe call
            })
        },
        _ => {
            // Fallback if FFmpeg is not installed
            println!("FFmpeg not found or failed. Returning default metadata.");
            let is_audio = path.ends_with(".mp3") || path.ends_with(".wav") || path.ends_with(".aac");
            
            Ok(MediaMetadata {
                duration: 10.0, // Default 10s
                format: if is_audio { "audio" } else { "video" }.to_string(),
                resolution: "unknown".to_string(),
            })
        }
    }
}
