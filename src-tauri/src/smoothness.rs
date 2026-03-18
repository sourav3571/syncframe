// Enhanced Audio Synchronization & Smoothness Module
// Handles audio/video sync, frame interpolation, and smooth playback

use serde::{Serialize, Deserialize};
use std::f32;

#[derive(Clone, Serialize, Deserialize)]
pub struct SmoothplayConfig {
    // Sync parameters
    pub max_sync_drift_ms: f32,      // Maximum allowed drift before correcting (default: 50ms)
    pub sync_check_interval_ms: f32, // How often to check sync (default: 33ms = 30fps)
    
    // Smoothing parameters
    pub enable_frame_interpolation: bool,  // Smoothframe 60fps video
    pub interpolation_quality: InterpolationQuality,
    pub audio_smoothing_enabled: bool,
    pub audio_smoothing_factor: f32,
    
    // Rendering parameters
    pub enable_vsync: bool,
    pub target_framerate: i32,
    pub buffer_size: usize,
    
    // Performance parameters
    pub use_hardware_acceleration: bool,
    pub preload_duration_ms: f32,
}

#[derive(Clone, Serialize, Deserialize)]
pub enum InterpolationQuality {
    Low,
    Medium,
    High,
}

impl Default for SmoothplayConfig {
    fn default() -> Self {
        SmoothplayConfig {
            max_sync_drift_ms: 40.0,
            sync_check_interval_ms: 11.11, // 90fps target
            enable_frame_interpolation: true,
            interpolation_quality: InterpolationQuality::High,
            audio_smoothing_enabled: true,
            audio_smoothing_factor: 0.7,
            enable_vsync: true,
            target_framerate: 90,
            buffer_size: 4096,
            use_hardware_acceleration: true,
            preload_duration_ms: 500.0,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SyncMetrics {
    pub audio_video_drift_ms: f32,
    pub frame_drop: f32,
    pub jitter_ms: f32,
    pub smoothness_score: f32,
    pub buffer_health: f32,
}

pub struct AudioSyncEngine {
    config: SmoothplayConfig,
    last_video_time: f32,
    last_audio_time: f32,
    drift_history: Vec<f32>,
    frame_timestamps: Vec<f32>,
}

impl AudioSyncEngine {
    pub fn new(config: SmoothplayConfig) -> Self {
        AudioSyncEngine {
            config,
            last_video_time: 0.0,
            last_audio_time: 0.0,
            drift_history: Vec::with_capacity(60),
            frame_timestamps: Vec::with_capacity(120),
        }
    }

    #[allow(dead_code)]
    pub fn update(&mut self, video_time: f32, audio_time: f32) -> SyncMetrics {
        let drift = (audio_time - video_time) * 1000.0; // Convert to milliseconds
        
        // Store drift history for trend analysis
        self.drift_history.push(drift);
        if self.drift_history.len() > 60 {
            self.drift_history.remove(0);
        }

        // Calculate jitter
        let average_drift = self.drift_history.iter().sum::<f32>() / self.drift_history.len() as f32;
        let jitter = if self.drift_history.len() > 1 {
            let variance = self.drift_history.iter()
                .map(|d| (d - average_drift).powi(2))
                .sum::<f32>() / self.drift_history.len() as f32;
            variance.sqrt()
        } else {
            0.0
        };

        // Calculate smoothness score (0-1, higher is better)
        let drift_factor = (self.config.max_sync_drift_ms - drift.abs().min(self.config.max_sync_drift_ms)) 
            / self.config.max_sync_drift_ms;
        let jitter_factor = (10.0 - jitter.min(10.0)) / 10.0;
        let smoothness_score = (drift_factor * 0.6 + jitter_factor * 0.4).max(0.0).min(1.0);

        self.last_video_time = video_time;
        self.last_audio_time = audio_time;

        SyncMetrics {
            audio_video_drift_ms: drift,
            frame_drop: 0.0,
            jitter_ms: jitter,
            smoothness_score,
            buffer_health: 0.85,
        }
    }

    #[allow(dead_code)]
    pub fn get_recommended_audio_adjustment(&self) -> f32 {
        if self.drift_history.is_empty() {
            return 1.0;
        }

        let average_drift = self.drift_history.iter().sum::<f32>() / self.drift_history.len() as f32;
        
        // Apply dampening to prevent overcorrection
        let correction_factor = 1.0 + (average_drift / 1000.0) * self.config.audio_smoothing_factor * 0.01;
        correction_factor.max(0.8).min(1.2)
    }

    #[allow(dead_code)]
    pub fn should_skip_frame(&self) -> bool {
        if self.drift_history.len() < 10 {
            return false;
        }

        let average_drift = self.drift_history.iter().sum::<f32>() / self.drift_history.len() as f32;
        average_drift.abs() > self.config.max_sync_drift_ms * 2.0
    }

    #[allow(dead_code)]
    pub fn reset(&mut self) {
        self.drift_history.clear();
        self.frame_timestamps.clear();
        self.last_video_time = 0.0;
        self.last_audio_time = 0.0;
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FrameInterpolationConfig {
    pub quality: InterpolationQuality,
    pub use_optical_flow: bool,
    pub use_blend: bool,
}

pub struct FrameInterpolator {
    config: FrameInterpolationConfig,
}

impl FrameInterpolator {
    #[allow(dead_code)]
    pub fn new(config: FrameInterpolationConfig) -> Self {
        FrameInterpolator { config }
    }

    #[allow(dead_code)]
    pub fn interpolate(&self, frame_a: Vec<u8>, frame_b: Vec<u8>, alpha: f32) -> Vec<u8> {
        match self.config.quality {
            InterpolationQuality::Low => self.blend_frames(frame_a, frame_b, alpha),
            InterpolationQuality::Medium => self.smooth_blend(frame_a, frame_b, alpha),
            InterpolationQuality::High => {
                if self.config.use_optical_flow {
                    self.optical_flow_interpolate(frame_a, frame_b, alpha)
                } else {
                    self.smooth_blend(frame_a, frame_b, alpha)
                }
            }
        }
    }

    fn blend_frames(&self, frame_a: Vec<u8>, frame_b: Vec<u8>, alpha: f32) -> Vec<u8> {
        frame_a.iter()
            .zip(frame_b.iter())
            .map(|(a, b)| {
                let a_f = *a as f32;
                let b_f = *b as f32;
                (a_f * (1.0 - alpha) + b_f * alpha).round() as u8
            })
            .collect()
    }

    fn smooth_blend(&self, frame_a: Vec<u8>, frame_b: Vec<u8>, alpha: f32) -> Vec<u8> {
        // Smoother interpolation using easing curve
        let eased_alpha = alpha * alpha * (3.0 - 2.0 * alpha); // Smoothstep
        self.blend_frames(frame_a, frame_b, eased_alpha)
    }

    fn optical_flow_interpolate(&self, frame_a: Vec<u8>, frame_b: Vec<u8>, alpha: f32) -> Vec<u8> {
        // Simplified optical flow-based interpolation
        // In production, use actual optical flow computation
        self.smooth_blend(frame_a, frame_b, alpha)
    }
}

#[tauri::command]
#[allow(dead_code)]
pub fn get_smoothplay_config() -> SmoothplayConfig {
    SmoothplayConfig::default()
}

#[tauri::command]
#[allow(dead_code)]
pub fn update_smoothness_metrics(
    video_time: f32,
    audio_time: f32,
    _fps: i32,
) -> SyncMetrics {
    let mut engine = AudioSyncEngine::new(SmoothplayConfig::default());
    engine.update(video_time, audio_time)
}

#[tauri::command]
#[allow(dead_code)]
pub fn analyze_sync_quality(
    drift_samples: Vec<f32>,
    _fps: i32,
) -> SyncMetrics {
    if drift_samples.is_empty() {
        return SyncMetrics {
            audio_video_drift_ms: 0.0,
            frame_drop: 0.0,
            jitter_ms: 0.0,
            smoothness_score: 1.0,
            buffer_health: 1.0,
        };
    }

    let average_drift = drift_samples.iter().sum::<f32>() / drift_samples.len() as f32;
    let variance = drift_samples.iter()
        .map(|d| (d - average_drift).powi(2))
        .sum::<f32>() / drift_samples.len() as f32;
    let jitter = variance.sqrt();

    let drift_factor = (50.0 - average_drift.abs().min(50.0)) / 50.0;
    let jitter_factor = (10.0 - jitter.min(10.0)) / 10.0;
    let smoothness_score = (drift_factor * 0.6 + jitter_factor * 0.4).max(0.0).min(1.0);

    SyncMetrics {
        audio_video_drift_ms: average_drift,
        frame_drop: 0.0,
        jitter_ms: jitter,
        smoothness_score,
        buffer_health: 0.85,
    }
}
