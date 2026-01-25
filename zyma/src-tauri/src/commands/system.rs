use tauri::{AppHandle, Manager};

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
pub fn save_window_state(window: tauri::Window) -> Result<(), String> {
    let mut settings = crate::commands::config::load_settings().unwrap_or_else(|_| {
        crate::models::AppSettings {
            theme: "dark".to_string(),
            font_size: 14,
            ui_font_size: 13,
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
        }
    });

    let is_maximized = window.is_maximized().unwrap_or(false);
    settings.is_maximized = is_maximized;

    if !is_maximized {
        if let Ok(size) = window.outer_size() {
            settings.window_width = size.width as f64;
            settings.window_height = size.height as f64;
        }
        if let Ok(pos) = window.outer_position() {
            settings.window_x = Some(pos.x);
            settings.window_y = Some(pos.y);
        }
    }

    crate::commands::config::save_settings(settings)
}

#[tauri::command]
pub fn kill_process() {
    std::process::exit(0);
}

#[tauri::command]
pub fn exit_app(app_handle: tauri::AppHandle) { 
    app_handle.exit(0); 
}

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
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_platform() -> String { std::env::consts::OS.to_string() }

#[tauri::command]
pub fn system_get_env(name: String) -> Option<String> {
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
    #[cfg(windows)]
    use std::os::windows::process::CommandExt;

    let mut cmd = Command::new(&program);
    cmd.args(&args);
    
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: 隐藏执行时的黑色命令行窗口

    let output = cmd.output().map_err(|e| format!("Failed to execute '{}': {}", program, e))?;

    Ok(ExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub async fn open_detached_output(app_handle: tauri::AppHandle, channel: String) -> Result<(), String> {
    use tauri::WebviewUrl;
    use tauri::WebviewWindowBuilder;

    let label = format!("output-window-{}", channel);
    
    // 如果窗口已存在，则聚焦
    if let Some(win) = app_handle.get_webview_window(&label) {
        let _ = win.set_focus();
        return Ok(());
    }

    // 创建新窗口，URL 加上 query 参数让前端知道只显示日志
    let url = WebviewUrl::App(format!("index.html?mode=output&channel={}", channel).into());
    
    WebviewWindowBuilder::new(&app_handle, label, url)
        .title(format!("绣智助手日志 - {}", channel))
        .inner_size(800.0, 500.0)
        .resizable(true)
        .decorations(true) // 启用原生装饰，自带关闭/最小化按钮
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn system_exit_all_windows(app_handle: tauri::AppHandle) -> Result<(), String> {
    for (label, w) in app_handle.webview_windows() {
        if label != "main" {
            let _ = w.close();
        }
    }
    // 最后退出整个应用
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub fn show_main_window(
    app_handle: tauri::AppHandle,
    width: f64, 
    height: f64, 
    x: Option<i32>, 
    y: Option<i32>, 
    is_maximized: bool
) {
    if let Some(window) = app_handle.get_webview_window("main") {
        // 1. Apply Size and Position (Physical pixels)
        // Use a reasonable minimum size if something went wrong
        let w = if width > 100.0 { width } else { 800.0 };
        let h = if height > 100.0 { height } else { 600.0 };
        
        let _ = window.set_size(tauri::PhysicalSize::new(w as u32, h as u32));
        
        if let (Some(x), Some(y)) = (x, y) {
            let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
        }

        // 2. Apply Maximized if needed
        if is_maximized {
            let _ = window.maximize();
        }

        // 3. Finally show and focus
        let _ = window.show();
        let _ = window.set_focus();
    }
}