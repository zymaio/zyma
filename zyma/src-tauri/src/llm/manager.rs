use reqwest::Client;
use futures::Stream;
use std::time::Duration;
use crate::llm::types::{ChatCompletionRequest, ChatCompletionChunk};
use crate::llm::sse::SSEStreamAdapter;

pub struct LLMManager {
    client: Client,
}

impl LLMManager {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(600))
            .build()
            .unwrap_or_else(|_| Client::new());
        
        Self { client }
    }

    pub async fn stream_chat(
        &self,
        base_url: &str,
        api_key: &str,
        request: &ChatCompletionRequest,
    ) -> Result<impl Stream<Item = Result<ChatCompletionChunk, String>>, String> {
        let base = base_url.trim().trim_end_matches('/');
        let url = format!("{}/chat/completions", base);
        
        let mut req_builder = self.client.post(&url)
            .header("Content-Type", "application/json")
            .json(request);

        if !api_key.is_empty() {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", api_key.trim()));
        }

        let response = req_builder.send().await.map_err(|e| {
            format!("Network Error: {}. Please check your connection and Base URL.", e)
        })?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("API Error {}: {}", status, text));
        }

        let stream = response.bytes_stream();
        Ok(SSEStreamAdapter::new(stream))
    }
}