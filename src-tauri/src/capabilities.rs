use serde::Serialize;
use sysinfo::System;

#[derive(Serialize)]
pub struct SystemCapabilities {
    pub cpu_cores: usize,
    pub ram_gb: u64,
    pub gpu_vendor: String,
    pub recommended_encoder: String,
    pub proxy_recommended: bool,
}

#[tauri::command]
pub fn detect_system_capabilities() -> SystemCapabilities {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_cores = sys.cpus().len();
    let ram_gb = sys.total_memory() / 1024 / 1024 / 1024;
    
    // Detection logic for GPU vendor (simplified for demonstration)
    // In a real scenario, one might use crates like `wgpu` or parse system logs
    // Here we'll check common strings in system info or assume based on OS for simplicity
    let gpu_vendor = detect_gpu_vendor();
    
    let (encoder, proxy) = match gpu_vendor.as_str() {
        "Nvidia" => ("h264_nvenc".to_string(), ram_gb < 16),
        "AMD" => ("h264_amf".to_string(), ram_gb < 16),
        "Intel" => ("h264_qsv".to_string(), ram_gb < 16),
        "Apple" => ("h264_videotoolbox".to_string(), false),
        _ => ("libx264".to_string(), true),
    };

    SystemCapabilities {
        cpu_cores,
        ram_gb,
        gpu_vendor,
        recommended_encoder: encoder,
        proxy_recommended: proxy || cpu_cores < 8,
    }
}

fn detect_gpu_vendor() -> String {
    // This is a placeholder for more robust detection
    // On Windows, one could use DXGI or WMI
    if cfg!(target_os = "windows") {
        "Nvidia".to_string() // Hardcoded for now, would be replaced with real detection
    } else if cfg!(target_os = "macos") {
        "Apple".to_string()
    } else {
        "Generic".to_string()
    }
}
