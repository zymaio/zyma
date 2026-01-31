use std::path::PathBuf;
use tauri::{State, Emitter};
use crate::models::FileItem;
use crate::bus::{EventBus, ZymaEvent};
use crate::services::vfs::{FileSystem, LocalFileSystem, FileStat};

pub struct WorkspaceService {
    pub fs: Box<dyn FileSystem + Send + Sync>,
}

impl WorkspaceService {
    pub fn new(initial_path: PathBuf) -> Self {
        Self {
            fs: Box::new(LocalFileSystem::new(initial_path)),
        }
    }
    
    pub fn with_fs(fs: Box<dyn FileSystem + Send + Sync>) -> Self {
        Self { fs }
    }
}

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
    let _ = app_handle.emit("workspace_changed", &path);
    bus.publish(ZymaEvent::WorkspaceChanged(path));
    Ok(())
}

#[tauri::command]
pub async fn read_dir(ws: State<'_, WorkspaceService>, path: String) -> Result<Vec<FileItem>, String> {
    ws.fs.read_dir(&path).await
}

#[tauri::command]
pub async fn read_file(ws: State<'_, WorkspaceService>, path: String) -> Result<String, String> {
    ws.fs.read_file(&path).await
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
    ws.fs.create_dir(&path).await
}

#[tauri::command]
pub async fn remove_item(ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String) -> Result<(), String> {
    ws.fs.remove_item(&path).await?;
    bus.publish(ZymaEvent::FileDeleted(path));
    Ok(())
}

#[tauri::command]
pub async fn rename_item(ws: State<'_, WorkspaceService>, at: String, to: String) -> Result<(), String> {
    ws.fs.rename_item(&at, &to).await
}

#[tauri::command]
pub async fn fs_stat(ws: State<'_, WorkspaceService>, path: String) -> Result<FileStat, String> {
    ws.fs.stat(&path).await
}