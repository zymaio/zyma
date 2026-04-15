use crate::services::settings::{load_settings, save_settings};
use crate::services::path::normalize_to_string;

pub fn add_recent_workspace(path: &str) -> Result<String, String> {
    let p = std::path::PathBuf::from(path);
    let normalized_path = normalize_to_string(&p);
    let lower_path = normalized_path.to_lowercase();

    if let Ok(mut settings) = load_settings() {
        // Remove existing (case-insensitive check for Windows compatibility)
        settings.recent_workspaces.retain(|p| {
            normalize_to_string(p).to_lowercase() != lower_path
        });
        
        // Insert at the beginning
        settings.recent_workspaces.insert(0, normalized_path.clone());
        
        // Keep only top 10
        if settings.recent_workspaces.len() > 10 {
            settings.recent_workspaces.truncate(10);
        }
        
        let _ = save_settings(&settings);
    }
    
    Ok(normalized_path)
}
