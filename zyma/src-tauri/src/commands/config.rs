use crate::models::AppSettings;
use crate::services::settings::{load_settings as load_from_disk, save_settings as save_to_disk};

pub use crate::services::settings::get_config_path;

#[tauri::command]
pub fn load_settings() -> Result<AppSettings, String> {
    load_from_disk().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    save_to_disk(&settings).map_err(|e| e.to_string())
}
