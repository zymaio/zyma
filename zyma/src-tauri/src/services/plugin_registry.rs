use std::path::PathBuf;
use std::sync::RwLock;
use crate::errors::{ZymaError, Result};

pub struct PluginRegistryService {
    external_plugins: RwLock<Vec<PathBuf>>,
}

impl PluginRegistryService {
    pub fn new() -> Self {
        Self {
            external_plugins: RwLock::new(Vec::new()),
        }
    }

    pub fn get_external_plugins(&self) -> Result<Vec<PathBuf>> {
        self.external_plugins.read().map_err(|e| ZymaError::LockPoisoned(e.to_string())).map(|g| g.clone())
    }

    pub fn add_external_plugin(&self, path: PathBuf) -> Result<()> {
        self.external_plugins.write().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?.push(path);
        Ok(())
    }

    pub fn set_external_plugins(&self, paths: Vec<PathBuf>) -> Result<()> {
        *self.external_plugins.write().map_err(|e| ZymaError::LockPoisoned(e.to_string()))? = paths;
        Ok(())
    }
}
