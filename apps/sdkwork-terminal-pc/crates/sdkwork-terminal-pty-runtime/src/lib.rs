//! Thin module assembly for the `sdkwork-terminal-pty-runtime` crate.
//!
//! Module layout follows `RUST_CODE_SPEC.md` section 1: this file only wires
//! modules together and re-exports the public API surface. All handlers,
//! DTOs, errors, and the session runtime live in focused submodules.

pub mod channel;
pub mod constants;
pub mod error;
pub mod runtime;
pub mod types;

pub use channel::{create_session_event_channel, SessionEventSender};
pub use constants::SESSION_EVENT_CHANNEL_CAPACITY;
pub use error::LocalShellExecutionError;
pub use runtime::{execute_local_shell_command, LocalShellSessionRuntime};
pub use types::{
    LocalShellExecutionRequest, LocalShellExecutionResult, LocalShellSessionBootstrap,
    LocalShellSessionCreateRequest, LocalShellSessionEvent, PtyProcessLaunchCommand,
    PtyProcessSessionBootstrap, PtyProcessSessionCreateRequest,
};

pub const CRATE_ID: &str = "sdkwork-terminal-pty-runtime";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }
}
