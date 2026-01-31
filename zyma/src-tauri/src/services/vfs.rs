use std::path::{Path, PathBuf, Component};
use std::sync::Mutex;
use crate::models::FileItem;
use tokio::fs;
use async_trait::async_trait;

/// 异步核心文件系统接口
#[async_trait]
pub trait FileSystem: Send + Sync {
    async fn read_dir(&self, path: &str) -> Result<Vec<FileItem>, String>;
    async fn read_file(&self, path: &str) -> Result<String, String>;
    async fn write_file(&self, path: &str, content: &str) -> Result<(), String>;
    async fn create_file(&self, path: &str) -> Result<(), String>;
    async fn create_dir(&self, path: &str) -> Result<(), String>;
    async fn remove_item(&self, path: &str) -> Result<(), String>;
    async fn rename_item(&self, from: &str, to: &str) -> Result<(), String>;
    async fn stat(&self, path: &str) -> Result<FileStat, String>;
    fn get_cwd(&self) -> String;
    fn set_cwd(&self, path: &str) -> Result<(), String>;
}

#[derive(serde::Serialize)]
pub struct FileStat {
    pub file_type: String,
    pub size: u64,
    pub mtime: u64,
}

/// 默认的本地文件系统实现
pub struct LocalFileSystem {
    root: Mutex<PathBuf>,
}

impl LocalFileSystem {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root: Mutex::new(root),
        }
    }

    /// 内部安全检查
    fn validate_path(&self, target: &str) -> Result<PathBuf, String> {
        let root = self.root.lock().unwrap();
        let target_path = if Path::new(target).is_absolute() {
            PathBuf::from(target)
        } else {
            root.join(target)
        };

        let clean_path = normalize_path(&target_path);
        let clean_root = normalize_path(&root);

        if clean_path.starts_with(&clean_root) {
            Ok(clean_path)
        } else {
            Err(format!("Access denied: Path outside workspace"))
        }
    }
}

#[async_trait]
impl FileSystem for LocalFileSystem {
    fn get_cwd(&self) -> String {
        self.root.lock().unwrap().to_string_lossy().to_string()
    }

    fn set_cwd(&self, path: &str) -> Result<(), String> {
        let mut root = self.root.lock().unwrap();
        *root = PathBuf::from(path);
        Ok(())
    }

    async fn read_dir(&self, path: &str) -> Result<Vec<FileItem>, String> {
        let safe_path = self.validate_path(path)?;
        let mut entries = fs::read_dir(safe_path).await.map_err(|e| e.to_string())?;
        let mut items = Vec::new();
        
        while let Ok(Some(entry)) = entries.next_entry().await {
            let p = entry.path();
            items.push(FileItem {
                name: entry.file_name().to_string_lossy().to_string(),
                path: p.to_string_lossy().to_string().replace("\\", "/"),
                is_dir: p.is_dir(),
            });
        }
        
        items.sort_by(|a, b| {
            if a.is_dir != b.is_dir { b.is_dir.cmp(&a.is_dir) } 
            else { a.name.cmp(&b.name) }
        });
        Ok(items)
    }

    async fn read_file(&self, path: &str) -> Result<String, String> {
        let safe_path = self.validate_path(path)?;
        fs::read_to_string(safe_path).await.map_err(|e| e.to_string())
    }

    async fn write_file(&self, path: &str, content: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        fs::write(safe_path, content).await.map_err(|e| e.to_string())
    }

    async fn create_file(&self, path: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        fs::write(safe_path, "").await.map_err(|e| e.to_string())
    }

    async fn create_dir(&self, path: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        fs::create_dir_all(safe_path).await.map_err(|e| e.to_string())
    }

    async fn remove_item(&self, path: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        let metadata = fs::metadata(&safe_path).await.map_err(|e| e.to_string())?;
        if metadata.is_dir() { 
            fs::remove_dir_all(safe_path).await.map_err(|e| e.to_string()) 
        } else { 
            fs::remove_file(safe_path).await.map_err(|e| e.to_string()) 
        }
    }

    async fn rename_item(&self, from: &str, to: &str) -> Result<(), String> {
        let safe_from = self.validate_path(from)?;
        let safe_to = self.validate_path(to)?;
        fs::rename(safe_from, safe_to).await.map_err(|e| e.to_string())
    }

    async fn stat(&self, path: &str) -> Result<FileStat, String> {
        let safe_path = self.validate_path(path)?;
        let metadata = fs::metadata(safe_path).await.map_err(|e| e.to_string())?;
        let ftype = if metadata.is_dir() { "dir" } else { "file" };
        let mtime = metadata.modified().map_err(|e| e.to_string())?
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
        Ok(FileStat { file_type: ftype.to_string(), size: metadata.len(), mtime })
    }
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut components = path.components().peekable();
    let mut ret = if let Some(c @ Component::Prefix(..)) = components.peek().cloned() {
        components.next();
        PathBuf::from(c.as_os_str())
    } else {
        PathBuf::new()
    };

    for component in components {
        match component {
            Component::Prefix(..) => unreachable!(),
            Component::RootDir => { ret.push(component.as_os_str()); } 
            Component::CurDir => {} 
            Component::ParentDir => { ret.pop(); } 
            Component::Normal(c) => { ret.push(c); }
        }
    }
    ret
}
