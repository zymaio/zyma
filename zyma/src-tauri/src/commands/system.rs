use tauri::{AppHandle, Manager, Emitter};
use serde_json::Value;

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
    #[cfg(not(windows))] { true }
}

#[tauri::command]
pub fn kill_process() { std::process::exit(0); }

#[tauri::command]
pub fn exit_app<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) { app_handle.exit(0); }

#[tauri::command]
pub fn get_cli_args() -> Vec<String> { std::env::args().collect() }

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd").args(&["/C", "start", &url]).creation_flags(0x08000000).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))] { std::process::Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

#[cfg(windows)]
#[tauri::command]
pub async fn manage_context_menu<R: tauri::Runtime>(_app: AppHandle<R>, enable: bool, label: String) -> Result<(), String> {
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
            let cmd_val = format!("\"{}\" \"%1\"", raw_path);
            cmd_key.set_value("", &cmd_val).ok();
        }
    } else {
        for p in paths { let _ = hk_cu.delete_subkey_all(p); }
    }
    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn manage_context_menu<R: tauri::Runtime>(_app: AppHandle<R>, _enable: bool, _label: String) -> Result<(), String> { Ok(()) }

#[tauri::command] pub fn get_app_version() -> String { env!("CARGO_PKG_VERSION").to_string() }
#[tauri::command] pub fn get_product_name<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> String { 
    let name = app_handle.package_info().name.clone();
    name.to_lowercase()
}

use crate::commands::plugins::PluginService;

#[tauri::command] 
pub fn get_native_extensions(state: tauri::State<'_, PluginService>) -> serde_json::Value { 
    serde_json::json!({
        "chat_participants": state.native_chat_participants,
        "auth_providers": state.native_auth_providers
    })
}

#[tauri::command] pub fn get_platform() -> String { std::env::consts::OS.to_string() }
#[tauri::command] pub fn system_get_env(name: String) -> Option<String> { std::env::var(name).ok() }

#[derive(serde::Serialize)]
pub struct ExecResult { pub stdout: String, pub stderr: String, pub exit_code: i32 }

#[tauri::command]
pub async fn system_exec(program: String, args: Vec<String>) -> Result<ExecResult, String> {
    use std::process::Command;
    #[cfg(windows)] use std::os::windows::process::CommandExt;
    let mut cmd = Command::new(&program);
    cmd.args(&args);
    #[cfg(windows)] cmd.creation_flags(0x08000000);
    let output = cmd.output().map_err(|e| format!("Failed to execute '{}': {}", program, e))?;
    Ok(ExecResult { stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(), stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(), exit_code: output.status.code().unwrap_or(-1) })
}

#[tauri::command]
pub fn emit_global_event<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>, event: String, payload: String) -> Result<(), String> {
    let _ = app_handle.emit(&event, payload);
    Ok(())
}

#[tauri::command]
pub async fn system_exit_all_windows<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    for (label, w) in app_handle.webview_windows() { if label != "main" { let _ = w.close(); } }
    app_handle.exit(0);
    Ok(())
}