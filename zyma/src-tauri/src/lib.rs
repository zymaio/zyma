use std::fs;
use serde::{Serialize, Deserialize};
use walkdir;
use tauri::{Emitter, AppHandle};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileItem {
    name: String,
    path: String,
    is_dir: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    path: String,
    line: usize,
    content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppSettings {
    theme: String,
    font_size: u32,
    tab_size: u32,
    language: String,
    context_menu: bool,
    single_instance: bool,
    auto_update: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginManifest {
    name: String,
    version: String,
    author: String,
    entry: String,
    description: Option<String>,
}

fn get_config_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    std::path::Path::new(&home).join(".zyma_config.json")
}

#[tauri::command]
fn load_settings() -> Result<AppSettings, String> {
    let path = get_config_path();
    let mut settings = AppSettings {
        theme: "dark".to_string(),
        font_size: 14,
        tab_size: 4,
        language: "zh-CN".to_string(),
        context_menu: false,
        single_instance: true,
        auto_update: true,
    };

    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(t) = val.get("theme").and_then(|v| v.as_str()) { settings.theme = t.to_string(); }
                if let Some(f) = val.get("font_size").and_then(|v| v.as_u64()) { settings.font_size = f as u32; }
                if let Some(s) = val.get("tab_size").and_then(|v| v.as_u64()) { settings.tab_size = s as u32; }
                if let Some(l) = val.get("language").and_then(|v| v.as_str()) { settings.language = l.to_string(); }
                if let Some(c) = val.get("context_menu").and_then(|v| v.as_bool()) { settings.context_menu = c; }
                if let Some(si) = val.get("single_instance").and_then(|v| v.as_bool()) { settings.single_instance = si; }
                if let Some(au) = val.get("auto_update").and_then(|v| v.as_bool()) { settings.auto_update = au; }
            }
        }
    }

    #[cfg(windows)]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let hk_cu = RegKey::predef(HKEY_CURRENT_USER);
        let check_path = r"Software\Classes\*\shell\EditWithZyma";
        let is_enabled = hk_cu.open_subkey(check_path).is_ok();
        settings.context_menu = is_enabled;
    }

    Ok(settings)
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[cfg(windows)]
#[tauri::command]
async fn manage_context_menu(_app: AppHandle, enable: bool, label: String) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let raw_path = exe_path.to_str().unwrap_or_default().trim_matches('"');
    let hk_cu = RegKey::predef(HKEY_CURRENT_USER);
    let paths = vec![ r"Software\Classes\*\shell\EditWithZyma", r"Software\Classes\Directory\shell\EditWithZyma" ];
    
    if enable {
        for p in paths {
            let (key, _) = hk_cu.create_subkey(p).map_err(|e| e.to_string())?;
            key.set_value("", &label).ok();
            key.set_value("MUIVerb", &label).ok();
            key.set_value("Icon", &raw_path).ok();
            
            let cmd_path = format!("{}\\command", p);
            let (cmd_key, _) = hk_cu.create_subkey(&cmd_path).map_err(|e| e.to_string())?;
            let cmd_val = format!("\"{}\" \"%1\"", raw_path);
            cmd_key.set_value("", &cmd_val).ok();
        }
    } else {
        for p in paths { let _ = hk_cu.delete_subkey_all(p); }
        let _ = hk_cu.delete_subkey_all(r"Software\Classes\*\shell\OpenWithZyma");
        let _ = hk_cu.delete_subkey_all(r"Software\Classes\Directory\shell\OpenWithZyma");
    }
    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
async fn manage_context_menu(_app: AppHandle, _enable: bool, _label: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
fn is_admin() -> bool {
    #[cfg(windows)] {
        use std::ptr;
        use winapi::um::processthreadsapi::{GetCurrentProcess, OpenProcessToken};
        use winapi::um::securitybaseapi::GetTokenInformation;
        use winapi::um::winnt::{TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
        let mut is_elevated = false;
        unsafe {
            let mut token = ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) != 0 {
                let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
                let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
                if GetTokenInformation(token, TokenElevation, &mut elevation as *mut _ as *mut _, size, &mut size) != 0 {
                    is_elevated = elevation.TokenIsElevated != 0;
                }
            }
        }
        is_elevated
    }
    #[cfg(not(windows))] { true }
}

#[tauri::command]
fn exit_app() { std::process::exit(0); }

