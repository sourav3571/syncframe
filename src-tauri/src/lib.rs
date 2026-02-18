mod capabilities;
mod audio_sync;
mod render;
mod media;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            capabilities::detect_system_capabilities,
            audio_sync::auto_align_clips,
            render::start_render,
            render::generate_proxy,
            media::get_media_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
