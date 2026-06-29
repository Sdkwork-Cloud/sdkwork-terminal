use crate::mapper::{
    build_connector_execution_payload, build_exit_payload, map_connector_execution_error,
    map_connector_launch_request, session_state_label, summarize_connect_output,
};
use crate::snapshots::{DesktopConnectorExecSnapshot, DesktopReplayEntrySnapshot};
use sdkwork_terminal_control_plane::{
    InteractiveConnectorSessionSpawnRequest, InteractiveConnectorSessionSpawnResult,
    InteractiveConnectorSessionSpawner,
};
use sdkwork_terminal_pty_runtime::{
    LocalShellSessionEvent, LocalShellSessionRuntime, PtyProcessLaunchCommand,
    PtyProcessSessionCreateRequest,
};
use sdkwork_terminal_resource_connectors::{
    build_cli_launch_plan_for_request, execute_plan_phase, CommandRunner, ConnectorPhase,
};
use sdkwork_terminal_session_runtime::{
    ConnectorLaunchResolution, ConnectorLaunchResolutionResult, SessionCreateRequest,
    SessionRuntime, SessionRuntimeError,
};
use std::{error::Error, fmt, sync::mpsc};

#[derive(Debug)]
pub enum ConnectorSessionLaunchError {
    Plan(sdkwork_terminal_resource_connectors::ConnectorPlanError),
    Runtime(SessionRuntimeError),
    RuntimePoisoned,
    Serde(serde_json::Error),
}

impl fmt::Display for ConnectorSessionLaunchError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Plan(cause) => write!(formatter, "connector launch plan error: {cause:?}"),
            Self::Runtime(cause) => write!(formatter, "session runtime error: {cause}"),
            Self::RuntimePoisoned => formatter.write_str("session runtime mutex poisoned"),
            Self::Serde(cause) => write!(formatter, "serde error: {cause}"),
        }
    }
}

impl Error for ConnectorSessionLaunchError {}

impl From<sdkwork_terminal_resource_connectors::ConnectorPlanError>
    for ConnectorSessionLaunchError
{
    fn from(value: sdkwork_terminal_resource_connectors::ConnectorPlanError) -> Self {
        Self::Plan(value)
    }
}

impl From<SessionRuntimeError> for ConnectorSessionLaunchError {
    fn from(value: SessionRuntimeError) -> Self {
        Self::Runtime(value)
    }
}

impl From<serde_json::Error> for ConnectorSessionLaunchError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serde(value)
    }
}

pub fn launch_connector_session_from_request(
    runtime: &mut SessionRuntime,
    request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
    runner: &impl CommandRunner,
    occurred_at: &str,
) -> Result<ConnectorLaunchResolutionResult, ConnectorSessionLaunchError> {
    let plan = build_cli_launch_plan_for_request(&map_connector_launch_request(request))?;
    let session =
        runtime.create_session(SessionCreateRequest::from_connector_launch_request(request));
    let resolution = match execute_plan_phase(&plan, ConnectorPhase::Connect, runner) {
        Ok(output) => ConnectorLaunchResolution::Running {
            phase: "connect".into(),
            detail: summarize_connect_output(&output),
        },
        Err(error) => map_connector_execution_error(error),
    };

    runtime
        .resolve_connector_launch(&session.session_id, resolution, occurred_at)
        .map_err(Into::into)
}

