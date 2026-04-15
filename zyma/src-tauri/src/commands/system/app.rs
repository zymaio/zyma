use tauri::Emitter;

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd").args(&["/C", "start", &url]).creation_flags(0x08000000).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))] {
        std::process::Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_app_version() -> String { env!("CARGO_PKG_VERSION").to_string() }

#[tauri::command]
pub fn get_product_name<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> String {
    let name = app_handle.package_info().name.clone();
    name.to_lowercase()
}

/// Allowed environment variables that can be read (security whitelist)
const ALLOWED_ENV_VARS: &[&str] = &["PATH", "HOME", "USERPROFILE", "USER", "USERNAME", "SHELL", "LANG", "TERM"];

#[tauri::command]
pub fn get_platform() -> String { std::env::consts::OS.to_string() }

#[tauri::command]
pub fn system_get_env(name: String) -> Option<String> {
    // Security: Only allow reading of safe environment variables
    if !ALLOWED_ENV_VARS.contains(&name.to_uppercase().as_str()) {
        return None;
    }
    std::env::var(name).ok()
}

#[derive(serde::Serialize)]
pub struct ExecResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[tauri::command]
pub async fn system_exec(program: String, args: Vec<String>) -> Result<ExecResult, String> {
    use std::process::Command;
    #[cfg(windows)] use std::os::windows::process::CommandExt;

    // Security: Validate program path to prevent command injection
    // Only allow absolute paths or known safe executables
    let program_path = std::path::Path::new(&program);
    if !program_path.is_absolute() && !program.contains(std::path::MAIN_SEPARATOR) {
        // Allow only known safe commands (no shell injection)
        let allowed_commands = ["echo", "ls", "dir", "pwd", "cd", "cat", "type", "date", "time", "whoami"];
        if !allowed_commands.contains(&program.to_lowercase().as_str()) {
            return Err(format!("Command '{}' is not in the allowed list. Use absolute paths for custom commands.", program));
        }
    }

    let mut cmd = Command::new(&program);
    cmd.args(&args);
    #[cfg(windows)] cmd.creation_flags(0x08000000);
    let output = cmd.output().map_err(|e| format!("Failed to execute '{}': {}", program, e))?;
    Ok(ExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub fn emit_global_event<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>, event: String, payload: String) -> Result<(), String> {
    let _ = app_handle.emit(&event, payload);
    Ok(())
}
