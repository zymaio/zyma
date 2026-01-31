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
    
    // 允许替换底层 FS（供 Pro 版使用）
    pub fn with_fs(fs: Box<dyn FileSystem + Send + Sync>) -> Self {
        Self { fs }
    }
}

#[tauri::command]
pub fn get_cwd(ws: State<'_, WorkspaceService>) -> String {
    ws.fs.get_cwd()
}

#[tauri::command]
pub fn fs_set_cwd(
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
pub fn read_dir(ws: State<'_, WorkspaceService>, path: String) -> Result<Vec<FileItem>, String> {
    ws.fs.read_dir(&path)
}

#[tauri::command]
pub fn read_file(ws: State<'_, WorkspaceService>, path: String) -> Result<String, String> {
    ws.fs.read_file(&path)
}

#[tauri::command]
pub fn write_file(app_handle: tauri::AppHandle, ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String, content: String) -> Result<(), String> {
    ws.fs.write_file(&path, &content)?;
    // 注意：这里的 path 可能是相对路径，事件广播最好是绝对路径，
    // 但由于 VFS 抽象层可能没有绝对路径的概念（如云端），我们暂时广播传入的 path。
    // 在 LocalFS 实现中，我们实际上操作的是安全路径。
    let _ = app_handle.emit("file_saved", &path);
    bus.publish(ZymaEvent::FileSaved(path));
    Ok(())
}

#[tauri::command]
pub fn create_file(ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String) -> Result<(), String> {
    ws.fs.create_file(&path)?;
    bus.publish(ZymaEvent::FileCreated(path));
    Ok(())
}

#[tauri::command]
pub fn create_dir(ws: State<'_, WorkspaceService>, path: String) -> Result<(), String> {
    ws.fs.create_dir(&path)
}

#[tauri::command]
pub fn remove_item(ws: State<'_, WorkspaceService>, bus: State<'_, EventBus>, path: String) -> Result<(), String> {
    ws.fs.remove_item(&path)?;
    bus.publish(ZymaEvent::FileDeleted(path));
    Ok(())
}

#[tauri::command]
pub fn rename_item(ws: State<'_, WorkspaceService>, at: String, to: String) -> Result<(), String> {
    ws.fs.rename_item(&at, &to)
}

#[tauri::command]
pub fn fs_stat(ws: State<'_, WorkspaceService>, path: String) -> Result<FileStat, String> {
    ws.fs.stat(&path)
}
