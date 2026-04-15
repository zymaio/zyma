#[tauri::command]
pub fn get_cli_args() -> Vec<String> { std::env::args().collect() }

#[tauri::command]
pub fn get_cli_matches(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_cli::CliExt;
    match app_handle.cli().matches() {
        Ok(matches) => Ok(serde_json::to_value(matches).unwrap_or(serde_json::Value::Null)),
        Err(e) => Err(e.to_string()),
    }
}
