use tauri::{Emitter, Manager, AppHandle, Wry};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

pub mod models;
pub mod commands;
pub mod llm;
pub mod bus;
pub mod services;

use crate::commands::config::get_config_path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeChatParticipant {
    pub id: String,
    pub name: String,
    pub full_name: String,
    pub description: String,
    pub command: String,
    pub thought_event: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeAuthProvider {
    pub id: String,
    pub label: String,
    pub login_command: String,
    pub logout_command: String,
    pub auth_event: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeSidebarItem {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub command: String,
    pub params: Option<serde_json::Value>,
    pub color: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeFileMenuItem {
    pub pattern: String, // e.g. "*.py"
    pub title: String,
    pub icon: Option<String>,
    pub command: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeSlotComponent {
    pub slot: String, // 例如 "EDITOR_EMPTY_STATE"
    pub id: String,
    pub component_type: String, // "webview" 或 "command"
    pub params: Option<serde_json::Value>,
}

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
            .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
            .plugin(tauri_plugin_cli::init())
            .setup(move |app| {
                // 1. 初始化并注册 WorkspaceService (增加恢复逻辑)
                let initial_path = if let Ok(settings) = commands::config::load_settings() {
                    settings.session.and_then(|s| s.root_path).and_then(|p| {
                        let path = PathBuf::from(p);
                        if path.exists() && path.is_dir() { Some(path) } else { None }
                    }).unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
                } else {
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                };

                app.manage(commands::fs::WorkspaceService::new(initial_path));
                // 2. 初始化并注册 WatcherState
                app.manage(commands::watcher::WatcherState { 
                    watchers: Mutex::new(HashMap::new()) 
                });
                // 3. 初始化并注册 OutputState
                app.manage(commands::output::OutputState { 
                    channels: Mutex::new(HashMap::new()) 
                });
                // 4. 初始化并注册 LLMManager
                app.manage(llm::LLMManager::new());

                // 5. 初始化并注册 ContextService
                app.manage(services::ContextService::new());

                // 6. 初始化并注册 PluginService (包含侧边栏项、命令、插槽组件)
                app.manage(commands::plugins::PluginService {
                    external_plugins: Vec::new(),
                    native_chat_participants: participants,
                    native_auth_providers: auth,
                    native_sidebar_items: std::sync::RwLock::new(items),
                    native_file_menu_items: file_menus,
                    native_commands: std::sync::RwLock::new(Vec::new()),
                    native_slot_components: slots,
                });

                // 6. 初始化并注册 EventBus (New)
                let bus = bus::EventBus::new();
                app.manage(bus.clone());

                setup_zyma(app, bus)?;

                // 7. 最后执行业务层注入的自定义 setup 钩子
                if let Some(hook) = custom_setup {
                    hook(app)?;
                }

                Ok(())
            })
            .run(context)
            .expect("error while running zyma app");
    }
}

pub fn setup_zyma(app: &mut tauri::App<Wry>, bus: bus::EventBus) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    restore_window_state(handle)?;
    let h = handle.clone();
    
    // 捕获 bus 的副本用于闭包
    let bus_clone = bus.clone();

    if let Some(main_window) = app.get_webview_window("main") {
        main_window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Focused(focused) => { 
                    let _ = h.emit("window-state-changed", *focused); 
                    bus_clone.publish(bus::ZymaEvent::WindowFocused(*focused));
                }
                tauri::WindowEvent::CloseRequested { api, .. } => { api.prevent_close(); h.exit(0); }
                _ => {}
            }
        });
    }

    // 联动：当工作区切换时，自动更新 Watcher
    let h_bus = handle.clone();
    let mut bus_rx = bus.subscribe();
    tauri::async_runtime::spawn(async move {
        while let Ok(event) = bus_rx.recv().await {
            if let bus::ZymaEvent::WorkspaceChanged(new_path) = event {
                // 1. 清理所有旧监听
                let watcher_state = h_bus.state::<commands::watcher::WatcherState>();
                {
                    let mut watchers = watcher_state.watchers.lock().unwrap();
                    watchers.clear(); 
                }
                // 2. 开启新监听
                let _ = commands::watcher::fs_watch(h_bus.clone(), watcher_state, new_path);
            }
        }
    });

    Ok(())
}

pub fn run() {
    let mut slf = ZymaBuilder::new();
    slf.builder = slf.builder.invoke_handler(crate::commands::get_handlers());
    slf.run(tauri::generate_context!());
}

pub fn restore_window_state(app: &AppHandle<Wry>) -> tauri::Result<()> {
    if let Some(main_window) = app.get_webview_window("main") {
        let config_path = get_config_path();
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(config_path) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    let w = val.get("window_width").and_then(|v| v.as_f64()).unwrap_or(1000.0) as u32;
                    let h = val.get("window_height").and_then(|v| v.as_f64()).unwrap_or(700.0) as u32;
                    let _ = main_window.set_size(tauri::PhysicalSize::new(w, h));
                    if val.get("is_maximized").and_then(|v| v.as_bool()).unwrap_or(false) { let _ = main_window.maximize(); }
                }
            }
        }
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
    Ok(())
}
