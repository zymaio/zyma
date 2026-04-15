use std::fs;
use std::path::{Path, PathBuf};
use crate::models::{PluginManifest, NativeSidebarItem, NativeFileMenuItem, NativeCommand};
use tauri::Emitter;
use serde::Serialize;

/// Helper function to emit update events for registry services
fn emit_registry_update<T: Clone + Serialize>(
    app_handle: &tauri::AppHandle,
    items: &Vec<T>,
    event_name: &str,
) {
    let _ = app_handle.emit(event_name, items);
}

#[tauri::command]
pub fn get_native_extensions(
    chat_service: tauri::State<'_, crate::services::ChatParticipantService>,
    auth_service: tauri::State<'_, crate::services::AuthService>,
    sidebar_service: tauri::State<'_, crate::services::SidebarService>,
    command_service: tauri::State<'_, crate::services::CommandService>,
    file_menu_service: tauri::State<'_, crate::services::FileMenuService>,
    slot_service: tauri::State<'_, crate::services::SlotService>,
) -> serde_json::Value {
    serde_json::json!({
        "chat_participants": chat_service.get_items().unwrap_or_default(),
        "auth_providers": auth_service.get_items().unwrap_or_default(),
        "sidebar_items": sidebar_service.get_items().unwrap_or_default(),
        "file_menu_items": file_menu_service.get_items().unwrap_or_default(),
        "commands": command_service.get_items().unwrap_or_default(),
        "slot_components": slot_service.get_items().unwrap_or_default(),
    })
}

#[tauri::command]
pub fn update_native_commands(
    app_handle: tauri::AppHandle,
    command_service: tauri::State<'_, crate::services::CommandService>,
    commands: Vec<NativeCommand>,
) -> Result<(), String> {
    command_service.set_items(commands.clone()).map_err(|e| e.to_string())?;
    emit_registry_update(&app_handle, &commands, "zyma:commands-updated");
    Ok(())
}

#[tauri::command]
pub fn update_sidebar_items(
    app_handle: tauri::AppHandle,
    sidebar_service: tauri::State<'_, crate::services::SidebarService>,
    items: Vec<NativeSidebarItem>,
) -> Result<(), String> {
    sidebar_service.set_items(items.clone()).map_err(|e| e.to_string())?;
    emit_registry_update(&app_handle, &items, "zyma:sidebar-updated");
    Ok(())
}

#[tauri::command]
pub fn update_chat_participants(
    app_handle: tauri::AppHandle,
    chat_service: tauri::State<'_, crate::services::ChatParticipantService>,
    participants: Vec<crate::models::NativeChatParticipant>,
) -> Result<(), String> {
    chat_service.set_items(participants.clone()).map_err(|e| e.to_string())?;
    emit_registry_update(&app_handle, &participants, "zyma:chat-participants-updated");
    Ok(())
}

#[tauri::command]
pub fn update_auth_providers(
    app_handle: tauri::AppHandle,
    auth_service: tauri::State<'_, crate::services::AuthService>,
    providers: Vec<crate::models::NativeAuthProvider>,
) -> Result<(), String> {
    auth_service.set_items(providers.clone()).map_err(|e| e.to_string())?;
    emit_registry_update(&app_handle, &providers, "zyma:auth-providers-updated");
    Ok(())
}

#[tauri::command]
pub fn update_file_menu_items(
    app_handle: tauri::AppHandle,
    file_menu_service: tauri::State<'_, crate::services::FileMenuService>,
    items: Vec<NativeFileMenuItem>,
) -> Result<(), String> {
    file_menu_service.set_items(items.clone()).map_err(|e| e.to_string())?;
    emit_registry_update(&app_handle, &items, "zyma:file-menu-updated");
    Ok(())
}

#[tauri::command]
pub fn update_slot_components(
    app_handle: tauri::AppHandle,
    slot_service: tauri::State<'_, crate::services::SlotService>,
    components: Vec<crate::models::NativeSlotComponent>,
) -> Result<(), String> {
    slot_service.set_items(components.clone()).map_err(|e| e.to_string())?;
    emit_registry_update(&app_handle, &components, "zyma:slot-components-updated");
    Ok(())
}

#[tauri::command]
pub fn list_plugins(
    plugin_registry: tauri::State<'_, crate::services::plugin_registry::PluginRegistryService>,
) -> Result<Vec<(String, PluginManifest, bool)>, String> {
    let mut plugins = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    let system_paths = vec![
        PathBuf::from("../plugins"),
        PathBuf::from("plugins"),
    ];
    let user_path = get_user_plugins_dir();

    for p_dir in system_paths {
        scan_dir(&p_dir, true, &mut plugins, &mut seen_names);
    }
    scan_dir(&user_path, false, &mut plugins, &mut seen_names);

    let external_plugins = plugin_registry.get_external_plugins().map_err(|e| e.to_string())?;
    for p_dir in external_plugins {
        scan_dir(&p_dir, false, &mut plugins, &mut seen_names);
    }

    Ok(plugins)
}

fn scan_dir(dir: &Path, is_builtin: bool, plugins: &mut Vec<(String, PluginManifest, bool)>, seen: &mut std::collections::HashSet<String>) {
    if !dir.exists() || !dir.is_dir() { return; }
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries {
            let e = if let Ok(e) = entry { e } else { continue };
            let p = e.path();
            if p.is_dir() {
                let mp = p.join("manifest.json");
                if mp.exists() {
                    if let Ok(c) = fs::read_to_string(mp) {
                        if let Ok(m) = serde_json::from_str::<PluginManifest>(&c) {
                            if seen.contains(&m.name) { continue; }
                            if let Ok(abs_p) = fs::canonicalize(&p) {
                                seen.insert(m.name.clone());
                                plugins.push((crate::services::path::simplify_canonical(abs_p), m, is_builtin));
                            }
                        }
                    }
                }
            }
        }
    }
}

fn get_user_plugins_dir() -> PathBuf {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    let p = Path::new(&home).join(".zyma").join("plugins");
    if !p.exists() { let _ = fs::create_dir_all(&p); }
    p
}

#[tauri::command]
pub fn read_plugin_file(path: String) -> Result<String, String> {
    let mut p = PathBuf::from(&path);
    if let Ok(canon) = fs::canonicalize(&p) {
        p = canon;
    }

    let mut current = p.parent();
    let mut found = false;
    for _ in 0..5 {
        if let Some(dir) = current {
            if dir.join("manifest.json").exists() {
                found = true;
                break;
            }
            current = dir.parent();
        } else {
            break;
        }
    }

    if !found && p.file_name().and_then(|n| n.to_str()) == Some("manifest.json") {
         found = true;
    }

    if !found {
        return Err(format!("Unauthorized: Cannot read files outside plugin scope. Path: {}", path));
    }
    fs::read_to_string(p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_plugins_root() -> String {
    crate::services::path::simplify_canonical(get_user_plugins_dir())
}