pub fn probe_connector_exec_from_request(
    runtime: &mut SessionRuntime,
    request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
    runner: &impl CommandRunner,
    occurred_at: &str,
) -> Result<DesktopConnectorExecSnapshot, ConnectorSessionLaunchError> {
    let plan = build_cli_launch_plan_for_request(&map_connector_launch_request(request))?;
    let session =
        runtime.create_session(SessionCreateRequest::from_connector_launch_request(request));
    let connect_resolution = match execute_plan_phase(&plan, ConnectorPhase::Connect, runner) {
        Ok(output) => runtime.resolve_connector_launch(
            &session.session_id,
            ConnectorLaunchResolution::Running {
                phase: "connect".into(),
                detail: summarize_connect_output(&output),
            },
            occurred_at,
        )?,
        Err(error) => {
            let resolution = runtime.resolve_connector_launch(
                &session.session_id,
                map_connector_execution_error(error),
                occurred_at,
            )?;

            return Ok(DesktopConnectorExecSnapshot {
                session_id: resolution.session.session_id,
                workspace_id: resolution.session.workspace_id,
                target: resolution.session.target,
                state: session_state_label(&resolution.session.state).to_string(),
                created_at: resolution.session.created_at,
                last_active_at: resolution.session.last_active_at,
                mode_tags: resolution.session.mode_tags,
                tags: resolution.session.tags,
                exit_code: resolution.session.exit_code,
                replay_entries: vec![DesktopReplayEntrySnapshot {
                    sequence: resolution.replay_entry.sequence,
                    kind: resolution.replay_entry.kind.as_str().to_string(),
                    payload: resolution.replay_entry.payload,
                    occurred_at: resolution.replay_entry.occurred_at,
                }],
            });
        }
    };

    let mut replay_entries = vec![DesktopReplayEntrySnapshot {
        sequence: connect_resolution.replay_entry.sequence,
        kind: connect_resolution.replay_entry.kind.as_str().to_string(),
        payload: connect_resolution.replay_entry.payload,
        occurred_at: connect_resolution.replay_entry.occurred_at,
    }];

    let session_id = connect_resolution.session.session_id.clone();
    let exec_outcome = execute_plan_phase(&plan, ConnectorPhase::Exec, runner);

    let exit_code = match exec_outcome {
        Ok(output) => {
            if !output.stdout.is_empty() {
                let entry = runtime.record_replay_event(
                    &session_id,
                    sdkwork_terminal_replay_store::ReplayEventKind::Output,
                    &output.stdout,
                    occurred_at,
                )?;
                replay_entries.push(DesktopReplayEntrySnapshot {
                    sequence: entry.sequence,
                    kind: entry.kind.as_str().to_string(),
                    payload: entry.payload,
                    occurred_at: entry.occurred_at,
                });
            }

            if !output.stderr.is_empty() {
                let entry = runtime.record_replay_event(
                    &session_id,
                    sdkwork_terminal_replay_store::ReplayEventKind::Warning,
                    &output.stderr,
                    occurred_at,
                )?;
                replay_entries.push(DesktopReplayEntrySnapshot {
                    sequence: entry.sequence,
                    kind: entry.kind.as_str().to_string(),
                    payload: entry.payload,
                    occurred_at: entry.occurred_at,
                });
            }

            Some(output.status)
        }
        Err(error) => {
            let payload = build_connector_execution_payload(&error)?;
            let entry = runtime.record_replay_event(
                &session_id,
                sdkwork_terminal_replay_store::ReplayEventKind::Warning,
                &payload,
                occurred_at,
            )?;
            replay_entries.push(DesktopReplayEntrySnapshot {
                sequence: entry.sequence,
                kind: entry.kind.as_str().to_string(),
                payload: entry.payload,
                occurred_at: entry.occurred_at,
            });

            error.status
        }
    };

    let exit_entry = runtime.record_replay_event(
        &session_id,
        sdkwork_terminal_replay_store::ReplayEventKind::Exit,
        &build_exit_payload(exit_code)?,
        occurred_at,
    )?;
    replay_entries.push(DesktopReplayEntrySnapshot {
        sequence: exit_entry.sequence,
        kind: exit_entry.kind.as_str().to_string(),
        payload: exit_entry.payload,
        occurred_at: exit_entry.occurred_at,
    });

    let session = runtime.terminate(&session_id, exit_code)?;

    Ok(DesktopConnectorExecSnapshot {
        session_id: session.session_id,
        workspace_id: session.workspace_id,
        target: session.target,
        state: session_state_label(&session.state).to_string(),
        created_at: session.created_at,
        last_active_at: session.last_active_at,
        mode_tags: session.mode_tags,
        tags: session.tags,
        exit_code: session.exit_code,
        replay_entries,
    })
}

pub(crate) struct DesktopInteractiveConnectorSpawner<'a> {
    pub(crate) runtime: &'a LocalShellSessionRuntime,
    pub(crate) event_sender: mpsc::SyncSender<LocalShellSessionEvent>,
}

impl InteractiveConnectorSessionSpawner for DesktopInteractiveConnectorSpawner<'_> {
    fn spawn_interactive_connector_session(
        &self,
        request: &InteractiveConnectorSessionSpawnRequest,
    ) -> Result<InteractiveConnectorSessionSpawnResult, String> {
        self.runtime
            .create_process_session(
                PtyProcessSessionCreateRequest {
                    session_id: request.session_id.clone(),
                    command: PtyProcessLaunchCommand {
                        program: request.program.clone(),
                        args: request.args.clone(),
                    },
                    working_directory: None,
                    cols: request.cols,
                    rows: request.rows,
                },
                self.event_sender.clone(),
            )
            .map(|bootstrap| InteractiveConnectorSessionSpawnResult {
                invoked_program: bootstrap.invoked_program,
                invoked_args: bootstrap.invoked_args,
                working_directory: bootstrap.working_directory,
            })
            .map_err(|error| error.to_string())
    }
}
