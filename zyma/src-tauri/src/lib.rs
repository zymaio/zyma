use tauri::{Emitter, Manager, AppHandle, Wry, Runtime};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

pub mod models;
pub mod commands;
pub mod llm;

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

pub struct AppState {
    pub external_plugins: Vec<PathBuf>,
    pub watcher: commands::watcher::WatcherState,
    pub output: commands::output::OutputState,
    pub workspace_path: Mutex<PathBuf>,
    pub llm_manager: llm::LLMManager,
    pub native_chat_participants: Vec<NativeChatParticipant>,
    pub native_auth_providers: Vec<NativeAuthProvider>,
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
                app.manage(AppState {
                    external_plugins: Vec::new(),
                    watcher: commands::watcher::WatcherState { watchers: Mutex::new(HashMap::new()) },
                    output: commands::output::OutputState { channels: Mutex::new(HashMap::new()) },
                    workspace_path: Mutex::new(std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))),
                    llm_manager: llm::LLMManager::new(),
                    native_chat_participants: participants,
                    native_auth_providers: auth,
                });
                setup_zyma(app)?;
                Ok(())
            })
            .run(context)
            .expect("error while running zyma app");
    }
}

pub fn setup_zyma(app: &mut tauri::App<Wry>) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    restore_window_state(handle)?;
    let h = handle.clone();
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Focused(focused) => { let _ = h.emit("window-state-changed", *focused); }
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
