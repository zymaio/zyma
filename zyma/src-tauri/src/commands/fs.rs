use std::fs;
use crate::models::FileItem;

#[derive(serde::Serialize)]
pub struct FileStat {
    pub file_type: String, // "file", "dir", "symlink", "unknown"
    pub size: u64,
    pub mtime: u64,
}

#[tauri::command]
pub fn fs_stat(path: String) -> Result<FileStat, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let file_type = if metadata.is_dir() { "dir" } 
                    else if metadata.is_file() { "file" } 
                    else if metadata.file_type().is_symlink() { "symlink" } 
                    else { "unknown" };

    let mtime = metadata.modified()
        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
        .unwrap_or(0);

    Ok(FileStat { file_type: file_type.to_string(), size: metadata.len(), mtime })
}

#[tauri::command]
pub fn get_cwd() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileItem>, String> {
    let dir_path = if path.is_empty() { "." } else { &path };
    let entries = fs::read_dir(dir_path).map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        items.push(FileItem { 
            name: p.file_name().unwrap_or_default().to_string_lossy().to_string(), 
            path: p.to_string_lossy().to_string(), 
            is_dir: p.is_dir() 
        });
    }
    items.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    Ok(items)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.len() > 5 * 1024 * 1024 { return Err("File too large (Max 5MB)".to_string()); }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.iter().take(1024).any(|&b| b == 0) { return Err("Binary file".to_string()); }
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> { fs::write(path, content).map_err(|e| e.to_string()) }

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> { fs::write(path, "").map_err(|e| e.to_string()) }

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> { fs::create_dir_all(path).map_err(|e| e.to_string()) }

#[tauri::command]
pub fn remove_item(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() { fs::remove_dir_all(p).map_err(|e| e.to_string()) } 
    else { fs::remove_file(p).map_err(|e| e.to_string()) }
}

#[tauri::command]
pub fn rename_item(at: String, to: String) -> Result<(), String> { fs::rename(at, to).map_err(|e| e.to_string()) }