use serde::{Serialize, Deserialize};
use std::process::Command;
use tauri::command;

#[derive(Serialize, Deserialize)]
pub struct SceneDetection {
    pub timestamp: f64,
    pub confidence: f32,
    pub description: String,
}

#[derive(Serialize, Deserialize)]
pub struct Subtitle {
    pub start_time: f64,
    pub end_time: f64,
    pub text: String,
    pub language: String,
}

#[derive(Serialize, Deserialize)]
pub struct SmartExportSettings {
    pub format: String,
    pub resolution: String,
    pub bitrate: String,
    pub audio_bitrate: String,
    pub codec: String,
    pub preset: String,
}

#[command]
pub async fn detect_scenes(video_path: String) -> Result<Vec<SceneDetection>, String> {
    // Detect scene changes using FFmpeg's scenedetect filter
    let output = Command::new("ffmpeg")
        .args(&[
            "-i", &video_path,
            "-vf", "select='gt(scene\\,0.4)',showinfo",
            "-f", "null",
            "-"
        ])
        .output()
        .map_err(|e| format!("Scene detection failed: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let mut scenes = Vec::new();

    // Parse FFmpeg output for scene timestamps
    for line in stderr.lines() {
        if line.contains("Parsed_showinfo") {
            if let Some(pts) = extract_timestamp(&line) {
                scenes.push(SceneDetection {
                    timestamp: pts,
                    confidence: 0.85,
                    description: "Scene change detected".to_string(),
                });
            }
        }
    }

    Ok(scenes)
}

#[command]
pub async fn generate_subtitles(
    video_path: String,
    language: Option<String>
) -> Result<Vec<Subtitle>, String> {
    let lang = language.unwrap_or_else(|| "en".to_string());

    // Extract audio and use speech-to-text
    // This is a simplified version - in production, would use actual STT service
    let audio_output = Command::new("ffmpeg")
        .args(&[
            "-i", &video_path,
            "-f", "wav",
            "-"
        ])
        .output()
        .map_err(|e| format!("Audio extraction failed: {}", e))?;

    if !audio_output.status.success() {
        return Err("Failed to extract audio".to_string());
    }

    // Placeholder implementation - would integrate with speech-to-text service
    // For now, return a dummy subtitle structure
    let subtitle = Subtitle {
        start_time: 0.0,
        end_time: 5.0,
        text: "[Speech recognition would appear here]".to_string(),
        language: lang,
    };

    Ok(vec![subtitle])
}

#[command]
pub async fn recommend_export_settings(
    video_width: u32,
    video_height: u32,
    fps: f32,
    duration: f64,
) -> Result<SmartExportSettings, String> {
    // Analyze media properties and recommend optimal export settings
    let (resolution, codec, preset, bitrate) = analyze_and_recommend(video_width, video_height, fps, duration);

    Ok(SmartExportSettings {
        format: "mp4".to_string(),
        resolution,
        bitrate,
        audio_bitrate: determine_audio_bitrate(video_width, video_height),
        codec,
        preset,
    })
}

#[command]
pub async fn proxy_video(
    video_path: String,
    output_path: String,
    scale: Option<String>,
) -> Result<String, String> {
    let scale_filter = scale.unwrap_or_else(|| "640:360".to_string());

    let status = Command::new("ffmpeg")
        .args(&[
            "-i", &video_path,
            "-vf", &format!("scale={}", scale_filter),
            "-c:v", "h264",
            "-preset", "ultrafast",
            "-b:v", "2m",
            "-c:a", "aac",
            "-b:a", "128k",
            &output_path
        ])
        .status()
        .map_err(|e| format!("Proxy generation failed: {}", e))?;

    if status.success() {
        Ok(format!("Proxy created at: {}", output_path))
    } else {
        Err("Proxy generation failed".to_string())
    }
}

#[command]
pub async fn analyze_video_quality(video_path: String) -> Result<QualityAnalysis, String> {
    let output = Command::new("ffprobe")
        .args(&[
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,duration",
            "-of", "default=noprint_wrappers=1",
            &video_path
        ])
        .output()
        .map_err(|e| format!("Quality analysis failed: {}", e))?;

    if !output.status.success() {
        return Err("Failed to analyze video".to_string());
    }

    let info = String::from_utf8_lossy(&output.stdout);
    let quality = parse_quality_info(&info)?;

    Ok(quality)
}

#[derive(Serialize)]
pub struct QualityAnalysis {
    pub resolution: String,
    pub framerate: f32,
    pub duration: f64,
    pub quality_score: f32,
    pub optimization_suggestions: Vec<String>,
}

fn analyze_and_recommend(
    width: u32,
    height: u32,
    fps: f32,
    duration: f64,
) -> (String, String, String, String) {
    let _ = duration; // duration is currently unused but kept in API contract
    let pixel_count = width as f64 * height as f64;
    let bitrate_base = pixel_count * fps as f64 / 1_000_000.0;

    let (resolution, codec, preset) = if width <= 480 {
        ("480p".to_string(), "h264".to_string(), "fast".to_string())
    } else if width <= 720 {
        ("720p".to_string(), "h264".to_string(), "medium".to_string())
    } else if width <= 1080 {
        ("1080p".to_string(), "h264".to_string(), "slow".to_string())
    } else {
        ("2160p".to_string(), "hevc".to_string(), "medium".to_string())
    };

    let bitrate = format!("{}m", (bitrate_base * 1.5).ceil());

    (resolution, codec, preset, bitrate)
}

fn determine_audio_bitrate(width: u32, _height: u32) -> String {
    if width <= 480 {
        "96k".to_string()
    } else if width <= 720 {
        "128k".to_string()
    } else if width <= 1080 {
        "192k".to_string()
    } else {
        "256k".to_string()
    }
}

fn extract_timestamp(line: &str) -> Option<f64> {
    // Parse FFmpeg timestamp format: pts=XXXX
    if let Some(pts_part) = line.split("pts=").nth(1) {
        if let Some(pts_str) = pts_part.split(' ').next() {
            return pts_str.parse::<f64>().ok();
        }
    }
    None
}

fn parse_quality_info(info: &str) -> Result<QualityAnalysis, String> {
    let mut resolution = "Unknown".to_string();
    let mut framerate = 30.0;
    let mut duration = 0.0;

    for line in info.lines() {
        if line.starts_with("width=") {
            if let Some(w) = line.split('=').nth(1).and_then(|s| s.parse::<u32>().ok()) {
                resolution = format!("{}p ({}x)", w, w);
            }
        } else if line.starts_with("r_frame_rate=") {
            if let Some(rate_str) = line.split('=').nth(1) {
                if let Some(rate_parts) = rate_str.split('/').next() {
                    if let Ok(rate) = rate_parts.parse::<f32>() {
                        framerate = rate;
                    }
                }
            }
        } else if line.starts_with("duration=") {
            if let Some(dur_str) = line.split('=').nth(1) {
                duration = dur_str.parse::<f64>().unwrap_or(0.0);
            }
        }
    }

    let quality_score = (640.0 / 1920.0) * (30.0 / framerate.max(1.0)) * 100.0;

    Ok(QualityAnalysis {
        resolution,
        framerate,
        duration,
        quality_score: quality_score.min(100.0),
        optimization_suggestions: vec![
            "Consider using hardware acceleration for faster rendering".to_string(),
            "Enable proxy editing for smoother timeline playback".to_string(),
        ],
    })
}
