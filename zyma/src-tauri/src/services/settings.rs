use std::fs;
use crate::models::AppSettings;
use crate::errors::Result;

pub fn get_config_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    std::path::Path::new(&home).join(".zyma_config.json")
}

pub fn load_settings() -> Result<AppSettings> {
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

pub fn save_settings(settings: &AppSettings) -> Result<()> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(&settings)?;
    fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings_has_theme() {
        let settings = AppSettings::default();
        assert_eq!(settings.theme, "dark");
        assert_eq!(settings.language, "zh-CN");
    }
}
