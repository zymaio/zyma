use std::path::PathBuf;
use crate::services::vfs::{FileSystem, LocalFileSystem};
use crate::services::recent_workspaces::add_recent_workspace;

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

    /// Change working directory and return normalized path
    pub fn set_cwd(&self, path: &str) -> Result<String, String> {
        self.fs.set_cwd(path)?;
        let normalized_path = add_recent_workspace(path)?;
        Ok(normalized_path)
    }
}
