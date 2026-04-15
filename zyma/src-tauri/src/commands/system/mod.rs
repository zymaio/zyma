pub mod process;
pub mod cli;
pub mod app;
pub mod context_menu;

// Re-export all commands for backward compatibility
pub use process::{kill_process, exit_app, system_exit_all_windows, is_admin};
pub use cli::{get_cli_args, get_cli_matches};
pub use app::{open_url, get_app_version, get_product_name, get_platform, system_get_env, system_exec, emit_global_event, ExecResult};
pub use context_menu::manage_context_menu;
