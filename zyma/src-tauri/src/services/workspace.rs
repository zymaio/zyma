use std::path::PathBuf;
use crate::services::vfs::{FileSystem, LocalFileSystem};

pub struct WorkspaceService {
    pub fs: Box<dyn FileSystem + Send + Sync>,
}

impl WorkspaceService {
    pub fn new(initial_path: PathBuf) -> Self {
        Self {
            fs: Box::new(LocalFileSystem::new(initial_path)),
        }
    }
    
    pub fn with_fs(fs: Box<dyn FileSystem + Send + Sync>) -> Self {
        Self { fs }
    }
}
