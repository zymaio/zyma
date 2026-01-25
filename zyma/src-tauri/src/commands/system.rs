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

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: i32,
    pub y: i32,
    pub is_maximized: bool,
}

#[tauri::command]
pub fn save_window_state(window: tauri::WebviewWindow) -> Result<(), String> {
    let label = window.label().to_string();
    let config_path = crate::commands::config::get_config_path();
    let mut config_val = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path).unwrap_or_default();
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let is_maximized = window.is_maximized().unwrap_or(false);
    
    // 使用逻辑像素 (Logical Pixels) 以支持多屏 DPI 差异
    let factor = window.scale_factor().unwrap_or(1.0);
    let size = window.outer_size().unwrap_or_default().to_logical::<f64>(factor);
    let pos = window.outer_position().unwrap_or_default().to_logical::<i32>(factor);

    let state = WindowState {
        width: size.width,
        height: size.height,
        x: pos.x,
        y: pos.y,
        is_maximized,
    };

    if label == "main" {
        config_val["window_width"] = serde_json::json!(state.width);
        config_val["window_height"] = serde_json::json!(state.height);
        config_val["window_x"] = serde_json::json!(state.x);
        config_val["window_y"] = serde_json::json!(state.y);
        config_val["is_maximized"] = serde_json::json!(state.is_maximized);
    } else {
        if config_val.get("windows").is_none() {
            config_val["windows"] = serde_json::json!({});
        }
        config_val["windows"][&label] = serde_json::to_value(state).unwrap();
    }

    let new_content = serde_json::to_string_pretty(&config_val).map_err(|e| e.to_string())?;
    std::fs::write(config_path, new_content).map_err(|e| e.to_string())?;
    Ok(())
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
    
    if let Some(win) = app_handle.get_webview_window(&label) {
        let _ = win.set_focus();
        return Ok(());
    }

    // 1. 读取历史状态
    let config_path = crate::commands::config::get_config_path();
    let mut saved_state: Option<WindowState> = None;
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(windows) = val.get("windows").and_then(|v| v.as_object()) {
                    if let Some(state_val) = windows.get(&label) {
                        saved_state = serde_json::from_value(state_val.clone()).ok();
                    }
                }
            }
        }
    }

    // 2. 准备 Builder (初始不可见)
    let url = WebviewUrl::App(format!("index.html?mode=output&channel={}", channel).into());
    let mut builder = WebviewWindowBuilder::new(&app_handle, &label, url)
        .title(format!("绣智助手日志 - {}", channel))
        .inner_size(800.0, 500.0)
        .resizable(true)
        .visible(false) 
        .decorations(true);

    // 3. 应用状态并进行越界检查
    if let Some(state) = saved_state {
        // 简单的越界检查：如果坐标在极小负数或极大正数之外（防止丢失窗口）
        // 更严谨的做法是获取当前 monitor 信息，这里我们先做基础过滤
        if state.x > -10000 && state.x < 10000 && state.y > -10000 && state.y < 10000 {
            builder = builder.position(state.x as f64, state.y as f64)
                             .inner_size(state.width, state.height);
        }
    }
    
    let window = builder.build().map_err(|e| e.to_string())?;

    // 4. 监听事件
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                let _ = save_window_state(window_clone.clone());
            },
            _ => {}
        }
    });

    // 5. 核心优化：确保渲染准备就绪后再显示 (参考主窗口逻辑)
    let w = window.clone();
    tauri::async_runtime::spawn(async move {
        // 稍微等待渲染引擎初始化 (100ms 往往足以消除白屏闪烁)
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
        let _ = w.show();
        let _ = w.set_focus();
    });

    Ok(())
}

#[tauri::command]
pub fn show_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
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