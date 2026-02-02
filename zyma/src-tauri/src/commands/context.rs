use tauri::{State, Emitter};
use crate::services::ContextService;
use serde_json::Value;

#[tauri::command]
pub fn set_context(
    app_handle: tauri::AppHandle,
    state: State<'_, ContextService>,
    key: String,
    value: Value
) -> Result<(), String> {
    state.set(key.clone(), value.clone());
    // 发出事件通知前端状态已变
    let _ = app_handle.emit("zyma:context-changed", serde_json::json!({
        "key": key,
        "value": value
    }));
    Ok(())
}

#[tauri::command]
pub fn get_context(
    state: State<'_, ContextService>,
    key: String
) -> Option<Value> {
    state.get(&key)
}

#[tauri::command]
pub fn get_all_contexts(
    state: State<'_, ContextService>
) -> serde_json::Value {
    serde_json::to_value(state.get_all()).unwrap_or(serde_json::json!({}))
}
