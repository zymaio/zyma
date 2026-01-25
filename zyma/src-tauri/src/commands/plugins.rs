use std::fs;
use crate::models::PluginManifest;
use std::path::{Path, PathBuf};
use tauri::State;

/// 剥离 Windows 下 canonicalize 产生的 \\?\ 前缀
fn simplify_path(p: PathBuf) -> String {
    let s = p.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") {
        s[4..].to_string()
    } else {
        s
    }
}

#[tauri::command]
pub fn list_plugins(
    state: tauri::State<'_, crate::AppState>
) -> Result<Vec<(String, PluginManifest, bool)>, String> {
    let mut plugins = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    let system_paths = vec![
        PathBuf::from("../plugins"),
        PathBuf::from("plugins"),
    ];
    let user_path = get_user_plugins_dir();

    for p_dir in system_paths {
        scan_dir(&p_dir, true, &mut plugins, &mut seen_names);
    }
    scan_dir(&user_path, false, &mut plugins, &mut seen_names);

    // 扫描通过命令行参数传入的动态路径
    for p_dir in &state.external_plugins {
        scan_dir(p_dir, false, &mut plugins, &mut seen_names);
    }

    Ok(plugins)
}

fn scan_dir(dir: &Path, is_builtin: bool, plugins: &mut Vec<(String, PluginManifest, bool)>, seen: &mut std::collections::HashSet<String>) {
    if !dir.exists() || !dir.is_dir() { return; }
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries {
            let e = if let Ok(e) = entry { e } else { continue };
            let p = e.path();
            if p.is_dir() {
                let mp = p.join("manifest.json");
                if mp.exists() {
                    if let Ok(c) = fs::read_to_string(mp) {
                        if let Ok(m) = serde_json::from_str::<PluginManifest>(&c) {
                            if seen.contains(&m.name) { continue; }
                            if let Ok(abs_p) = fs::canonicalize(&p) {
                                seen.insert(m.name.clone());
                                // 使用 simplify_path 确保前端兼容性
                                plugins.push((simplify_path(abs_p), m, is_builtin));
                            }
                        }
                    }
                }
            }
        }
    }
}

fn get_user_plugins_dir() -> PathBuf {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    let p = Path::new(&home).join(".zyma").join("plugins");
    if !p.exists() { let _ = fs::create_dir_all(&p); }
    p
}

#[tauri::command]
pub fn read_plugin_file(path: String) -> Result<String, String> { 
    let mut p = PathBuf::from(&path);
    // 尝试规范化路径以处理分隔符问题
    if let Ok(canon) = fs::canonicalize(&p) {
        p = canon;
    }

    // 安全校验：向上查找直到找到 manifest.json (防止读取系统任意文件)
    let mut current = p.parent();
    let mut found = false;
    // 最多向上找 5 层
    for _ in 0..5 {
        if let Some(dir) = current {
            if dir.join("manifest.json").exists() {
                found = true;
                break;
            }
            current = dir.parent();
        } else {
            break;
        }
    }
    
    // 特殊情况：如果读取的就是 manifest.json 本身
    if !found && p.file_name().and_then(|n| n.to_str()) == Some("manifest.json") {
         found = true;
    }

    if !found {
        return Err(format!("Unauthorized: Cannot read files outside plugin scope. Path: {}", path));
    }
    fs::read_to_string(p).map_err(|e| e.to_string()) 
}

#[tauri::command]
pub fn get_plugins_root() -> String {
    simplify_path(get_user_plugins_dir())
}