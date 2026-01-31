use serde::{Serialize, Deserialize};
use tokio::sync::broadcast;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")] // 方便 JSON 序列化
pub enum ZymaEvent {
    WorkspaceChanged(String),
    FileSaved(String),
    FileCreated(String),
    FileDeleted(String),
    WindowFocused(bool),
    // 未来可扩展：Git事件、LSP事件等
}

#[derive(Clone)]
pub struct EventBus {
    tx: broadcast::Sender<ZymaEvent>,
}

impl EventBus {
    pub fn new() -> Self {
        // 容量 100，超过处理速度会丢弃旧消息（Lagged），这对于即时事件是合理的
        let (tx, _) = broadcast::channel(100);
        Self { tx }
    }

    pub fn publish(&self, event: ZymaEvent) {
        // 忽略错误：如果没有订阅者，send 会返回 error，但这在我们的场景下是可以接受的
        let _ = self.tx.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ZymaEvent> {
        self.tx.subscribe()
    }
}
