use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
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
    
    // 使用统一的加载逻辑
    let mut settings = crate::commands::config::load_settings()?;

    let is_maximized = window.is_maximized().unwrap_or(false);
    let factor = window.scale_factor().unwrap_or(1.0);
    let size = window.outer_size().unwrap_or_default().to_logical::<f64>(factor);
    let pos = window.outer_position().unwrap_or_default().to_logical::<i32>(factor);

    let state = WindowState { width: size.width, height: size.height, x: pos.x, y: pos.y, is_maximized };

    if label == "main" {
        settings.window_width = state.width;
        settings.window_height = state.height;
        settings.window_x = Some(state.x);
        settings.window_y = Some(state.y);
        settings.is_maximized = state.is_maximized;
    } else {
        let mut windows_map = match settings.windows {
            Some(v) => v.as_object().cloned().unwrap_or_default(),
            None => serde_json::Map::new(),
        };
        windows_map.insert(label, serde_json::to_value(state).unwrap());
        settings.windows = Some(serde_json::Value::Object(windows_map));
    }

    // 使用统一的保存逻辑
    crate::commands::config::save_settings(settings)
}

#[tauri::command]
pub async fn open_detached_output(app_handle: tauri::AppHandle, channel: String) -> Result<(), String> {
    let label = format!("output-window-{}", channel);
    if let Some(win) = app_handle.get_webview_window(&label) { let _ = win.set_focus(); return Ok(()); }
    
    // 使用统一的加载逻辑
    let settings = crate::commands::config::load_settings()?;
    let mut saved_state: Option<WindowState> = None;
    
    if let Some(windows) = settings.windows.and_then(|v| v.as_object().cloned()) {
        if let Some(state_val) = windows.get(&label) { 
            saved_state = serde_json::from_value(state_val.clone()).ok(); 
        }
    }
    
    let url = WebviewUrl::App(format!("index.html?mode=output&channel={}&theme={}", channel, settings.theme).into());
    let mut builder = WebviewWindowBuilder::new(&app_handle, &label, url)
        .title(format!("绣智助手日志 - {}", channel))
        .inner_size(800.0, 500.0)
        .resizable(true)
        .visible(false)
        .decorations(true);
        
    if let Some(state) = saved_state { 
        if state.x > -10000 && state.x < 10000 && state.y > -10000 && state.y < 10000 { 
            builder = builder.position(state.x as f64, state.y as f64).inner_size(state.width, state.height); 
        } 
    }
    
    let window = builder.build().map_err(|e| e.to_string())?;
    let window_clone = window.clone();
    window.on_window_event(move |event| { 
        match event { 
            tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => { let _ = save_window_state(window_clone.clone()); }, 
            _ => {} 
        } 
    });
    
    let w = window.clone();
    tauri::async_runtime::spawn(async move { 
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
pub fn show_main_window(app_handle: tauri::AppHandle, width: f64, height: f64, x: Option<i32>, y: Option<i32>, is_maximized: bool) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let w = if width > 100.0 { width } else { 800.0 };
        let h = if height > 100.0 { height } else { 600.0 };
        let _ = window.set_size(tauri::PhysicalSize::new(w as u32, h as u32));
        if let (Some(x), Some(y)) = (x, y) { let _ = window.set_position(tauri::PhysicalPosition::new(x, y)); }
        if is_maximized { let _ = window.maximize(); }
        let _ = window.show();
        let _ = window.set_focus();
    }
}
