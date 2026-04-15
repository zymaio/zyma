use std::path::{Path, PathBuf};
use std::sync::Mutex;
use crate::models::{FileItem, FileReadResponse};
use crate::errors::{Result, ZymaError};
use tokio::fs;
use async_trait::async_trait;
use crate::services::path::{normalize, normalize_to_string};

/// 异步核心文件系统接口
#[async_trait]
pub trait FileSystem: Send + Sync {
    async fn read_dir(&self, path: &str) -> Result<Vec<FileItem>>;
    async fn read_file(&self, path: &str) -> Result<FileReadResponse>;
    async fn write_file(&self, path: &str, content: &str) -> Result<()>;
    async fn create_file(&self, path: &str) -> Result<()>;
    async fn create_dir(&self, path: &str) -> Result<()>;
    async fn remove_item(&self, path: &str) -> Result<()>;
    async fn rename_item(&self, from: &str, to: &str) -> Result<()>;
    async fn stat(&self, path: &str) -> Result<FileStat>;
    fn get_cwd(&self) -> String;
    fn set_cwd(&self, path: &str) -> Result<()>;
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

    /// 内部安全检查 (Relaxed for Editor usage)
    fn validate_path(&self, target: &str) -> Result<PathBuf> {
        let root = self.root.lock().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?;
        let target_path = if Path::new(target).is_absolute() {
            PathBuf::from(target)
        } else {
            root.join(target)
        };

        let clean_path = normalize(&target_path);

        // Editor Mode: Allow accessing files outside workspace
        // We trust the user's intent when opening specific files.
        Ok(clean_path)
    }
}

#[async_trait]
impl FileSystem for LocalFileSystem {
    fn get_cwd(&self) -> String {
        self.root.lock()
            .map(|r| r.to_string_lossy().to_string())
            .unwrap_or_else(|e| format!("[lock error] {}", e))
    }

    fn set_cwd(&self, path: &str) -> Result<()> {
        let mut root = self.root.lock().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?;
        *root = PathBuf::from(path);
        Ok(())
    }

    async fn read_dir(&self, path: &str) -> Result<Vec<FileItem>> {
        let safe_path = self.validate_path(path)?;
        let mut entries = fs::read_dir(safe_path).await?;
        let mut items = Vec::new();

        while let Ok(Some(entry)) = entries.next_entry().await {
            let p = entry.path();
            items.push(FileItem {
                name: entry.file_name().to_string_lossy().to_string(),
                path: normalize_to_string(&p),
                is_dir: p.is_dir(),
            });
        }

        items.sort_by(|a, b| {
            if a.is_dir != b.is_dir { b.is_dir.cmp(&a.is_dir) }
            else { a.name.cmp(&b.name) }
        });
        Ok(items)
    }

    async fn read_file(&self, path: &str) -> Result<FileReadResponse> {
        let safe_path = self.validate_path(path)?;
        let bytes = fs::read(safe_path).await?;

        // 自动检测编码
        let mut detector = chardetng::EncodingDetector::new();
        detector.feed(&bytes, true);
        let encoding = detector.guess(None, true);

        let (res, _, has_errors) = encoding.decode(&bytes);
        let mut encoding_name = encoding.name().to_string();

        if has_errors && encoding == encoding_rs::UTF_8 {
            // 如果 UTF-8 解码失败，尝试 GBK (Windows 常见 ANSI)
            let (res_gbk, _, errors_gbk) = encoding_rs::GBK.decode(&bytes);
            if !errors_gbk {
                return Ok(FileReadResponse {
                    content: res_gbk.into_owned(),
                    encoding: "GBK".to_string()
                });
            } else {
                encoding_name = "Unknown".to_string();
            }
        }

        // 规范化显示名称
        encoding_name = match encoding_name.as_str() {
            "UTF-8" => "UTF-8".to_string(),
            "windows-1252" | "ISO-8859-1" => "ANSI".to_string(),
            "Unknown" => "Unknown".to_string(),
            _ => encoding_name
        };

        Ok(FileReadResponse {
            content: res.into_owned(),
            encoding: encoding_name
        })
    }

    async fn write_file(&self, path: &str, content: &str) -> Result<()> {
        let safe_path = self.validate_path(path)?;
        fs::write(safe_path, content).await?;
        Ok(())
    }

    async fn create_file(&self, path: &str) -> Result<()> {
        let safe_path = self.validate_path(path)?;
        fs::write(safe_path, "").await?;
        Ok(())
    }

    async fn create_dir(&self, path: &str) -> Result<()> {
        let safe_path = self.validate_path(path)?;
        fs::create_dir_all(safe_path).await?;
        Ok(())
    }

    async fn remove_item(&self, path: &str) -> Result<()> {
        let safe_path = self.validate_path(path)?;
        let metadata = fs::metadata(&safe_path).await?;
        if metadata.is_dir() {
            fs::remove_dir_all(safe_path).await?;
        } else {
            fs::remove_file(safe_path).await?;
        }
        Ok(())
    }

    async fn rename_item(&self, from: &str, to: &str) -> Result<()> {
        let safe_from = self.validate_path(from)?;
        let safe_to = self.validate_path(to)?;
        fs::rename(safe_from, safe_to).await?;
        Ok(())
    }

    async fn stat(&self, path: &str) -> Result<FileStat> {
        let safe_path = self.validate_path(path)?;
        let metadata = fs::metadata(safe_path).await?;
        let ftype = if metadata.is_dir() { "dir" } else { "file" };
        let mtime = metadata.modified()?
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
        Ok(FileStat { file_type: ftype.to_string(), size: metadata.len(), mtime })
    }
}
