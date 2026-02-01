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

use crate::models::SearchResult;
use ignore::WalkBuilder;
use std::sync::mpsc;
use globset::{Glob, GlobSetBuilder, GlobSet};
use walkdir::WalkDir;
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use regex::RegexBuilder;

// ... (is_binary function remains same)

#[tauri::command]
pub fn search_in_dir(
    root: String, 
    pattern: String, 
    mode: Option<String>,
    case_sensitive: Option<bool>,
    whole_word: Option<bool>,
    use_regex: Option<bool>,
    include: Option<String>,
    exclude: Option<String>
) -> Result<Vec<SearchResult>, String> {
    if pattern.is_empty() { return Ok(Vec::new()); }
    let search_mode = mode.unwrap_or_else(|| "content".to_string());
    let is_case_sensitive = case_sensitive.unwrap_or(false);
    let is_whole_word = whole_word.unwrap_or(false);
    let is_regex = use_regex.unwrap_or(false);

    // 1. 准备匹配器 (正则或纯文字)
    let regex = if is_regex || is_whole_word {
        let mut final_pattern = if is_regex { pattern.clone() } else { regex::escape(&pattern) };
        if is_whole_word {
            final_pattern = format!(r"\b{}\b", final_pattern);
        }
        Some(RegexBuilder::new(&final_pattern)
            .case_insensitive(!is_case_sensitive)
            .build()
            .map_err(|e| e.to_string())?)
    } else {
        None
    };

    // 2. 准备文件过滤器
    let include_set = include.and_then(|s| {
        let mut b = GlobSetBuilder::new();
        for p in s.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            b.add(Glob::new(p).ok()?);
        }
        b.build().ok()
    });
    let exclude_set = exclude.and_then(|s| {
        let mut b = GlobSetBuilder::new();
        for p in s.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            b.add(Glob::new(p).ok()?);
        }
        b.build().ok()
    });

    let (tx, rx) = mpsc::channel();
    let walker = WalkBuilder::new(&root)
        .threads(std::cmp::min(8, num_cpus::get()))
        .build_parallel();

    walker.run(|| {
        let tx = tx.clone();
        let pattern = pattern.clone();
        let regex = regex.clone();
        let search_mode = search_mode.clone();
        let root_path = std::path::Path::new(&root).to_path_buf();
        let include_set = include_set.clone();
        let exclude_set = exclude_set.clone();
        
        Box::new(move |result| {
            let entry = if let Ok(e) = result { e } else { return ignore::WalkState::Continue };
            if !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                return ignore::WalkState::Continue;
            }

            let path = entry.path();
            let rel_path_raw = path.strip_prefix(&root_path).unwrap_or(path);
            let rel_path_str = rel_path_raw.to_string_lossy().replace("\\", "/");

            // 文件过滤
            if let Some(ref set) = include_set {
                if !set.is_match(&rel_path_str) { return ignore::WalkState::Continue; }
            }
            if let Some(ref set) = exclude_set {
                if set.is_match(&rel_path_str) { return ignore::WalkState::Continue; }
            }

            if search_mode == "filename" {
                let is_match = if let Some(ref re) = regex {
                    re.is_match(&rel_path_str)
                } else {
                    if is_case_sensitive { rel_path_str.contains(&pattern) }
                    else { rel_path_str.to_lowercase().contains(&pattern.to_lowercase()) }
                };

                if is_match {
                    let _ = tx.send(SearchResult { 
                        path: path.to_string_lossy().replace("\\", "/"), 
                        line: 0, 
                        content: String::new() 
                    });
                }
            } else {
                if is_binary(path) { return ignore::WalkState::Continue; }
                
                if let Ok(file) = File::open(path) {
                    let reader = BufReader::new(file);
                    for (idx, line_res) in reader.lines().enumerate() {
                        if let Ok(line) = line_res {
                            if line.len() > 10000 { continue; }
                            
                            let is_match = if let Some(ref re) = regex {
                                re.is_match(&line)
                            } else {
                                if is_case_sensitive { line.contains(&pattern) }
                                else { line.to_lowercase().contains(&pattern.to_lowercase()) }
                            };

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