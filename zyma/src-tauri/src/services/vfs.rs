use std::path::{Path, PathBuf, Component};
use std::fs;
use std::sync::Mutex;
use crate::models::FileItem;
use std::io;

/// 核心文件系统接口
/// 任何实现此接口的结构体都可以被 WorkspaceService 使用
pub trait FileSystem: Send + Sync {
    fn read_dir(&self, path: &str) -> Result<Vec<FileItem>, String>;
    fn read_file(&self, path: &str) -> Result<String, String>;
    fn write_file(&self, path: &str, content: &str) -> Result<(), String>;
    fn create_file(&self, path: &str) -> Result<(), String>;
    fn create_dir(&self, path: &str) -> Result<(), String>;
    fn remove_item(&self, path: &str) -> Result<(), String>;
    fn rename_item(&self, from: &str, to: &str) -> Result<(), String>;
    fn stat(&self, path: &str) -> Result<FileStat, String>;
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
/// 包含路径穿越防御逻辑
pub struct LocalFileSystem {
    root: Mutex<PathBuf>,
}

impl LocalFileSystem {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root: Mutex::new(root),
        }
    }

    /// 内部安全检查：规范化路径并确保其在根目录下
    fn validate_path(&self, target: &str) -> Result<PathBuf, String> {
        let root = self.root.lock().unwrap();
        
        // 1. 构造绝对路径
        let target_path = if Path::new(target).is_absolute() {
            PathBuf::from(target)
        } else {
            root.join(target)
        };

        // 2. 规范化
        let clean_path = normalize_path(&target_path);
        let clean_root = normalize_path(&root);

        // 3. 前缀检查
        if clean_path.starts_with(&clean_root) {
            Ok(clean_path)
        } else {
            Err(format!("Access denied: Path '{}' is outside workspace '{}'", clean_path.display(), clean_root.display()))
        }
    }
}

impl FileSystem for LocalFileSystem {
    fn get_cwd(&self) -> String {
        self.root.lock().unwrap().to_string_lossy().to_string()
    }

    fn set_cwd(&self, path: &str) -> Result<(), String> {
        // 这里可以添加对新路径是否存在的检查
        let mut root = self.root.lock().unwrap();
        *root = PathBuf::from(path);
        Ok(())
    }

    fn read_dir(&self, path: &str) -> Result<Vec<FileItem>, String> {
        let safe_path = self.validate_path(path)?;
        let entries = fs::read_dir(safe_path).map_err(|e| e.to_string())?;
        let mut items = Vec::new();
        for entry in entries {
            if let Ok(entry) = entry {
                let p = entry.path();
                items.push(FileItem {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: p.to_string_lossy().to_string().replace("\\", "/"),
                    is_dir: p.is_dir(),
                });
            }
        }
        items.sort_by(|a, b| {
            if a.is_dir != b.is_dir { b.is_dir.cmp(&a.is_dir) } 
            else { a.name.cmp(&b.name) }
        });
        Ok(items)
    }

    fn read_file(&self, path: &str) -> Result<String, String> {
        let safe_path = self.validate_path(path)?;
        fs::read_to_string(safe_path).map_err(|e| e.to_string())
    }

    fn write_file(&self, path: &str, content: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        fs::write(safe_path, content).map_err(|e| e.to_string())
    }

    fn create_file(&self, path: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        fs::write(safe_path, "").map_err(|e| e.to_string())
    }

    fn create_dir(&self, path: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        fs::create_dir_all(safe_path).map_err(|e| e.to_string())
    }

    fn remove_item(&self, path: &str) -> Result<(), String> {
        let safe_path = self.validate_path(path)?;
        if safe_path.is_dir() { 
            fs::remove_dir_all(safe_path).map_err(|e| e.to_string()) 
        } else { 
            fs::remove_file(safe_path).map_err(|e| e.to_string()) 
        }
    }

    fn rename_item(&self, from: &str, to: &str) -> Result<(), String> {
        let safe_from = self.validate_path(from)?;
        let safe_to = self.validate_path(to)?;
        fs::rename(safe_from, safe_to).map_err(|e| e.to_string())
    }

    fn stat(&self, path: &str) -> Result<FileStat, String> {
        let safe_path = self.validate_path(path)?;
        let metadata = fs::metadata(safe_path).map_err(|e| e.to_string())?;
        let ftype = if metadata.is_dir() { "dir" } else { "file" };
        use std::time::UNIX_EPOCH;
        let mtime = metadata.modified().unwrap_or(UNIX_EPOCH).duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        Ok(FileStat { file_type: ftype.to_string(), size: metadata.len(), mtime })
    }
}

/// 路径规范化工具函数
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
            Component::CurDir => {} // Ignore current directory component
            Component::ParentDir => { ret.pop(); } // Go up one level
            Component::Normal(c) => { ret.push(c); } // Add normal component
        }
    }
    ret
}
