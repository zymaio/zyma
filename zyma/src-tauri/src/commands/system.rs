use tauri::AppHandle;
use crate::models::UpdateInfo;
use serde_json;

#[tauri::command]
pub fn is_admin() -> bool {
    #[cfg(windows)] {
        use std::ptr;
        use winapi::um::processthreadsapi::{GetCurrentProcess, OpenProcessToken};
        use winapi::um::securitybaseapi::GetTokenInformation;
        use winapi::um::winnt::{TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
        let mut is_elevated = false;
        unsafe {
            let mut token = ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) != 0 {
                let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
                let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
                if GetTokenInformation(token, TokenElevation, &mut elevation as *mut _ as *mut _, size, &mut size) != 0 {
                    is_elevated = elevation.TokenIsElevated != 0;
                }
            }
        }
        is_elevated
    }
    #[cfg(not(windows))] {
        true
    }
}

#[tauri::command]
pub fn exit_app() { std::process::exit(0); }

#[tauri::command]
pub fn get_cli_args() -> Vec<String> { std::env::args().collect() }

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(&["/C", "start", &url])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))] {
        std::process::Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub async fn manage_context_menu(_app: AppHandle, enable: bool, label: String) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let raw_path = exe_path.to_str().unwrap_or_default().trim_matches('"');
    let hk_cu = RegKey::predef(HKEY_CURRENT_USER);
    let paths = vec![ r"Software\Classes\*\shell\EditWithZyma", r"Software\Classes\Directory\shell\EditWithZyma" ];
    
    if enable {
        for p in paths {
            let (key, _) = hk_cu.create_subkey(p).map_err(|e| e.to_string())?;
            key.set_value("", &label).ok();
            key.set_value("MUIVerb", &label).ok();
            key.set_value("Icon", &raw_path).ok();
            
            let cmd_path = format!("{}\\command", p);
            let (cmd_key, _) = hk_cu.create_subkey(&cmd_path).map_err(|e| e.to_string())?;
            // --- KEPT EXACTLY AS IT WAS ---
            let cmd_val = format!("\"{}\" \"%1\"", raw_path);
            // ------------------------------
            cmd_key.set_value("", &cmd_val).ok();
        }
    } else {
        for p in paths { let _ = hk_cu.delete_subkey_all(p); }
        let _ = hk_cu.delete_subkey_all(r"Software\Classes\*\shell\OpenWithZyma");
        let _ = hk_cu.delete_subkey_all(r"Software\Classes\Directory\shell\OpenWithZyma");
    }
    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn manage_context_menu(_app: AppHandle, _enable: bool, _label: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn check_update_racing() -> Result<UpdateInfo, String> {
    let urls = vec![
        ("Gitee", "https://gitee.com/api/v5/repos/zymaio/zyma/releases/latest"),
        ("GitHub", "https://api.github.com/repos/zymaio/zyma/releases/latest")
    ];

    for (source, url) in urls {
        let output = if cfg!(windows) {
            use std::os::windows::process::CommandExt;
            let ps_cmd = format!(
                "$ProgressPreference = 'SilentlyContinue'; Invoke-RestMethod -Uri '{}' -Method Get -TimeoutSec 5 -Headers @{{'User-Agent'='Zyma'}} | ConvertTo-Json -Depth 5 -Compress",
                url
            );
            std::process::Command::new("powershell")
                .args(&["-Command", &ps_cmd])
                .creation_flags(0x08000000)
                .output()
        } else {
            std::process::Command::new("curl")
                .args(&["-L", "-s", "-A", "Zyma", "--max-time", "5", url])
                .output()
        };

        if let Ok(out) = output {
            if out.status.success() {
                let body = String::from_utf8_lossy(&out.stdout);
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                    if let Some(tag_name) = json.get("tag_name").and_then(|v| v.as_str()) {
                        let version = tag_name.trim_start_matches('v').to_string();
                        return Ok(UpdateInfo {
                            version,
                            source: source.to_string(),
                            url: if source == "Gitee" { "https://gitee.com/zymaio/zyma/releases" } else { "https://github.com/zymaio/zyma/releases" }.to_string()
                        });
                    }
                }
            }
        }
    }
    Err("Update check failed".to_string())
}

#[tauri::command]
pub fn get_platform() -> String { std::env::consts::OS.to_string() }

#[tauri::command]
pub fn show_main_window(window: tauri::Window) {
    window.show().ok();
    window.set_focus().ok();
}
