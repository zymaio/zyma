use std::fs;
use crate::models::{FileItem, SearchResult};
use walkdir;

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
    if p.is_dir() { fs::remove_dir_all(path).map_err(|e| e.to_string()) } else { fs::remove_file(path).map_err(|e| e.to_string()) }
}

#[tauri::command]
pub fn rename_item(at: String, to: String) -> Result<(), String> { 
    fs::rename(at, to).map_err(|e| e.to_string()) 
}

#[tauri::command]
pub fn search_in_dir(root: String, pattern: String) -> Result<Vec<SearchResult>, String> {
    if pattern.is_empty() { return Ok(Vec::new()); }
    let mut results = Vec::new();
    for entry in walkdir::WalkDir::new(&root).into_iter().filter_entry(|e| {
        let n = e.file_name().to_string_lossy();
        !n.starts_with('.') && n != "node_modules"
    }) {
        let e = if let Ok(e) = entry { e } else { continue };
        if e.path().is_file() {
            if let Ok(c) = fs::read_to_string(e.path()) {
                for (idx, line) in c.lines().enumerate() {
                    if line.contains(&pattern) {
                        results.push(SearchResult { path: e.path().to_string_lossy().to_string(), line: idx + 1, content: line.trim().to_string() });
                    }
                    if results.len() > 500 { break; }
                }
            }
        }
        if results.len() > 500 { break; }
    }
    Ok(results)
}
