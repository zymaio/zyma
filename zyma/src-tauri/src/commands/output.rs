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
    state: tauri::State<'_, crate::AppState>,
    channel: String,
    content: String
) {
    let mut channels = state.output.channels.lock().unwrap();
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

    // 如果是新频道，通知前端显示图标
    if is_new {
        let _ = app_handle.emit("output-channel-created", channel.clone());
    }

    // 实时广播给前端内容
    let _ = app_handle.emit(&format!("output-{}", channel), line);
}

#[tauri::command]
pub fn output_get_content(
    state: tauri::State<'_, crate::AppState>,
    channel: String
) -> Vec<OutputLine> {
    let channels = state.output.channels.lock().unwrap();
    channels.get(&channel).cloned().unwrap_or_default()
}

#[tauri::command]
pub fn output_clear(
    state: tauri::State<'_, crate::AppState>,
    channel: String
) {
    let mut channels = state.output.channels.lock().unwrap();
    if let Some(entry) = channels.get_mut(&channel) {
        entry.clear();
    }
}
