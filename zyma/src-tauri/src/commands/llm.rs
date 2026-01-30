use tauri::{AppHandle, State, Runtime};
use tauri::ipc::Channel;
use futures::StreamExt;
use crate::AppState;
use crate::llm::ChatCompletionRequest;

#[tauri::command]
pub async fn llm_chat<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    request: ChatCompletionRequest,
    on_event: Channel<String>,
) -> Result<(), String> {
    // ... (Original logic of llm_chat)
    let settings = crate::commands::config::load_settings().unwrap_or_default();
    
    // 补齐模型字段
    let mut request = request;
    if request.model.is_none() {
        request.model = Some(settings.ai_model.clone().unwrap_or_else(|| "gpt-4o".to_string()));
    }

    let base_url = settings.ai_base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string());
    let api_key = settings.ai_api_key.unwrap_or_default();

    let mut stream = state.llm_manager.stream_chat(&base_url, &api_key, &request).await.map_err(|e| {
        eprintln!("[LLM Error] Request failed: {}", e);
        e
    })?;

    tokio::spawn(async move {
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    if let Ok(json) = serde_json::to_string(&chunk) {
                        let _ = on_event.send(json);
                    }
                }
                Err(e) => {
                    let _ = on_event.send(format!(r#"{{"error": "{}"}}"#, e));
                }
            }
        }
        let _ = on_event.send("[DONE]".to_string());
    });

    Ok(())
}