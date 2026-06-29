use sdkwork_terminal_replay_store::{ReplayEntry, ReplayEventKind};
use serde::{Deserialize, Serialize};

use crate::state::SessionState;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SessionLaunchIntent {
    pub authority: String,
    pub command: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "state", rename_all = "kebab-case")]
pub enum ConnectorLaunchResolution {
    Running {
        phase: String,
        detail: String,
    },
    Failed {
        code: String,
        phase: String,
        retryable: bool,
        program: String,
        status: Option<i32>,
        message: String,
    },
}

impl ConnectorLaunchResolution {
    pub(crate) fn session_state(&self) -> SessionState {
        match self {
            Self::Running { .. } => SessionState::Running,
            Self::Failed { .. } => SessionState::Failed,
        }
    }

    pub(crate) fn replay_kind(&self) -> ReplayEventKind {
        match self {
            Self::Running { .. } => ReplayEventKind::State,
            Self::Failed { .. } => ReplayEventKind::Warning,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionCreateRequest {
    pub workspace_id: String,
    pub target: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub launch_intent: Option<SessionLaunchIntent>,
}

impl SessionCreateRequest {
    pub fn from_connector_launch_request(
        request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
    ) -> Self {
        Self {
            workspace_id: request.workspace_id.clone(),
            target: request.target.clone(),
            mode_tags: request.mode_tags.clone(),
            tags: request.tags.clone(),
            launch_intent: Some(SessionLaunchIntent {
                authority: request.authority.clone(),
                command: request.command.clone(),
            }),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionRecord {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: SessionState,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub launch_intent: Option<SessionLaunchIntent>,
    pub last_ack_sequence: u64,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttachmentRecord {
    pub attachment_id: String,
    pub session_id: String,
    pub cursor: String,
    pub last_ack_sequence: u64,
    pub writable: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReattachResult {
    pub session: SessionRecord,
    pub attachment: AttachmentRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorLaunchResolutionResult {
    pub session: SessionRecord,
    pub replay_entry: ReplayEntry,
}
