use tauri::{Manager, Wry};
use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::HashMap;
use crate::models::*;
use crate::{bus, commands, services, llm};
use crate::core::setup::setup_zyma;

pub struct ZymaBuilder {
    pub builder: tauri::Builder<Wry>,
    participants: Vec<NativeChatParticipant>,
    auth_providers: Vec<NativeAuthProvider>,
    sidebar_items: Vec<NativeSidebarItem>,
    file_menu_items: Vec<NativeFileMenuItem>,
    slot_components: Vec<NativeSlotComponent>,
    setup_hook: Option<Box<dyn FnOnce(&mut tauri::App<Wry>) -> Result<(), Box<dyn std::error::Error>> + Send + 'static>>,
}

impl ZymaBuilder {
    pub fn new() -> Self {
        Self {
            builder: tauri::Builder::new(),
            participants: Vec::new(),
            auth_providers: Vec::new(),
            sidebar_items: Vec::new(),
            file_menu_items: Vec::new(),
            slot_components: Vec::new(),
            setup_hook: None,
        }
    }

    pub fn from_builder(builder: tauri::Builder<Wry>) -> Self {
        Self { 
            builder, 
            participants: Vec::new(), 
            auth_providers: Vec::new(),
            sidebar_items: Vec::new(),
            file_menu_items: Vec::new(),
            slot_components: Vec::new(),
            setup_hook: None,
        }
    }

    pub fn register_chat_participant(mut self, p: NativeChatParticipant) -> Self {
        self.participants.push(p);
        self
    }

    pub fn register_auth_provider(mut self, p: NativeAuthProvider) -> Self {
        self.auth_providers.push(p);
        self
    }

    pub fn register_sidebar_item(mut self, item: NativeSidebarItem) -> Self {
        self.sidebar_items.push(item);
        self
    }

    pub fn register_file_menu_item(mut self, item: NativeFileMenuItem) -> Self {
        self.file_menu_items.push(item);
        self
    }

    pub fn register_slot_component(mut self, component: NativeSlotComponent) -> Self {
        self.slot_components.push(component);
        self
    }

    pub fn setup<F>(mut self, callback: F) -> Self
    where
        F: FnOnce(&mut tauri::App<Wry>) -> Result<(), Box<dyn std::error::Error>> + Send + 'static,
    {
        self.setup_hook = Some(Box::new(callback));
        self
    }

    pub fn run(self, context: tauri::Context) {
        let participants = self.participants;
        let auth = self.auth_providers;
        let items = self.sidebar_items;
        let file_menus = self.file_menu_items;
        let slots = self.slot_components;
        let custom_setup = self.setup_hook;

        self.builder
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_log::Builder::new().build())
            .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
                let bus = app.state::<bus::EventBus>();
                if args.len() > 1 {
                    let path = args[1].clone();
                    bus.publish(bus::ZymaEvent::OpenPath(path));
                }
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            }))
            .plugin(tauri_plugin_cli::init())
            .setup(move |app| {
                // 1. 初始化并注册 EventBus
                let bus = bus::EventBus::new();
                app.manage(bus.clone());

                // 2. 初始化并注册 WorkspaceService
                let initial_path = if let Ok(settings) = commands::config::load_settings() {
                    settings.session.and_then(|s| s.root_path).and_then(|p| {
                        let path = PathBuf::from(p);
                        if path.exists() && path.is_dir() { Some(path) } else { None }
                    }).unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
                } else {
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                };

                app.manage(services::WorkspaceService::new(initial_path));
                app.manage(commands::watcher::WatcherState { watchers: Mutex::new(HashMap::new()) });
                app.manage(commands::output::OutputState { channels: Mutex::new(HashMap::new()) });
                app.manage(llm::LLMManager::new());
                app.manage(services::ContextService::new());

                // 3. 初始化并注册 PluginService
                app.manage(commands::plugins::PluginService {
                    external_plugins: std::sync::RwLock::new(Vec::new()),
                    native_chat_participants: std::sync::RwLock::new(participants),
                    native_auth_providers: std::sync::RwLock::new(auth),
                    native_sidebar_items: std::sync::RwLock::new(items),
                    native_file_menu_items: std::sync::RwLock::new(file_menus),
                    native_commands: std::sync::RwLock::new(Vec::new()),
                    native_slot_components: std::sync::RwLock::new(slots),
                });

                setup_zyma(app, bus)?;

                if let Some(hook) = custom_setup {
                    hook(app)?;
                }

                Ok(())
            })
            .run(context)
            .expect("error while running zyma app");
    }
}
