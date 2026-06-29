use crate::snapshots::{
    DesktopAttachmentDescriptorSnapshot, DesktopConnectorInteractiveSessionCreateRequest,
    DesktopConnectorInteractiveSessionCreateSnapshot, DesktopConnectorLaunchSnapshot,
    DesktopLocalShellExecRequest, DesktopLocalShellExecSnapshot,
    DesktopLocalShellStreamEventSnapshot, DesktopReplayEntrySnapshot,
    DesktopSessionDescriptorSnapshot,
};
use sdkwork_terminal_control_plane::InteractiveConnectorSessionBootstrap;
use sdkwork_terminal_protocol::{ConnectorSessionLaunchRequest, LOCAL_RUNTIME_NAMESPACE};
use sdkwork_terminal_pty_runtime::{execute_local_shell_command, LocalShellExecutionRequest};
use sdkwork_terminal_replay_store::ReplayEntry;
use sdkwork_terminal_resource_connectors::{
    CommandOutput, ConnectorExecutionError, ConnectorPhase,
    ConnectorSessionLaunchRequest as ResourceConnectorSessionLaunchRequest,
};
use sdkwork_terminal_session_runtime::{
    AttachmentRecord, ConnectorLaunchResolution, ConnectorLaunchResolutionResult, SessionRecord,
    SessionState,
};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn map_connector_launch_request(
    request: &ConnectorSessionLaunchRequest,
) -> ResourceConnectorSessionLaunchRequest {
    ResourceConnectorSessionLaunchRequest {
        workspace_id: request.workspace_id.clone(),
        target: request.target.clone(),
        authority: request.authority.clone(),
        command: request.command.clone(),
        mode_tags: request.mode_tags.clone(),
        tags: request.tags.clone(),
    }
}

pub(crate) fn summarize_connect_output(output: &CommandOutput) -> String {
    if !output.stdout.is_empty() {
        output.stdout.clone()
    } else if !output.stderr.is_empty() {
        output.stderr.clone()
    } else {
        format!("connect phase exited with status {}", output.status)
    }
}

pub(crate) fn build_exit_payload(exit_code: Option<i32>) -> Result<String, serde_json::Error> {
    serde_json::to_string(&serde_json::json!({
        "exitCode": exit_code,
    }))
}

pub(crate) fn build_local_shell_runtime_event_name(event_type: &str) -> String {
    format!(
        "{}:{}",
        LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
        event_type.replace('.', ":")
    )
}

fn map_replay_entry_snapshot(entry: ReplayEntry) -> DesktopReplayEntrySnapshot {
    DesktopReplayEntrySnapshot {
        sequence: entry.sequence,
        kind: entry.kind.as_str().to_string(),
        payload: entry.payload,
        occurred_at: entry.occurred_at,
    }
}

pub(crate) fn build_local_shell_stream_event_snapshot(
    entry: ReplayEntry,
) -> DesktopLocalShellStreamEventSnapshot {
    let next_cursor = entry.sequence.to_string();
    let session_id = entry.session_id.clone();

    DesktopLocalShellStreamEventSnapshot {
        session_id,
        next_cursor,
        entry: map_replay_entry_snapshot(entry),
    }
}

pub(crate) fn build_connector_execution_payload(
    error: &ConnectorExecutionError,
) -> Result<String, serde_json::Error> {
    serde_json::to_string(&serde_json::json!({
        "code": error.code,
        "phase": match error.phase {
            ConnectorPhase::Connect => "connect",
            ConnectorPhase::Exec => "exec",
            ConnectorPhase::Diag => "diag",
        },
        "retryable": error.retryable,
        "program": error.program,
        "status": error.status,
        "message": error.message,
    }))
}

pub(crate) fn map_connector_execution_error(
    error: ConnectorExecutionError,
) -> ConnectorLaunchResolution {
    ConnectorLaunchResolution::Failed {
        code: error.code.into(),
        phase: match error.phase {
            ConnectorPhase::Connect => "connect".into(),
            ConnectorPhase::Exec => "exec".into(),
            ConnectorPhase::Diag => "diag".into(),
        },
        retryable: error.retryable,
        program: error.program.into(),
        status: error.status,
        message: error.message,
    }
}

pub(crate) fn map_connector_launch_snapshot(
    resolution: ConnectorLaunchResolutionResult,
) -> DesktopConnectorLaunchSnapshot {
    DesktopConnectorLaunchSnapshot {
        session_id: resolution.session.session_id,
        workspace_id: resolution.session.workspace_id,
        target: resolution.session.target,
        state: session_state_label(&resolution.session.state).to_string(),
        created_at: resolution.session.created_at,
        last_active_at: resolution.session.last_active_at,
        mode_tags: resolution.session.mode_tags,
        tags: resolution.session.tags,
        replay_entry: DesktopReplayEntrySnapshot {
            sequence: resolution.replay_entry.sequence,
            kind: resolution.replay_entry.kind.as_str().to_string(),
            payload: resolution.replay_entry.payload,
            occurred_at: resolution.replay_entry.occurred_at,
        },
    }
}

