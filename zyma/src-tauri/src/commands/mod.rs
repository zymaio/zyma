pub mod config;
pub mod fs;
pub mod system;
pub mod window;
pub mod plugins;
pub mod output;
pub mod search;
pub mod watcher;
pub mod llm;

pub fn get_handlers() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
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
        system::is_admin, 
        system::exit_app,
        system::kill_process,
        system::get_platform, 
        system::get_app_version,
        system::get_product_name,
        system::get_native_extensions,
        system::open_url, 
        system::system_exit_all_windows,
        window::open_detached_output,
        window::show_window,
        window::save_window_state,
        window::show_main_window, 
        plugins::list_plugins, 
        plugins::read_plugin_file,
        llm::llm_chat
    ]
}
