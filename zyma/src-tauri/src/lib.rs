use tauri::{Emitter, Manager, Wry};
use tauri_plugin_cli::CliExt;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::HashMap;

pub mod models;
pub mod commands;

use crate::commands::config::get_config_path;

/// 全局应用状态
pub struct AppState {
    pub external_plugins: Vec<PathBuf>,
    pub watcher: commands::watcher::WatcherState,
    pub output: commands::output::OutputState,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let _ = app.emit("single-instance", args);
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .setup(|app| {
            // 1. 解析 CLI 参数
            let mut external_paths = Vec::new();
            if let Ok(matches) = app.cli().matches() {
                if let Some(arg) = matches.args.get("plugin-dir") {
                    if let Some(values) = arg.value.as_array() {
                        for val in values {
                            if let Some(path_str) = val.as_str() {
                                external_paths.push(PathBuf::from(path_str));
                            }
                        }
                    }
                }
            }

            // 2. 初始化全局状态
            app.manage(AppState {
                external_plugins: external_paths,
                watcher: commands::watcher::WatcherState { watchers: Mutex::new(HashMap::new()) },
                output: commands::output::OutputState { channels: Mutex::new(HashMap::new()) },
            });

            // 3. 恢复窗口状态
            restore_window_state(app.handle())?;

            Ok(())
        })
        .invoke_handler(commands::get_handlers())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    let app = window.app_handle();
                    for (_, w) in app.webview_windows() {
                        let _ = w.destroy();
                    }
                    std::process::exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running app");
}

fn restore_window_state(app: &tauri::AppHandle) -> tauri::Result<()> {
    let main_window = app.get_webview_window("main").unwrap();
    let config_path = get_config_path();

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(config_path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                let w = val.get("window_width").and_then(|v| v.as_f64()).unwrap_or(1000.0) as u32;
                let h = val.get("window_height").and_then(|v| v.as_f64()).unwrap_or(700.0) as u32;
                let _ = main_window.set_size(tauri::PhysicalSize::new(w, h));

                let x = val.get("window_x").and_then(|v| v.as_i64());
                let y = val.get("window_y").and_then(|v| v.as_i64());
                if let (Some(x), Some(y)) = (x, y) {
                    let _ = main_window.set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
                }
                if val.get("is_maximized").and_then(|v| v.as_bool()).unwrap_or(false) {
                    let _ = main_window.maximize();
                }
            }
        }
    }

    let _ = main_window.show();
    let _ = main_window.set_focus();
    Ok(())
}
