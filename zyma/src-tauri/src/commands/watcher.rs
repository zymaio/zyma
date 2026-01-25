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
    
    if watchers.contains_key(&path) {
        return Ok(()); 
    }

    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::RecommendedWatcher::new(tx, Config::default())
        .map_err(|e| e.to_string())?;

    watcher.watch(std::path::Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    watchers.insert(path.clone(), watcher);

    std::thread::spawn(move || {
        while let Ok(res) = rx.recv() {
            if let Ok(event) = res {
                let kind = match event.kind {
                    notify::EventKind::Create(_) => FsEventKind::Create,
                    notify::EventKind::Modify(_) => FsEventKind::Modify,
                    notify::EventKind::Remove(_) => FsEventKind::Remove,
                    _ => FsEventKind::Unknown,
                };
                
                let paths = event.paths.iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();

                let _ = app_handle.emit("fs-event", FsEvent { kind, paths });
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn fs_unwatch(
    state: tauri::State<'_, crate::AppState>,
    path: String
) -> Result<(), String> {
    let mut watchers = state.watcher.watchers.lock().unwrap();
    if let Some(mut watcher) = watchers.remove(&path) {
        let _ = watcher.unwatch(std::path::Path::new(&path));
    }
    Ok(())
}
