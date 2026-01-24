use std::fs;
use crate::models::PluginManifest;
use std::path::{Path, PathBuf};

/// 剥离 Windows 下 canonicalize 产生的 \\?\ 前缀
fn simplify_path(p: PathBuf) -> String {
    let s = p.to_string_lossy().to_string();
    if s.starts_with(r"\\\\") {
        s[4..].to_string()
    } else {
        s
    }
}

#[tauri::command]
pub fn list_plugins() -> Result<Vec<(String, PluginManifest, bool)>, String> {
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
    let p = Path::new(&path);
    // 安全校验：确保只读取包含 manifest.json 的插件目录内的文件
    let parent = p.parent().unwrap_or(Path::new(""));
    if !parent.join("manifest.json").exists() && !p.ends_with("manifest.json") {
        return Err("Unauthorized: Cannot read files outside plugin scope".to_string());
    }
    fs::read_to_string(p).map_err(|e| e.to_string()) 
}

#[tauri::command]
pub fn get_plugins_root() -> String {
    simplify_path(get_user_plugins_dir())
}