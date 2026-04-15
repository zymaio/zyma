use std::sync::Mutex;
use std::collections::HashMap;

pub struct OutputState {
    pub channels: Mutex<HashMap<String, Vec<String>>>,
}

impl OutputState {
    pub fn new() -> Self {
        Self {
            channels: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub fn output_append(
    state: tauri::State<'_, OutputState>,
    channel: String,
    content: String,
) -> Result<(), String> {
    let mut channels = state.channels.lock().map_err(|e| e.to_string())?;
    channels.entry(channel).or_default().push(content);
    Ok(())
}

#[tauri::command]
pub fn output_get_content(
    state: tauri::State<'_, OutputState>,
    channel: String,
) -> Result<String, String> {
    let channels = state.channels.lock().map_err(|e| e.to_string())?;
    Ok(channels.get(&channel).map(|lines| lines.join("\n")).unwrap_or_default())
}

#[tauri::command]
pub fn output_clear(
    state: tauri::State<'_, OutputState>,
    channel: String,
) -> Result<(), String> {
    let mut channels = state.channels.lock().map_err(|e| e.to_string())?;
    if let Some(lines) = channels.get_mut(&channel) {
        lines.clear();
    }
    Ok(())
}

#[tauri::command]
pub fn output_list_channels(
    state: tauri::State<'_, OutputState>,
) -> Result<Vec<String>, String> {
    let channels = state.channels.lock().map_err(|e| e.to_string())?;
    Ok(channels.keys().cloned().collect())
}
