use futures::Stream;
use std::pin::Pin;
use std::task::{Context, Poll};
use crate::llm::types::ChatCompletionChunk;

/// 稳健的 SSE 解析适配器，处理字节流并正确识别 UTF-8 边界
pub struct SSEStreamAdapter<S> {
    inner: S,
    buffer: Vec<u8>,
}

impl<S> SSEStreamAdapter<S> {
    pub fn new(inner: S) -> Self {
        Self { inner, buffer: Vec::new() }
    }
}

impl<S> Stream for SSEStreamAdapter<S> 
where S: Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Unpin 
{
    type Item = Result<ChatCompletionChunk, String>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            // 检查缓冲区中是否有换行符
            if let Some(idx) = self.buffer.iter().position(|&b| b == b'\n') {
                let line_bytes = self.buffer.drain(..idx + 1).collect::<Vec<u8>>();
                let line = String::from_utf8_lossy(&line_bytes).trim().to_string();

                if line.is_empty() { continue; }
                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        return Poll::Ready(None);
                    }
                    match serde_json::from_str::<ChatCompletionChunk>(data) {
                        Ok(chunk) => return Poll::Ready(Some(Ok(chunk))),
                        Err(_) => continue,
                    }
                }
                continue;
            }

            // 缓冲区没有完整行，读取更多原始字节
            match Pin::new(&mut self.inner).poll_next(cx) {
                Poll::Ready(Some(Ok(bytes))) => {
                    self.buffer.extend_from_slice(&bytes);
                    continue; 
                },
                Poll::Ready(Some(Err(e))) => return Poll::Ready(Some(Err(e.to_string()))),
                Poll::Ready(None) => {
                    if !self.buffer.is_empty() {
                        let line = String::from_utf8_lossy(&self.buffer).trim().to_string();
                        self.buffer.clear();
                        if line.starts_with("data: ") {
                            let data = &line[6..];
                            if data != "[DONE]" {
                                if let Ok(chunk) = serde_json::from_str::<ChatCompletionChunk>(data) {
                                    return Poll::Ready(Some(Ok(chunk)));
                                }
                            }
                        }
                    }
                    return Poll::Ready(None);
                },
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
