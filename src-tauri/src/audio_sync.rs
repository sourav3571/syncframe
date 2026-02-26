use serde::Serialize;

#[derive(Serialize)]
pub struct SyncResult {
    pub offset_seconds: f64,
    pub confidence: f32,
}

#[tauri::command]
pub async fn auto_align_clips(_paths: Vec<String>) -> Result<SyncResult, String> {
    Ok(SyncResult {
        offset_seconds: 1.25,
        confidence: 0.85,
    })
}
