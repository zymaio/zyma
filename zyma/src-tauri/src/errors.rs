#[derive(Debug, thiserror::Error)]
pub enum ZymaError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Plugin error: {0}")]
    PluginError(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Lock poisoned: {0}")]
    LockPoisoned(String),
}

pub type Result<T> = std::result::Result<T, ZymaError>;

impl ZymaError {
    pub fn config(msg: impl Into<String>) -> Self {
        ZymaError::ConfigError(msg.into())
    }

    pub fn plugin(msg: impl Into<String>) -> Self {
        ZymaError::PluginError(msg.into())
    }

    pub fn not_found(path: impl Into<String>) -> Self {
        ZymaError::FileNotFound(path.into())
    }

    pub fn permission_denied(path: impl Into<String>) -> Self {
        ZymaError::PermissionDenied(path.into())
    }
}

impl From<ZymaError> for String {
    fn from(err: ZymaError) -> Self {
        err.to_string()
    }
}
