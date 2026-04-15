use tauri::Manager;

#[tauri::command]
pub fn kill_process() { std::process::exit(0); }

#[tauri::command]
pub fn exit_app<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) { app_handle.exit(0); }

#[tauri::command]
pub async fn system_exit_all_windows<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    for (label, w) in app_handle.webview_windows() {
        if label != "main" {
            let _ = w.close();
        }
    }
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub fn is_admin() -> bool {
    #[cfg(windows)] {
        use std::ptr;
        use winapi::um::processthreadsapi::{GetCurrentProcess, OpenProcessToken};
        use winapi::um::securitybaseapi::GetTokenInformation;
        use winapi::um::winnt::{TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
        let mut is_elevated = false;
        unsafe {
            let mut token = ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) != 0 {
                let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
                let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
                if GetTokenInformation(token, TokenElevation, &mut elevation as *mut _ as *mut _, size, &mut size) != 0 {
                    is_elevated = elevation.TokenIsElevated != 0;
                }
            }
        }
        is_elevated
    }
    #[cfg(not(windows))] { true }
}
