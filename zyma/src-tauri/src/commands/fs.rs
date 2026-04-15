use tauri::{State, Emitter};
use crate::models::FileItem;
use crate::bus::{EventBus, ZymaEvent};
use crate::services::vfs::FileStat;
use crate::services::workspace::WorkspaceService;
use crate::services::recent_workspaces::add_recent_workspace;

#[tauri::command]
pub async fn get_cwd(ws: State<'_, WorkspaceService>) -> Result<String, String> {
    Ok(ws.fs.get_cwd())
}

#[tauri::command]
pub async fn fs_set_cwd(
    app_handle: tauri::AppHandle,
    ws: State<'_, WorkspaceService>, 
    bus: State<'_, EventBus>,
    path: String
) -> Result<(), String> {
    ws.fs.set_cwd(&path)?;
    
    // Use the recent workspaces service to handle normalization and persistence
    let normalized_path = add_recent_workspace(&path)?;

    let _ = app_handle.emit("workspace_changed", &normalized_path);
    bus.publish(ZymaEvent::WorkspaceChanged(normalized_path));
    Ok(())
}

#[tauri::command]
pub async fn read_dir(ws: State<'_, WorkspaceService>, path: String) -> Result<Vec<FileItem>, String> {
    ws.fs.read_dir(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file(ws: State<'_, WorkspaceService>, path: String) -> Result<crate::models::FileReadResponse, String> {
    ws.fs.read_file(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(app_handle: tauri::AppHandle, ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String, content: String) -> Result<(), String> {
    ws.fs.write_file(&path, &content).await?;
    let _ = app_handle.emit("file_saved", &path);
    bus.publish(ZymaEvent::FileSaved(path));
    Ok(())
}

#[tauri::command]
pub async fn create_file(ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String) -> Result<(), String> {
    ws.fs.create_file(&path).await?;
    bus.publish(ZymaEvent::FileCreated(path));
    Ok(())
}

#[tauri::command]
pub async fn create_dir(ws: State<'_, WorkspaceService>, path: String) -> Result<(), String> {
    ws.fs.create_dir(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_item(ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String) -> Result<(), String> {
    ws.fs.remove_item(&path).await?;
    bus.publish(ZymaEvent::FileDeleted(path));
    Ok(())
}

#[tauri::command]
pub async fn rename_item(ws: State<'_, WorkspaceService>, at: String, to: String) -> Result<(), String> {
    ws.fs.rename_item(&at, &to).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_stat(ws: State<'_, WorkspaceService>, path: String) -> Result<FileStat, String> {
    ws.fs.stat(&path).await.map_err(|e| e.to_string())
}
