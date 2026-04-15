pub mod fs;
pub mod settings;
pub mod plugin;
pub mod native_ext;

// Re-export all types for backward compatibility
pub use fs::{FileItem, SearchResult, FileReadResponse};
pub use settings::{AppSettings, SessionInfo};
pub use plugin::{PluginManifest, PluginContributions, PluginViewDef};
pub use native_ext::{
    NativeChatParticipant,
    NativeAuthProvider,
    NativeSidebarItem,
    NativeFileMenuItem,
    NativeSlotComponent,
    NativeCommand,
};
