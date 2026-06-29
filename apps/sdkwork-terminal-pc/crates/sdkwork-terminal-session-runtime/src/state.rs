#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SessionState {
    Creating,
    Starting,
    Running,
    Detached,
    Reattaching,
    Replaying,
    Stopping,
    Exited,
    Failed,
}

impl SessionState {
    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            Self::Creating => "Creating",
            Self::Starting => "Starting",
            Self::Running => "Running",
            Self::Detached => "Detached",
            Self::Reattaching => "Reattaching",
            Self::Replaying => "Replaying",
            Self::Stopping => "Stopping",
            Self::Exited => "Exited",
            Self::Failed => "Failed",
        }
    }

    pub(crate) fn from_str(value: &str) -> Option<Self> {
        match value {
            "Creating" => Some(Self::Creating),
            "Starting" => Some(Self::Starting),
            "Running" => Some(Self::Running),
            "Detached" => Some(Self::Detached),
            "Reattaching" => Some(Self::Reattaching),
            "Replaying" => Some(Self::Replaying),
            "Stopping" => Some(Self::Stopping),
            "Exited" => Some(Self::Exited),
            "Failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

pub(crate) fn normalize_recovered_session_state(state: &SessionState) -> SessionState {
    match state {
        SessionState::Exited | SessionState::Failed => state.clone(),
        _ => SessionState::Exited,
    }
}
