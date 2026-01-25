use crate::models::SearchResult;
use ignore::WalkBuilder;
use std::sync::mpsc;
use globset::{Glob, GlobSetBuilder};
use walkdir::WalkDir;

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
    let pattern_lower = pattern.to_lowercase();

    let (tx, rx) = mpsc::channel();
    let walker = WalkBuilder::new(&root)
        .threads(std::cmp::min(8, num_cpus::get()))
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
                        content: String::new() 
                    });
                }
            } else {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.len() > 500 * 1024 { return ignore::WalkState::Continue; }
                }
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
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

    drop(tx);
    let mut results: Vec<SearchResult> = rx.into_iter().take(2000).collect();
    results.sort_by(|a, b| a.path.cmp(&b.path).then(a.line.cmp(&b.line)));
    Ok(results)
}