use std::fs;
use crate::models::PluginManifest;

#[tauri::command]
pub fn list_plugins() -> Result<Vec<(String, PluginManifest)>, String> {
    let plugins_dir = std::path::Path::new("plugins");
    if !plugins_dir.exists() { return Ok(Vec::new()); }
    let mut plugins = Vec::new();
    if let Ok(entries) = fs::read_dir(plugins_dir) {
        for entry in entries {
            let e = if let Ok(e) = entry { e } else { continue };
            let p = e.path();
            if p.is_dir() {
                let mp = p.join("manifest.json");
                if mp.exists() {
                    let c = fs::read_to_string(mp).map_err(|e| e.to_string())?;
                    if let Ok(m) = serde_json::from_str::<PluginManifest>(&c) { plugins.push((p.to_string_lossy().to_string(), m)); }
                }
            }
        }
    }
    Ok(plugins)
}

#[tauri::command]
pub fn read_plugin_file(path: String) -> Result<String, String> { 
    fs::read_to_string(path).map_err(|e| e.to_string()) 
}
