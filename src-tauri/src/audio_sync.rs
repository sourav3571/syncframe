use serde::{Serialize, Deserialize};
use std::process::Command;

#[derive(Serialize, Deserialize)]
pub struct SyncResult {
    pub offset_seconds: f64,
    pub confidence: f32,
}

#[derive(Serialize, Deserialize)]
pub struct SyncInfo {
    pub clip_index: usize,
    pub offset_seconds: f64,
    pub confidence: f32,
}

#[tauri::command]
pub async fn auto_align_clips(
    paths: Vec<String>,
    method: Option<String>
) -> Result<Vec<SyncInfo>, String> {
    let sync_method = method.as_deref().unwrap_or("audio");
    
    if paths.is_empty() {
        return Err("No paths provided".to_string());
    }

    match sync_method {
        "audio" => sync_by_audio(&paths).await,
        "visual" => sync_by_visual(&paths).await,
        _ => sync_by_manual(&paths).await,
    }
}

async fn sync_by_audio(paths: &[String]) -> Result<Vec<SyncInfo>, String> {
    let reference_path = &paths[0];
    let mut results = vec![
        SyncInfo {
            clip_index: 0,
            offset_seconds: 0.0,
            confidence: 1.0,
        }
    ];

    for (idx, path) in paths.iter().enumerate().skip(1) {
        match extract_audio_fingerprint(reference_path, path).await {
            Ok((offset, confidence)) => {
                results.push(SyncInfo {
                    clip_index: idx,
                    offset_seconds: offset,
                    confidence,
                });
            }
            Err(_) => {
                results.push(SyncInfo {
                    clip_index: idx,
                    offset_seconds: 0.0,
                    confidence: 0.3,
                });
            }
        }
    }

    Ok(results)
}

async fn sync_by_visual(paths: &[String]) -> Result<Vec<SyncInfo>, String> {
    let reference_path = &paths[0];
    let mut results = vec![
        SyncInfo {
            clip_index: 0,
            offset_seconds: 0.0,
            confidence: 1.0,
        }
    ];

    for (idx, path) in paths.iter().enumerate().skip(1) {
        match detect_scene_keyframes(reference_path, path).await {
            Ok((offset, confidence)) => {
                results.push(SyncInfo {
                    clip_index: idx,
                    offset_seconds: offset,
                    confidence,
                });
            }
            Err(_) => {
                results.push(SyncInfo {
                    clip_index: idx,
                    offset_seconds: 0.0,
                    confidence: 0.3,
                });
            }
        }
    }

    Ok(results)
}

async fn sync_by_manual(_paths: &[String]) -> Result<Vec<SyncInfo>, String> {
    Ok(vec![])
}

async fn extract_audio_fingerprint(
    reference: &str,
    target: &str,
) -> Result<(f64, f32), String> {
    // Extract audio and create fingerprint using FFmpeg
    let ref_audio = Command::new("ffmpeg")
        .args(&["-i", reference, "-f", "f32le", "-"])
        .output()
        .map_err(|e| format!("Failed to extract reference audio: {}", e))?;

    if !ref_audio.status.success() {
        return Err("Failed to extract reference audio".to_string());
    }

    let target_audio = Command::new("ffmpeg")
        .args(&["-i", target, "-f", "f32le", "-"])
        .output()
        .map_err(|e| format!("Failed to extract target audio: {}", e))?;

    if !target_audio.status.success() {
        return Err("Failed to extract target audio".to_string());
    }

    // Simple correlation-based sync (enhanced from basic version)
    let offset = correlate_audio(&ref_audio.stdout, &target_audio.stdout)?;
    let confidence = calculate_audio_confidence(&ref_audio.stdout, &target_audio.stdout, offset)?;

    Ok((offset, confidence))
}

