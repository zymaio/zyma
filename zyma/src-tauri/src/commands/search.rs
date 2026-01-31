use crate::models::SearchResult;
use ignore::WalkBuilder;
use std::sync::mpsc;
use globset::{Glob, GlobSetBuilder};
use walkdir::WalkDir;
use std::fs::File;
use std::io::{BufRead, BufReader, Read};

// 简单的二进制文件检测：检查前 1024 字节是否包含 NULL 字符
fn is_binary(path: &std::path::Path) -> bool {
    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return false,
    };
    let mut buffer = [0; 1024];
    let n = match file.read(&mut buffer) {
        Ok(n) => n,
        Err(_) => return false,
    };
    buffer[..n].contains(&0)
}

#[tauri::command]
pub fn fs_find_files(base_dir: String, include: String, exclude: Option<String>) -> Result<Vec<String>, String> {
    let include_glob = Glob::new(&include).map_err(|e| e.to_string())?.compile_matcher();
    let exclude_matcher = if let Some(ex) = exclude {
        let mut builder = GlobSetBuilder::new();
        builder.add(Glob::new(&ex).map_err(|e| e.to_string())?);
        Some(builder.build().map_err(|e| e.to_string())?)
    } else {
        None
    };

    let mut results = Vec::new();
    let walker = WalkDir::new(base_dir).into_iter();

    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            if include_glob.is_match(path) {
                if let Some(ref matcher) = exclude_matcher {
                    if matcher.is_match(path) {
                        continue;
                    }
                }
                results.push(path.to_string_lossy().replace("\\", "/"));
            }
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn search_in_dir(root: String, pattern: String, mode: Option<String>) -> Result<Vec<SearchResult>, String> {
    if pattern.is_empty() { return Ok(Vec::new()); }
    let search_mode = mode.unwrap_or_else(|| "content".to_string());
    
    // 现代匹配逻辑：Smart Case + 多关键词 (AND)
    // 1. 检查是否包含大写字母
    let is_case_sensitive = pattern.chars().any(|c| c.is_uppercase());
    
    // 2. 准备关键词片段
    let terms: Vec<String> = pattern
        .split_whitespace()
        .map(|s| if is_case_sensitive { s.to_string() } else { s.to_lowercase() })
        .collect();

    if terms.is_empty() { return Ok(Vec::new()); }

    let (tx, rx) = mpsc::channel();
    let walker = WalkBuilder::new(&root)
        .threads(std::cmp::min(8, num_cpus::get()))
        .build_parallel();

    walker.run(|| {
        let tx = tx.clone();
        let terms = terms.clone();
        let search_mode = search_mode.clone();
        let root_path = std::path::Path::new(&root).to_path_buf();
        
        Box::new(move |result| {
            let entry = if let Ok(e) = result { e } else { return ignore::WalkState::Continue };
            if !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                return ignore::WalkState::Continue;
            }

            let path = entry.path();
            let rel_path_raw = path.strip_prefix(&root_path).unwrap_or(path);
            let rel_path_str = rel_path_raw.to_string_lossy().replace("\\", "/");
            let target_for_path_match = if is_case_sensitive { rel_path_str.clone() } else { rel_path_str.to_lowercase() };

            if search_mode == "filename" {
                // 文件名搜索：匹配相对路径（支持用户输入文件夹名定位）
                let is_match = terms.iter().all(|t| target_for_path_match.contains(t));

                if is_match {
                    let _ = tx.send(SearchResult { 
                        path: path.to_string_lossy().replace("\\", "/"), 
                        line: 0, 
                        content: String::new() 
                    });
                }
            } else {
                // 内容搜索
                if is_binary(path) {
                     return ignore::WalkState::Continue;
                }
                
                if let Ok(file) = File::open(path) {
                    let reader = BufReader::new(file);
                    for (idx, line_res) in reader.lines().enumerate() {
                        if let Ok(line) = line_res {
                            if line.len() > 10000 { continue; }
                            
                            let target_line = if is_case_sensitive { line.clone() } else { line.to_lowercase() };
                            let is_match = terms.iter().all(|t| target_line.contains(t));

                            if is_match {
                                let _ = tx.send(SearchResult {
                                    path: path.to_string_lossy().replace("\\", "/"),
                                    line: idx + 1,
                                    content: line.trim().chars().take(100).collect(),
                                });
                                if idx > 2000 { break; } 
                            }
                        }
                    }
                }
            }
            ignore::WalkState::Continue
        })
    });

    drop(tx);
    let mut results: Vec<SearchResult> = rx.into_iter().take(2000).collect();
    results.sort_by(|a, b| a.path.cmp(&b.path).then(a.line.cmp(&b.line)));
    Ok(results)
}