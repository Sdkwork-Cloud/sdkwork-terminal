use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub enum SessionRuntimeError {
    SessionNotFound(String),
    AttachmentNotFound(String),
    InvalidSessionState(String),
    Sqlite(rusqlite::Error),
    Serde(serde_json::Error),
}

impl fmt::Display for SessionRuntimeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SessionNotFound(session_id) => {
                write!(formatter, "session not found: {session_id}")
            }
            Self::AttachmentNotFound(attachment_id) => {
                write!(formatter, "attachment not found: {attachment_id}")
            }
            Self::InvalidSessionState(message) => formatter.write_str(message),
            Self::Sqlite(cause) => write!(formatter, "sqlite error: {cause}"),
            Self::Serde(cause) => write!(formatter, "serde error: {cause}"),
        }
    }
}

impl Error for SessionRuntimeError {}

impl From<rusqlite::Error> for SessionRuntimeError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Sqlite(value)
    }
}

impl From<serde_json::Error> for SessionRuntimeError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serde(value)
    }
}

pub(crate) type SessionRuntimeResult<T> = Result<T, SessionRuntimeError>;
