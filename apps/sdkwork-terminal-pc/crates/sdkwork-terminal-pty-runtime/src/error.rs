use sdkwork_terminal_shell_integration::LocalShellIntegrationError;
use std::{error::Error, fmt};

#[derive(Debug)]
pub enum LocalShellExecutionError {
    Command(LocalShellIntegrationError),
    InvalidCommand(String),
    WorkingDirectory(String),
    Spawn(String),
    SessionNotFound(String),
    DuplicateSessionId(String),
    RuntimePoisoned,
    Write(String),
    Resize(String),
}

impl fmt::Display for LocalShellExecutionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Command(cause) => write!(formatter, "local shell command error: {cause}"),
            Self::InvalidCommand(message) => {
                write!(formatter, "local shell invalid command: {message}")
            }
            Self::WorkingDirectory(message) => {
                write!(formatter, "local shell working directory error: {message}")
            }
            Self::Spawn(message) => write!(formatter, "local shell spawn error: {message}"),
            Self::SessionNotFound(session_id) => {
                write!(formatter, "local shell session not found: {session_id}")
            }
            Self::DuplicateSessionId(session_id) => {
                write!(
                    formatter,
                    "local shell session already exists: {session_id}"
                )
            }
            Self::RuntimePoisoned => formatter.write_str("local shell runtime mutex poisoned"),
            Self::Write(message) => write!(formatter, "local shell write error: {message}"),
            Self::Resize(message) => write!(formatter, "local shell resize error: {message}"),
        }
    }
}

impl Error for LocalShellExecutionError {}

impl From<LocalShellIntegrationError> for LocalShellExecutionError {
    fn from(value: LocalShellIntegrationError) -> Self {
        Self::Command(value)
    }
}
