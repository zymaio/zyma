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

pub struct ZymaBuilder {
    pub builder: tauri::Builder<Wry>,
    participants: Vec<NativeChatParticipant>,
    auth_providers: Vec<NativeAuthProvider>,
}

impl ZymaBuilder {
    pub fn new() -> Self {
        Self {
            builder: tauri::Builder::new(),
            participants: Vec::new(),
            auth_providers: Vec::new(),
        }
    }

    pub fn from_builder(builder: tauri::Builder<Wry>) -> Self {
        Self { builder, participants: Vec::new(), auth_providers: Vec::new() }
    }

    pub fn register_chat_participant(mut self, p: NativeChatParticipant) -> Self {
        self.participants.push(p);
        self
    }

    pub fn register_auth_provider(mut self, p: NativeAuthProvider) -> Self {
        self.auth_providers.push(p);
        self
    }

    pub fn run(self, context: tauri::Context) {
        let participants = self.participants;
        let auth = self.auth_providers;
        self.builder
            .setup(move |app| {
                // 1. 初始化并注册 WorkspaceService
                app.manage(commands::fs::WorkspaceService::new(
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                ));

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

                // 5. 初始化并注册 PluginService
                app.manage(commands::plugins::PluginService {
                    external_plugins: Vec::new(),
                    native_chat_participants: participants,
                    native_auth_providers: auth,
                });

                // 6. 初始化并注册 EventBus (New)
                let bus = bus::EventBus::new();
                app.manage(bus.clone());

                setup_zyma(app, bus)?;
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
    let bus_clone = bus;

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
