use std::collections::HashMap;
use std::sync::RwLock;
use serde_json::Value;
use crate::errors::{ZymaError, Result};

/// 全局上下文服务
/// 允许业务层 (如 Pro 版) 存储全局状态，底座其他组件 (如 AI) 自动感知
pub struct ContextService {
    store: RwLock<HashMap<String, Value>>,
}

impl Default for ContextService {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextService {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
        }
    }

    pub fn set(&self, key: String, value: Value) -> Result<()> {
        let mut store = self.store.write().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?;
        store.insert(key, value);
        Ok(())
    }

    pub fn get(&self, key: &str) -> Result<Option<Value>> {
        let store = self.store.read().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?;
        Ok(store.get(key).cloned())
    }

    pub fn get_all(&self) -> Result<HashMap<String, Value>> {
        let store = self.store.read().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?;
        Ok(store.clone())
    }
}
