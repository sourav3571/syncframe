mod capabilities;
mod audio_sync;
mod render;
mod media;
mod smart_features;
mod smoothness;
mod smooth_render;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            capabilities::detect_system_capabilities,
            capabilities::save_project,
            capabilities::load_project,
            audio_sync::auto_align_clips,
            render::start_render,
            render::generate_proxy,
            media::get_media_metadata,
            smart_features::detect_scenes,
            smart_features::generate_subtitles,
            smart_features::recommend_export_settings,
            smart_features::proxy_video,
            smart_features::analyze_video_quality,
            smoothness::get_smoothplay_config,
            smoothness::update_smoothness_metrics,
            smoothness::analyze_sync_quality,
            smooth_render::get_render_pipeline_config,
            smooth_render::preview_render_filters,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
