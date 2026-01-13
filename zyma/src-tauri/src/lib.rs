pub mod models;
pub mod commands;

use tauri::{Emitter, AppHandle};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        let _ = app.emit("single-instance", args);
    }))
    .invoke_handler(tauri::generate_handler![
        // config.rs
        commands::config::load_settings, 
        commands::config::save_settings,
        // fs.rs
        commands::fs::read_dir, 
        commands::fs::read_file, 
        commands::fs::write_file, 
        commands::fs::create_file, 
        commands::fs::create_dir, 
        commands::fs::remove_item, 
        commands::fs::rename_item,
        commands::fs::search_in_dir,
        // system.rs
        commands::system::manage_context_menu, 
        commands::system::get_cli_args, 
        commands::system::is_admin, 
        commands::system::exit_app,
        commands::system::get_platform, 
        commands::system::open_url, 
        commands::system::show_main_window, 
        commands::system::check_update_racing,
        // plugins.rs
        commands::plugins::list_plugins, 
        commands::plugins::read_plugin_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running app");
}