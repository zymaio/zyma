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
    pub ui_font_size: u32,
    pub tab_size: u32,
    pub language: String,
    pub context_menu: bool,
    pub single_instance: bool,
    pub auto_update: bool,
    pub window_width: f64,
    pub window_height: f64,
    pub window_x: Option<i32>,
    pub window_y: Option<i32>,
    pub is_maximized: bool,
    pub windows: Option<serde_json::Value>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            font_size: 14,
            ui_font_size: 13,
            tab_size: 4,
            language: "zh-CN".to_string(),
            context_menu: false,
            single_instance: true,
            auto_update: true,
            window_width: 800.0,
            window_height: 600.0,
            window_x: None,
            window_y: None,
            is_maximized: false,
            windows: None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginViewDef {
    pub id: String,
    pub title: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginContributions {
    pub views: Option<Vec<PluginViewDef>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub author: String,
    pub entry: String,
    pub description: Option<String>,
    pub icon: Option<String>, // 顺便加上顶层 icon 字段
    pub contributes: Option<PluginContributions>,
}