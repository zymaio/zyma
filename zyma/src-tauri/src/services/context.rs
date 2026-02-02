use std::collections::HashMap;
use std::sync::RwLock;
use serde_json::Value;

/// 全局上下文服务
/// 允许业务层 (如 Pro 版) 存储全局状态，底座其他组件 (如 AI) 自动感知
pub struct ContextService {
    store: RwLock<HashMap<String, Value>>,
}

impl ContextService {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
        }
    }

    pub fn set(&self, key: String, value: Value) {
        let mut store = self.store.write().unwrap();
        store.insert(key, value);
    }

    pub fn get(&self, key: &str) -> Option<Value> {
        let store = self.store.read().unwrap();
        store.get(key).cloned()
    }

    pub fn get_all(&self) -> HashMap<String, Value> {
        let store = self.store.read().unwrap();
        store.clone()
    }
}
