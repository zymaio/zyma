use std::fs;
use crate::models::{FileItem, SearchResult};
use ignore::WalkBuilder;
use std::sync::mpsc;

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
    if metadata.len() > 5 * 1024 * 1024 {
        return Err("File too large (Max 5MB)".to_string());
    }
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
    if p.is_dir() { 
        fs::remove_dir_all(p).map_err(|e| e.to_string()) 
    } else { 
        fs::remove_file(p).map_err(|e| e.to_string()) 
    }
}

#[tauri::command]
pub fn rename_item(at: String, to: String) -> Result<(), String> { 
    fs::rename(at, to).map_err(|e| e.to_string()) 
}

#[tauri::command]
pub fn search_in_dir(root: String, pattern: String, mode: Option<String>) -> Result<Vec<SearchResult>, String> {
    if pattern.is_empty() { return Ok(Vec::new()); }
    let search_mode = mode.unwrap_or_else(|| "content".to_string());
    let pattern_lower = pattern.to_lowercase();

    // 使用 mpsc channel 收集多线程结果
    let (tx, rx) = mpsc::channel();
    
    // 构建并行遍历器，ignore 库会自动处理 .gitignore
    let walker = WalkBuilder::new(&root)
        .hidden(false) // 允许搜索隐藏文件，但尊重 .gitignore
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .threads(std::cmp::min(8, num_cpus::get())) // 限制最大线程数
        .build_parallel();

    walker.run(|| {
        let tx = tx.clone();
        let pattern_lower = pattern_lower.clone();
        let search_mode = search_mode.clone();
        
        Box::new(move |result| {
            let entry = if let Ok(e) = result { e } else { return ignore::WalkState::Continue };
            if !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                return ignore::WalkState::Continue;
            }

            let path_str = entry.path().to_string_lossy().to_string();
            let filename = entry.file_name().to_string_lossy().to_lowercase();

            if search_mode == "filename" {
                if filename.contains(&pattern_lower) {
                    let _ = tx.send(SearchResult {
                        path: path_str,
                        line: 0,
                        content: "File Match".to_string(),
                    });
                }
            } else {
                // 内容搜索模式
                // 性能保护：超过 500KB 的文件跳过内容搜索
                if let Ok(metadata) = entry.metadata() {
                    if metadata.len() > 500 * 1024 { return ignore::WalkState::Continue; }
                }

                if let Ok(content) = fs::read_to_string(entry.path()) {
                    for (idx, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(&pattern_lower) {
                            let _ = tx.send(SearchResult {
                                path: path_str.clone(),
                                line: idx + 1,
                                content: line.trim().chars().take(100).collect(),
                            });
                        }
                    }
                }
            }
            ignore::WalkState::Continue
        })
    });

    // 收集所有结果
    drop(tx); // 关闭发送端，否则 rx.iter() 永远不会结束
    let mut results: Vec<SearchResult> = rx.into_iter().take(2000).collect();
    
    // 排序结果，让显示更自然
    results.sort_by(|a, b| a.path.cmp(&b.path).then(a.line.cmp(&b.line)));
    
    Ok(results)
}