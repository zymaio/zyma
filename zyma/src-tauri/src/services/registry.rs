use std::sync::RwLock;
use crate::errors::{ZymaError, Result};

/// A generic registry service for managing collections of items with thread-safe access.
pub struct RegistryService<T> {
    items: RwLock<Vec<T>>,
}

impl<T: Clone> RegistryService<T> {
    pub fn new() -> Self {
        Self {
            items: RwLock::new(Vec::new()),
        }
    }

    pub fn get_items(&self) -> Result<Vec<T>> {
        self.items.read().map_err(|e| ZymaError::LockPoisoned(e.to_string())).map(|g| g.clone())
    }

    pub fn set_items(&self, items: Vec<T>) -> Result<()> {
        *self.items.write().map_err(|e| ZymaError::LockPoisoned(e.to_string()))? = items;
        Ok(())
    }

    pub fn add_item(&self, item: T) -> Result<()> {
        self.items.write().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?.push(item);
        Ok(())
    }

    pub fn clear_items(&self) -> Result<()> {
        self.items.write().map_err(|e| ZymaError::LockPoisoned(e.to_string()))?.clear();
        Ok(())
    }
}

// Type aliases for backward compatibility and convenience
pub type ChatParticipantService = RegistryService<crate::models::NativeChatParticipant>;
pub type AuthService = RegistryService<crate::models::NativeAuthProvider>;
pub type SidebarService = RegistryService<crate::models::NativeSidebarItem>;
pub type CommandService = RegistryService<crate::models::NativeCommand>;
pub type FileMenuService = RegistryService<crate::models::NativeFileMenuItem>;
pub type SlotService = RegistryService<crate::models::NativeSlotComponent>;