pub(crate) fn map_connector_interactive_session_create_snapshot(
    bootstrap: InteractiveConnectorSessionBootstrap,
) -> DesktopConnectorInteractiveSessionCreateSnapshot {
    DesktopConnectorInteractiveSessionCreateSnapshot {
        session_id: bootstrap.session_id,
        workspace_id: bootstrap.workspace_id,
        target: bootstrap.target,
        state: bootstrap.state,
        created_at: bootstrap.created_at,
        last_active_at: bootstrap.last_active_at,
        mode_tags: bootstrap.mode_tags,
        tags: bootstrap.tags,
        attachment_id: bootstrap.attachment.attachment_id,
        cursor: bootstrap.attachment.cursor,
        last_ack_sequence: bootstrap.attachment.last_ack_sequence,
        writable: bootstrap.attachment.writable,
        authority: bootstrap.authority,
        invoked_program: bootstrap.invoked_program,
        invoked_args: bootstrap.invoked_args,
        working_directory: bootstrap.working_directory,
        replay_entry: map_replay_entry_snapshot(bootstrap.connect_replay_entry),
    }
}

pub(crate) fn derive_local_process_target(program: &str) -> String {
    let trimmed = program.trim();
    if trimmed.is_empty() {
        return "local-process".to_string();
    }

    let path = Path::new(trimmed);
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(trimmed);

    if file_name.len() > 4 && file_name[file_name.len() - 4..].eq_ignore_ascii_case(".exe") {
        return file_name[..file_name.len() - 4].to_string();
    }

    file_name.to_string()
}

pub(crate) fn normalize_metadata_value(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(str::to_string)
}

pub(crate) fn map_session_descriptor_snapshot(
    session: SessionRecord,
) -> DesktopSessionDescriptorSnapshot {
    DesktopSessionDescriptorSnapshot {
        session_id: session.session_id,
        workspace_id: session.workspace_id,
        target: session.target,
        state: session_state_label(&session.state).to_string(),
        created_at: session.created_at,
        last_active_at: session.last_active_at,
        mode_tags: session.mode_tags,
        tags: session.tags,
    }
}

pub(crate) fn map_attachment_descriptor_snapshot(
    attachment: AttachmentRecord,
) -> DesktopAttachmentDescriptorSnapshot {
    DesktopAttachmentDescriptorSnapshot {
        attachment_id: attachment.attachment_id,
        session_id: attachment.session_id,
        cursor: attachment.cursor,
        last_ack_sequence: attachment.last_ack_sequence,
        writable: attachment.writable,
    }
}

pub(crate) fn map_desktop_connector_interactive_request(
    request: &DesktopConnectorInteractiveSessionCreateRequest,
) -> ConnectorSessionLaunchRequest {
    ConnectorSessionLaunchRequest {
        workspace_id: request.workspace_id.clone(),
        target: request.target.clone(),
        authority: request.authority.clone(),
        command: request.command.clone(),
        mode_tags: request.mode_tags.clone(),
        tags: request.tags.clone(),
    }
}

pub(crate) fn session_state_label(state: &SessionState) -> &'static str {
    match state {
        SessionState::Creating => "Creating",
        SessionState::Starting => "Starting",
        SessionState::Running => "Running",
        SessionState::Detached => "Detached",
        SessionState::Reattaching => "Reattaching",
        SessionState::Replaying => "Replaying",
        SessionState::Stopping => "Stopping",
        SessionState::Exited => "Exited",
        SessionState::Failed => "Failed",
    }
}

pub(crate) fn current_occurred_at() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    format!("epoch-ms:{millis}")
}

pub(crate) fn run_local_shell_exec(
    request: DesktopLocalShellExecRequest,
) -> Result<DesktopLocalShellExecSnapshot, String> {
    let result = execute_local_shell_command(LocalShellExecutionRequest {
        profile: request.profile,
        command: request.command_text,
        working_directory: request.working_directory,
    })
    .map_err(|error| error.to_string())?;

    Ok(DesktopLocalShellExecSnapshot {
        profile: result.profile,
        command_text: result.command,
        working_directory: result.working_directory,
        invoked_program: result.invoked_program,
        exit_code: result.exit_code,
        stdout: result.stdout,
        stderr: result.stderr,
    })
}

pub(crate) fn resolve_working_directory_picker_starting_directory(
    value: Option<&str>,
) -> Option<PathBuf> {
    let candidate = value
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(PathBuf::from)?;

    if candidate.is_dir() {
        return Some(candidate);
    }

    candidate
        .parent()
        .filter(|parent| parent.is_dir())
        .map(Path::to_path_buf)
}

pub(crate) fn normalize_user_facing_path(path: &Path) -> String {
    #[cfg(windows)]
    {
        let display_path = path.to_string_lossy();

        if let Some(stripped) = display_path.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{stripped}");
        }

        if let Some(stripped) = display_path
            .strip_prefix(r"\\?\")
            .or_else(|| display_path.strip_prefix(r"\\.\"))
        {
            return stripped.to_string();
        }
    }

    path.to_string_lossy().into_owned()
}
