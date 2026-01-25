pub mod config;
pub mod fs;
pub mod system;
pub mod plugins;
pub mod output;
pub mod search;
pub mod watcher;

use tauri::Wry;

pub fn get_handlers() -> impl Fn(tauri::ipc::Invoke<Wry>) -> bool {
    tauri::generate_handler![
        config::load_settings, 
        config::save_settings,
        fs::read_dir, 
        fs::get_cwd,
        fs::fs_set_cwd,
        fs::read_file, 
        fs::write_file, 
        fs::create_file, 
        fs::create_dir, 
        fs::remove_item, 
        fs::rename_item,
        fs::fs_stat,
        search::search_in_dir,
        search::fs_find_files,
        watcher::fs_watch,
        watcher::fs_unwatch,
        output::output_append,
        output::output_get_content,
        output::output_clear,
        output::output_list_channels,
        system::manage_context_menu, 
        system::get_cli_args, 
        system::system_get_env,
        system::system_exec,
        system::emit_global_event,
        system::open_detached_output,
        system::show_window,
        system::is_admin, 
        system::exit_app,
        system::kill_process,
        system::save_window_state,
        system::get_platform, 
        system::get_app_version,
        system::open_url, 
        system::show_main_window, 
        plugins::list_plugins, 
        plugins::read_plugin_file
    ]
}
