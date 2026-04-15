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
pub struct FileReadResponse {
    pub content: String,
    pub encoding: String,
}