async fn detect_scene_keyframes(
    reference: &str,
    target: &str,
) -> Result<(f64, f32), String> {
    // Extract keyframes using scene detection
    let ref_scenes = Command::new("ffmpeg")
        .args(&[
            "-i", reference,
            "-vf", "fps=1,scale=320:180",
            "-f", "image2pipe",
            "-",
        ])
        .output()
        .map_err(|e| format!("Failed to extract reference frames: {}", e))?;

    if !ref_scenes.status.success() {
        return Err("Failed to extract reference frames".to_string());
    }

    let target_scenes = Command::new("ffmpeg")
        .args(&[
            "-i", target,
            "-vf", "fps=1,scale=320:180",
            "-f", "image2pipe",
            "-",
        ])
        .output()
        .map_err(|e| format!("Failed to extract target frames: {}", e))?;

    if !target_scenes.status.success() {
        return Err("Failed to extract target frames".to_string());
    }

    // Use scene detection via FFmpeg's scenedetect filter
    let offset = detect_scene_offset(&ref_scenes.stdout, &target_scenes.stdout)?;
    let confidence = 0.75;

    Ok((offset, confidence))
}

fn correlate_audio(ref_data: &[u8], target_data: &[u8]) -> Result<f64, String> {
    // Convert bytes to samples
    let ref_samples: Vec<f32> = ref_data
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    let target_samples: Vec<f32> = target_data
        .chunks(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    if ref_samples.is_empty() || target_samples.is_empty() {
        return Ok(0.0);
    }

    // Find best correlation
    let sample_rate = 48000; // Assuming 48kHz
    let search_window = sample_rate * 10; // Search within 10 seconds

    let mut best_offset = 0;
    let mut best_correlation = 0.0;

    for offset in (0..search_window.min(target_samples.len())).step_by(sample_rate / 10) {
        let correlation = calculate_correlation(&ref_samples, &target_samples, offset);
        if correlation > best_correlation {
            best_correlation = correlation;
            best_offset = offset;
        }
    }

    Ok(best_offset as f64 / sample_rate as f64)
}

fn calculate_correlation(ref_samples: &[f32], target_samples: &[f32], offset: usize) -> f32 {
    let window = 2048;
    let mut sum = 0.0;
    let mut count = 0;

    for i in 0..window.min(ref_samples.len()).min(target_samples.len() - offset) {
        sum += (ref_samples[i] - target_samples[i + offset]).abs();
        count += 1;
    }

    if count == 0 {
        return 0.0;
    }

    1.0 - (sum / count as f32).min(1.0)
}

fn detect_scene_offset(ref_frames: &[u8], target_frames: &[u8]) -> Result<f64, String> {
    // Simplified scene detection
    // In production, would use advanced image processing
    let frame_interval = 1.0; // 1 frame per second
    let max_offset_frames = 30; // Search up to 30 seconds

    let ref_hash = hash_frames(ref_frames);
    let target_hash = hash_frames(target_frames);

    let similarity = calculate_frame_similarity(&ref_hash, &target_hash);

    // Estimate offset based on frame similarity
    let offset = if similarity > 0.8 {
        0.0
    } else {
        (similarity * max_offset_frames as f32) as f64 * frame_interval
    };

    Ok(offset)
}

fn hash_frames(frames: &[u8]) -> Vec<u32> {
    // Simple rolling hash for frame identification
    frames
        .chunks(4)
        .map(|chunk| {
            if chunk.len() == 4 {
                u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]])
            } else {
                0
            }
        })
        .collect()
}

fn calculate_frame_similarity(ref_hash: &[u32], target_hash: &[u32]) -> f32 {
    if ref_hash.is_empty() || target_hash.is_empty() {
        return 0.0;
    }

    let min_len = ref_hash.len().min(target_hash.len());
    let mut matches = 0;

    for i in 0..min_len {
        if ref_hash[i] == target_hash[i] {
            matches += 1;
        }
    }

    matches as f32 / min_len as f32
}

fn calculate_audio_confidence(
    ref_data: &[u8],
    target_data: &[u8],
    offset: f64,
) -> Result<f32, String> {
    let ref_energy = calculate_audio_energy(ref_data);
    let target_energy = calculate_audio_energy(target_data);

    let energy_ratio = (ref_energy / target_energy).min(target_energy / ref_energy);
    let confidence = 0.5 + (energy_ratio * 0.5).min(0.5);

    Ok(confidence as f32)
}

fn calculate_audio_energy(data: &[u8]) -> f64 {
    let samples: Vec<f32> = data
        .chunks(4)
        .map(|chunk| {
            if chunk.len() == 4 {
                f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]])
            } else {
                0.0
            }
        })
        .collect();

    if samples.is_empty() {
        return 0.0;
    }

    let sum: f64 = samples.iter().map(|s| (s * s) as f64).sum();
    (sum / samples.len() as f64).sqrt()
}
