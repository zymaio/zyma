use tauri::AppHandle;

#[cfg(windows)]
#[tauri::command]
pub async fn manage_context_menu<R: tauri::Runtime>(_app: AppHandle<R>, enable: bool, label: String) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let raw_path = exe_path.to_str().unwrap_or_default().trim_matches('"');
    let hk_cu = RegKey::predef(HKEY_CURRENT_USER);
    let paths = vec![
        r"Software\Classes\*\shell\EditWithZyma",
        r"Software\Classes\Directory\shell\EditWithZyma",
    ];
    if enable {
        for p in paths {
            let (key, _) = hk_cu.create_subkey(p).map_err(|e| e.to_string())?;
            key.set_value("", &label).ok();
            key.set_value("MUIVerb", &label).ok();
            key.set_value("Icon", &raw_path).ok();
            let cmd_path = format!("{}\\command", p);
            let (cmd_key, _) = hk_cu.create_subkey(&cmd_path).map_err(|e| e.to_string())?;
            let cmd_val = format!("\"{}\" \"%1\"", raw_path);
            cmd_key.set_value("", &cmd_val).ok();
        }
    } else {
        for p in paths {
            let _ = hk_cu.delete_subkey_all(p);
        }
    }
    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn manage_context_menu<R: tauri::Runtime>(_app: AppHandle<R>, _enable: bool, _label: String) -> Result<(), String> {
    Ok(())
}
