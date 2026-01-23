use std::fs;
use crate::models::{FileItem, SearchResult};
use walkdir;

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
pub fn search_in_dir(root: String, pattern: String, mode: Option<String>) -> Result<Vec<SearchResult>, String> {
    if pattern.is_empty() { return Ok(Vec::new()); }
    let search_mode = mode.unwrap_or_else(|| "content".to_string());
    let mut results = Vec::new();
    
    // 预处理 pattern 为小写，用于忽略大小写搜索
    let pattern_lower = pattern.to_lowercase();

    // 严格过滤：必须忽略构建目录和版本控制目录，否则会卡死
    let ignore_dirs = vec!["node_modules", ".git", "target", "dist", "build", ".vscode", ".idea"];

    for entry in walkdir::WalkDir::new(&root).into_iter().filter_entry(|e| {
        let n = e.file_name().to_string_lossy();
        // 修复：不要过滤当前目录 "."
        let is_ignored = (n.starts_with('.') && n != ".") || ignore_dirs.iter().any(|d| n == *d);
        !is_ignored
    }) {
        let e = if let Ok(e) = entry { e } else { continue };
        let path_str = e.path().to_string_lossy().to_string();

        // 1. 文件名搜索模式
        if search_mode == "filename" {
            // ... (保持之前的通配符逻辑不变) ...
            let filename = e.file_name().to_string_lossy().to_lowercase();
            // let p_lower = pattern.to_lowercase(); // 已经有 pattern_lower 了
            
            let is_match = if pattern_lower == "*" {
                true
            } else if pattern_lower.starts_with("*") && pattern_lower.ends_with("*") {
                if pattern_lower.len() > 2 {
                    filename.contains(&pattern_lower[1..pattern_lower.len()-1])
                } else {
                    true 
                }
            } else if pattern_lower.starts_with("*") {
                if pattern_lower.len() > 1 {
                    filename.ends_with(&pattern_lower[1..])
                } else {
                    true
                }
            } else if pattern_lower.ends_with("*") {
                if pattern_lower.len() > 1 {
                    filename.starts_with(&pattern_lower[..pattern_lower.len()-1])
                } else {
                    true
                }
            } else {
                filename.contains(&pattern_lower)
            };

            if is_match {
                results.push(SearchResult { 
                    path: path_str, 
                    line: 0, 
                    content: "File Match".to_string() 
                });
            }
        } 
        // 2. 内容搜索模式 (仅限文件)
        else if e.path().is_file() {
            // 性能保护：检查文件大小，超过 500KB 跳过内容搜索
            if let Ok(metadata) = e.metadata() {
                if metadata.len() > 500 * 1024 { continue; } 
            }

            // 尝试读取文本
            if let Ok(c) = fs::read_to_string(e.path()) {
                for (idx, line) in c.lines().enumerate() {
                    // 忽略大小写搜索
                    if line.to_lowercase().contains(&pattern_lower) {
                        results.push(SearchResult { 
                            path: path_str.clone(), 
                            line: idx + 1, 
                            content: line.trim().chars().take(100).collect() 
                        });
                    }
                    if results.len() > 2000 { break; } 
                }
            }
        }
        if results.len() > 2000 { break; }
    }
    Ok(results)
}
