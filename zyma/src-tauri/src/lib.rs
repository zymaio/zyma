pub mod models;
pub mod commands;

use tauri::{Emitter, Manager};
use std::fs;

fn get_config_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    std::path::Path::new(&home).join(".zyma_config.json")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        let _ = app.emit("single-instance", args);
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }))
    .invoke_handler(tauri::generate_handler![
        commands::config::load_settings, 
        commands::config::save_settings,
        commands::fs::read_dir, 
        commands::fs::get_cwd,
        commands::fs::read_file, 
        commands::fs::write_file, 
        commands::fs::create_file, 
        commands::fs::create_dir, 
        commands::fs::remove_item, 
        commands::fs::rename_item,
        commands::fs::search_in_dir,
        commands::system::manage_context_menu, 
        commands::system::get_cli_args, 
        commands::system::is_admin, 
        commands::system::exit_app,
        commands::system::kill_process,
        commands::system::save_window_state,
        commands::system::get_platform, 
        commands::system::get_app_version,
        commands::system::open_url, 
        commands::system::show_main_window, 
        commands::system::check_update_racing,
        commands::plugins::list_plugins, 
        commands::plugins::read_plugin_file
    ])
    .setup(|app| {
        let main_window = app.get_webview_window("main").unwrap();
        let config_path = get_config_path();

        let mut is_maximized = false;
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(config_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    let w = val.get("window_width").and_then(|v| v.as_f64()).unwrap_or(800.0) as u32;
                    let h = val.get("window_height").and_then(|v| v.as_f64()).unwrap_or(600.0) as u32;
                    let _ = main_window.set_size(tauri::PhysicalSize::new(w, h));

                    let x = val.get("window_x").and_then(|v| v.as_i64());
                    let y = val.get("window_y").and_then(|v| v.as_i64());
                    if let (Some(x), Some(y)) = (x, y) {
                        let _ = main_window.set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
                    }
                    is_maximized = val.get("is_maximized").and_then(|v| v.as_bool()).unwrap_or(false);
                }
            }
        }

        if is_maximized {
            let _ = main_window.maximize();
        }
        let _ = main_window.show();
        let _ = main_window.set_focus();

        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running app");
}