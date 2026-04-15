pub mod vfs;
pub mod context;
pub mod path;
pub mod workspace;
pub mod recent_workspaces;
pub mod settings;
pub mod registry;
pub mod plugin_registry;
pub mod watcher;
pub mod output;

pub use vfs::{FileSystem, LocalFileSystem};
pub use context::ContextService;
pub use workspace::WorkspaceService;
pub use settings::{load_settings, save_settings, get_config_path};
pub use registry::{
    RegistryService,
    ChatParticipantService,
    AuthService,
    SidebarService,
    CommandService,
    FileMenuService,
    SlotService,
};
