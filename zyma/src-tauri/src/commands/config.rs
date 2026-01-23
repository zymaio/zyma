use std::fs;
use crate::models::AppSettings;

pub fn get_config_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    std::path::Path::new(&home).join(".zyma_config.json")
}

#[tauri::command]
pub fn load_settings() -> Result<AppSettings, String> {
    let path = get_config_path();
    
    let mut settings = AppSettings {
        theme: "dark".to_string(),
        font_size: 14,
        ui_font_size: 13, // 默认 13px
        tab_size: 4,
        language: "zh-CN".to_string(),
        context_menu: false,
        single_instance: true,
        auto_update: true,
        window_width: 800.0,
        window_height: 600.0,
        window_x: None,
        window_y: None,
        is_maximized: false,
    };

    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(t) = val.get("theme").and_then(|v| v.as_str()) { settings.theme = t.to_string(); }
                if let Some(f) = val.get("font_size").and_then(|v| v.as_u64()) { settings.font_size = f as u32; }
                if let Some(uf) = val.get("ui_font_size").and_then(|v| v.as_u64()) { settings.ui_font_size = uf as u32; }
                if let Some(s) = val.get("tab_size").and_then(|v| v.as_u64()) { settings.tab_size = s as u32; }
                if let Some(l) = val.get("language").and_then(|v| v.as_str()) { settings.language = l.to_string(); }
                if let Some(si) = val.get("single_instance").and_then(|v| v.as_bool()) { settings.single_instance = si; }
                if let Some(au) = val.get("auto_update").and_then(|v| v.as_bool()) { settings.auto_update = au; }
                if let Some(ww) = val.get("window_width").and_then(|v| v.as_f64()) { settings.window_width = ww; }
                if let Some(wh) = val.get("window_height").and_then(|v| v.as_f64()) { settings.window_height = wh; }
                if let Some(wx) = val.get("window_x").and_then(|v| v.as_i64()) { settings.window_x = Some(wx as i32); }
                if let Some(wy) = val.get("window_y").and_then(|v| v.as_i64()) { settings.window_y = Some(wy as i32); }
                if let Some(im) = val.get("is_maximized").and_then(|v| v.as_bool()) { settings.is_maximized = im; }
            }
        }
    }

    #[cfg(windows)]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let hk_cu = RegKey::predef(HKEY_CURRENT_USER);
        let check_path = r"Software\Classes\*\shell\EditWithZyma";
        settings.context_menu = hk_cu.open_subkey(check_path).is_ok();
    }

    Ok(settings)
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
