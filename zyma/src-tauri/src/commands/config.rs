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
    let mut settings = if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str::<AppSettings>(&content).unwrap_or_default()
    } else {
        AppSettings::default()
    };

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
    // 关键：在保存设置前，由于前端可能不包含最新的窗口位置，
    // 我们需要先读取磁盘上的旧配置，合并 windows 字段后再保存。
    // 但如果 AppSettings 已经全量通过前端同步了，则直接保存。
    
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}