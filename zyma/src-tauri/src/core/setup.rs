use tauri::{Emitter, Manager, AppHandle, Wry};
use std::fs;
use std::path::PathBuf;
use crate::{bus, commands, services};
use crate::commands::config::get_config_path;

pub fn setup_zyma(app: &mut tauri::App<Wry>, bus: bus::EventBus) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    restore_window_state(handle)?;
    
    setup_window_events(handle, bus.clone());
    setup_workspace_watcher(handle, bus.clone());
    setup_external_open_handler(handle, bus);

    Ok(())
}

fn setup_window_events(handle: &AppHandle<Wry>, bus: bus::EventBus) {
    let h = handle.clone();
    if let Some(main_window) = handle.get_webview_window("main") {
        main_window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Focused(focused) => { 
                    let _ = h.emit("window-state-changed", *focused); 
                    bus.publish(bus::ZymaEvent::WindowFocused(*focused));
                }
                tauri::WindowEvent::CloseRequested { api, .. } => { api.prevent_close(); h.exit(0); }
                _ => {}
            }
        });
    }
}

fn setup_workspace_watcher(handle: &AppHandle<Wry>, bus: bus::EventBus) {
    let h = handle.clone();
    let mut bus_rx = bus.subscribe();
    tauri::async_runtime::spawn(async move {
        while let Ok(event) = bus_rx.recv().await {
            if let bus::ZymaEvent::WorkspaceChanged(new_path) = event {
                let watcher_state = h.state::<commands::watcher::WatcherState>();
                {
                    let mut watchers = watcher_state.watchers.lock().unwrap();
                    watchers.clear(); 
                }
                let _ = commands::watcher::fs_watch(h.clone(), watcher_state, new_path);
            }
        }
    });
}

fn setup_external_open_handler(handle: &AppHandle<Wry>, bus: bus::EventBus) {
    let h = handle.clone();
    let mut bus_rx = bus.subscribe();
    tauri::async_runtime::spawn(async move {
        while let Ok(event) = bus_rx.recv().await {
            if let bus::ZymaEvent::OpenPath(path_str) = event {
                handle_remote_open(&h, path_str).await;
            }
        }
    });
}

async fn handle_remote_open(handle: &AppHandle<Wry>, path_str: String) {
    let path = PathBuf::from(&path_str);
    if !path.exists() { return; }

    // 统一路径格式为正斜杠，并强制盘符大写，避免 Windows/Unix 差异导致的重复打开
    let normalized_path = crate::services::path::normalize_to_string(&path);
    let ws = handle.state::<services::WorkspaceService>();
    let event_bus = handle.state::<bus::EventBus>();

    if path.is_dir() {
        let _ = commands::fs::fs_set_cwd(handle.clone(), ws, event_bus, normalized_path).await;
    } else if path.is_file() {
        if let Some(parent) = path.parent() {
            let parent_str = crate::services::path::normalize_to_string(parent);
            let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            
            // 1. 切换到父目录作为工作区
            let _ = commands::fs::fs_set_cwd(handle.clone(), ws, event_bus, parent_str).await;
            
            // 2. 通知前端打开具体文件
            let h_emit = handle.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                let _ = h_emit.emit("zyma:open-tab", serde_json::json!({
                    "id": normalized_path,
                    "title": file_name,
                    "type": "file"
                }));
            });
        }
    }
}

pub fn restore_window_state(app: &AppHandle<Wry>) -> tauri::Result<()> {
    if let Some(main_window) = app.get_webview_window("main") {
        let config_path = get_config_path();
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(config_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    let w = val.get("window_width").and_then(|v| v.as_f64()).unwrap_or(1000.0) as u32;
                    let h = val.get("window_height").and_then(|v| v.as_f64()).unwrap_or(700.0) as u32;
                    let _ = main_window.set_size(tauri::PhysicalSize::new(w, h));
                    if val.get("is_maximized").and_then(|v| v.as_bool()).unwrap_or(false) { let _ = main_window.maximize(); }
                }
            }
        }
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
    Ok(())
}
