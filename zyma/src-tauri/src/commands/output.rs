use std::sync::Mutex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use tauri::Emitter;

#[derive(Clone, Serialize, Deserialize)]
pub struct OutputLine {
    pub content: String,
    pub timestamp: u64,
}

pub struct OutputState {
    pub channels: Mutex<HashMap<String, Vec<OutputLine>>>,
}

#[tauri::command]
pub fn output_append(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, OutputState>,
    channel: String,
    content: String
) {
    let mut channels = state.channels.lock().unwrap();
    let is_new = !channels.contains_key(&channel);
    let entry = channels.entry(channel.clone()).or_insert_with(Vec::new);
    
    let line = OutputLine {
        content: content.clone(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    entry.push(line.clone());
    if entry.len() > 1000 { entry.remove(0); }

    // 统一修正为下划线格式，确保前端能监听到
    if is_new {
        let _ = app_handle.emit("output_channel_created", channel.clone());
    }

    // 修正内容广播名，支持前端 OutputPanel 的监听
    let event_name = format!("output_{}", channel);
    let _ = app_handle.emit(&event_name, line);
}

#[tauri::command]
pub fn output_get_content(
    state: tauri::State<'_, OutputState>,
    channel: String
) -> Vec<OutputLine> {
    let channels = state.channels.lock().unwrap();
    channels.get(&channel).cloned().unwrap_or_default()
}

#[tauri::command]
pub fn output_clear(
    state: tauri::State<'_, OutputState>,
    channel: String
) {
    let mut channels = state.channels.lock().unwrap();
    if let Some(entry) = channels.get_mut(&channel) {
        entry.clear();
    }
}

#[tauri::command]
pub fn output_list_channels(
    state: tauri::State<'_, OutputState>
) -> Vec<String> {
    let channels = state.channels.lock().unwrap();
    channels.keys().cloned().collect()
}