#[tauri::command]
fn get_cli_args() -> Vec<String> { std::env::args().collect() }

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(&["/C", "start", &url])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))] {
        std::process::Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn check_update_racing() -> Result<UpdateInfo, String> {
    let urls = vec![
        ("Gitee", "https://gitee.com/api/v5/repos/zymaio/zyma/releases/latest"),
        ("GitHub", "https://api.github.com/repos/zymaio/zyma/releases/latest")
    ];

    for (source, url) in urls {
        let output = if cfg!(windows) {
            use std::os::windows::process::CommandExt;
            let ps_cmd = format!(
                "$ProgressPreference = 'SilentlyContinue'; Invoke-RestMethod -Uri '{}' -Method Get -TimeoutSec 5 -Headers @{{'User-Agent'='Zyma'}} | ConvertTo-Json -Depth 5 -Compress",
                url
            );
            std::process::Command::new("powershell")
                .args(&["-Command", &ps_cmd])
                .creation_flags(0x08000000)
                .output()
        } else {
            std::process::Command::new("curl")
                .args(&["-L", "-s", "-A", "Zyma", "--max-time", "5", url])
                .output()
        };

        if let Ok(out) = output {
            if out.status.success() {
                let body = String::from_utf8_lossy(&out.stdout);
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                    if let Some(tag_name) = json.get("tag_name").and_then(|v| v.as_str()) {
                        let version = tag_name.trim_start_matches('v').to_string();
                        return Ok(UpdateInfo {
                            version,
                            source: source.to_string(),
                            url: if source == "Gitee" { "https://gitee.com/zymaio/zyma/releases" } else { "https://github.com/zymaio/zyma/releases" }.to_string()
                        });
                    }
                }
            }
        }
    }
    Err("Update check failed".to_string())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateInfo {
    version: String,
    source: String,
    url: String,
}

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<FileItem>, String> {
    let dir_path = if path.is_empty() { "." } else { &path };
    let entries = fs::read_dir(dir_path).map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for entry in entries {
        let e = if let Ok(e) = entry { e } else { continue };
        let p = e.path();
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
fn read_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.iter().take(1024).any(|&b| b == 0) { return Err("Binary file".to_string()); }
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> { fs::write(path, content).map_err(|e| e.to_string()) }

#[tauri::command]
fn create_file(path: String) -> Result<(), String> { fs::write(path, "").map_err(|e| e.to_string()) }

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> { fs::create_dir_all(path).map_err(|e| e.to_string()) }

#[tauri::command]
fn remove_item(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() { fs::remove_dir_all(path).map_err(|e| e.to_string()) } else { fs::remove_file(path).map_err(|e| e.to_string()) }
}

#[tauri::command]
fn rename_item(at: String, to: String) -> Result<(), String> { fs::rename(at, to).map_err(|e| e.to_string()) }

#[tauri::command]
fn search_in_dir(root: String, pattern: String) -> Result<Vec<SearchResult>, String> {
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

#[tauri::command]
fn list_plugins() -> Result<Vec<(String, PluginManifest)>, String> {
    let plugins_dir = std::path::Path::new("plugins");
    if !plugins_dir.exists() { return Ok(Vec::new()); }
    let mut plugins = Vec::new();
    if let Ok(entries) = fs::read_dir(plugins_dir) {
        for entry in entries {
            let e = if let Ok(e) = entry { e } else { continue };
            let p = e.path();
            if p.is_dir() {
                let mp = p.join("manifest.json");
                if mp.exists() {
                    let c = fs::read_to_string(mp).map_err(|e| e.to_string())?;
                    if let Ok(m) = serde_json::from_str::<PluginManifest>(&c) { plugins.push((p.to_string_lossy().to_string(), m)); }
                }
            }
        }
    }
    Ok(plugins)
}

#[tauri::command]
fn read_plugin_file(path: String) -> Result<String, String> { fs::read_to_string(path).map_err(|e| e.to_string()) }

#[tauri::command]
fn get_platform() -> String { std::env::consts::OS.to_string() }

#[tauri::command]
fn show_main_window(window: tauri::Window) {
    window.show().ok();
    window.set_focus().ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        let _ = app.emit("single-instance", args);
    }))
    .invoke_handler(tauri::generate_handler![
        read_dir, read_file, write_file, create_file, create_dir, remove_item, rename_item,
        search_in_dir, load_settings, save_settings, manage_context_menu, get_cli_args, is_admin, exit_app,
        list_plugins, read_plugin_file, get_platform, open_url, show_main_window, check_update_racing
    ])
    .run(tauri::generate_context!())
    .expect("error while running app");
}
