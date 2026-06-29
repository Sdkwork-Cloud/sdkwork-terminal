use sdkwork_terminal_observability::readiness_summary as observability_readiness_summary;
use sdkwork_terminal_protocol::crate_id as protocol_crate_id;

pub const CRATE_ID: &str = "sdkwork-terminal-session-runtime";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

pub fn readiness_summary() -> String {
    format!(
        "{CRATE_ID} -> {} -> {}",
        protocol_crate_id(),
        observability_readiness_summary()
    )
}

pub mod daemon;
pub mod error;
pub mod runtime;
pub mod session;
pub mod state;

pub use daemon::{LocalDaemonHealthSnapshot, LocalDaemonPhase, LocalSessionDaemon};
pub use error::SessionRuntimeError;
pub use runtime::SessionRuntime;
pub use session::{
    AttachmentRecord, ConnectorLaunchResolution, ConnectorLaunchResolutionResult, ReattachResult,
    SessionCreateRequest, SessionLaunchIntent, SessionRecord,
};
pub use state::SessionState;
