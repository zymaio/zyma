use std::fs;
use std::path::{Path, PathBuf};
use serde::{Serialize, Deserialize};
use tauri::{State, Emitter};
use crate::AppState;
use crate::models::FileItem;

#[tauri::command]
pub fn get_cwd(state: State<'_, AppState>) -> String {
    let path = state.workspace_path.lock().unwrap();
    path.to_string_lossy().to_string()
}

#[tauri::command]
pub fn fs_set_cwd(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>, 
    path: String
) {
    let mut current_path = state.workspace_path.lock().unwrap();
    *current_path = PathBuf::from(&path);
    let _ = app_handle.emit("workspace_changed", path);
}

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileItem>, String> {
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            items.push(FileItem {
                name: entry.file_name().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string().replace("\\", "/"),
                is_dir: path.is_dir(),
            });
        }
    }
    items.sort_by(|a, b| {
        if a.is_dir != b.is_dir { b.is_dir.cmp(&a.is_dir) } 
        else { a.name.cmp(&b.name) }
    });
    Ok(items)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(app_handle: tauri::AppHandle, path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())?;
    let _ = app_handle.emit("file_saved", path);
    Ok(())
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    fs::write(path, "").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_item(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() { fs::remove_dir_all(p).map_err(|e| e.to_string()) } 
    else { fs::remove_file(p).map_err(|e| e.to_string()) }
}

#[tauri::command]
pub fn rename_item(at: String, to: String) -> Result<(), String> {
    fs::rename(at, to).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct FileStat {
    pub file_type: String,
    pub size: u64,
    pub mtime: u64,
}

#[tauri::command]
pub fn fs_stat(path: String) -> Result<FileStat, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let ftype = if metadata.is_dir() { "dir" } else { "file" };
    use std::time::UNIX_EPOCH;
    let mtime = metadata.modified().unwrap_or(UNIX_EPOCH).duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    Ok(FileStat { file_type: ftype.to_string(), size: metadata.len(), mtime })
}
