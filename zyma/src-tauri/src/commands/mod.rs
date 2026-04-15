pub mod config;
pub mod fs;
pub mod system;
pub mod window;
pub mod plugins;
pub mod search;
pub mod llm;
pub mod context;

// Re-export from services for backward compatibility
pub use crate::services::output::{output_append, output_get_content, output_clear, output_list_channels};
pub use crate::services::watcher::{fs_watch, fs_unwatch};

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
        crate::services::watcher::fs_watch,
        crate::services::watcher::fs_unwatch,
        crate::services::output::output_append,
        crate::services::output::output_get_content,
        crate::services::output::output_clear,
        crate::services::output::output_list_channels,
        context::set_context,
        context::get_context,
        context::get_all_contexts,
        system::context_menu::manage_context_menu,
        system::cli::get_cli_args,
        system::cli::get_cli_matches,
        system::app::system_get_env,
        system::app::system_exec,
        system::app::emit_global_event,
        system::process::is_admin,
        system::process::exit_app,
        system::process::kill_process,
        system::app::get_platform,
        system::app::get_app_version,
        system::app::get_product_name,
        system::app::open_url,
        system::process::system_exit_all_windows,
        window::open_detached_output,
        window::window_create,
        window::show_window,
        window::save_window_state,
        window::show_main_window,
        plugins::list_plugins,
        plugins::read_plugin_file,
        plugins::get_native_extensions,
        plugins::update_sidebar_items,
        plugins::update_native_commands,
        plugins::update_chat_participants,
        plugins::update_auth_providers,
        plugins::update_file_menu_items,
        plugins::update_slot_components,
        llm::llm_chat
    ]
}
