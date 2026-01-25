use std::sync::Mutex;
use std::collections::HashMap;
use notify::{Watcher, RecursiveMode, Config};
use tauri::Emitter;
use serde::Serialize;

#[derive(Clone, Serialize)]
pub enum FsEventKind {
    Create,
    Modify,
    Remove,
    Unknown,
}

#[derive(Clone, Serialize)]
pub struct FsEvent {
    pub kind: FsEventKind,
    pub paths: Vec<String>,
}

pub struct WatcherState {
    pub watchers: Mutex<HashMap<String, notify::RecommendedWatcher>>,
}

#[tauri::command]
pub fn fs_watch(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, crate::AppState>,
    path: String
) -> Result<(), String> {
    let mut watchers = state.watcher.watchers.lock().unwrap();
    if watchers.contains_key(&path) { return Ok(()); }

    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;
    watcher.watch(std::path::Path::new(&path), RecursiveMode::Recursive).map_err(|e| e.to_string())?;
    watchers.insert(path.clone(), watcher);

    std::thread::spawn(move || {
        while let Ok(res) = rx.recv() {
            if let Ok(event) = res {
                let kind_str = match event.kind {
                    notify::EventKind::Create(_) => "fs_create",
                    notify::EventKind::Modify(_) => "fs_change",
                    notify::EventKind::Remove(_) => "fs_delete",
                    _ => continue,
                };
                let paths: Vec<String> = event.paths.iter().map(|p| p.to_string_lossy().to_string().replace("\\", "/")).collect();
                let _ = app_handle.emit("fs_event", FsEvent { 
                    kind: match kind_str {
                        "fs_create" => FsEventKind::Create,
                        "fs_change" => FsEventKind::Modify,
                        "fs_delete" => FsEventKind::Remove,
                        _ => FsEventKind::Unknown
                    }, 
                    paths: paths.clone() 
                });
                for p in paths { let _ = app_handle.emit(kind_str, p); }
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub fn fs_unwatch(state: tauri::State<'_, crate::AppState>, path: String) -> Result<(), String> {
    let mut watchers = state.watcher.watchers.lock().unwrap();
    if let Some(mut watcher) = watchers.remove(&path) { let _ = watcher.unwatch(std::path::Path::new(&path)); }
    Ok(())
}
