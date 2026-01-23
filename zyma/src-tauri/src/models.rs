use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub path: String,
    pub line: usize,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppSettings {
    pub theme: String,
    pub font_size: u32,
    pub ui_font_size: u32, // 新增：界面字体大小
    pub tab_size: u32,
    pub language: String,
    pub context_menu: bool,
    pub single_instance: bool,
    pub auto_update: bool,
    // Window state
    pub window_width: f64,
    pub window_height: f64,
    pub window_x: Option<i32>,
    pub window_y: Option<i32>,
    pub is_maximized: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub author: String,
    pub entry: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub source: String,
    pub url: String,
}
