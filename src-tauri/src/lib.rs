use sdkwork_terminal_control_plane::{
    create_desktop_session_runtime, create_interactive_connector_session,
    InteractiveConnectorSessionBootstrap, InteractiveConnectorSessionSpawnRequest,
    InteractiveConnectorSessionSpawnResult, InteractiveConnectorSessionSpawner,
    DESKTOP_SESSION_RUNTIME_DB_FILE_NAME,
};
use sdkwork_terminal_protocol::{
    CONTRACT_VERSION, DESKTOP_BRIDGE_NAMESPACE, LOCAL_RUNTIME_NAMESPACE,
};
use sdkwork_terminal_pty_runtime::{
    execute_local_shell_command, LocalShellExecutionRequest, LocalShellSessionCreateRequest,
    LocalShellSessionEvent, LocalShellSessionRuntime, PtyProcessLaunchCommand,
    PtyProcessSessionCreateRequest,
};
use sdkwork_terminal_replay_store::{ReplayEntry, ReplayEventKind};
use sdkwork_terminal_resource_connectors::{
    build_cli_launch_plan_for_request, discover_connector_execution_targets, execute_plan_phase,
    CommandOutput, CommandRunner, ConnectorDiscoveryEnvironment, ConnectorExecutionError,
    ConnectorExecutionTarget, ConnectorHealth, ConnectorPhase,
    ConnectorSessionLaunchRequest as ResourceConnectorSessionLaunchRequest, ConnectorTransport,
};
use sdkwork_terminal_session_runtime::{
    AttachmentRecord, ConnectorLaunchResolution, ConnectorLaunchResolutionResult,
    LocalSessionDaemon, SessionCreateRequest, SessionRecord, SessionRuntime, SessionRuntimeError,
    SessionState,
};
use serde::{Deserialize, Serialize};
use std::{
    error::Error,
    fmt,
    path::{Path, PathBuf},
    sync::{mpsc, Arc, Mutex},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopHostSnapshot {
    pub host_label: String,
    pub contract_version: &'static str,
    pub control_plane_kind: &'static str,
    pub control_plane_namespace: &'static str,
    pub data_plane_kind: &'static str,
    pub data_plane_namespace: &'static str,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopExecutionTargetConnectorSnapshot {
    pub connector_id: String,
    pub label: String,
    pub transport: String,
    pub diagnostics_hint: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopExecutionTargetHealthSnapshot {
    pub status: String,
    pub summary: String,
    pub last_checked_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopExecutionTargetDescriptorSnapshot {
    pub target_id: String,
    pub workspace_id: String,
    pub kind: String,
    pub label: String,
    pub authority: String,
    pub connector: DesktopExecutionTargetConnectorSnapshot,
    pub health: DesktopExecutionTargetHealthSnapshot,
    pub session_launchable: bool,
    pub tags: Vec<String>,
}

pub struct DesktopRuntimeState {
    daemon: Mutex<LocalSessionDaemon>,
    session_runtime: Arc<Mutex<SessionRuntime>>,
    local_shell_runtime: LocalShellSessionRuntime,
    local_shell_event_sender: mpsc::Sender<LocalShellSessionEvent>,
}

impl Drop for DesktopRuntimeState {
    fn drop(&mut self) {
        let _ = self.local_shell_event_sender.send(
            sdkwork_terminal_pty_runtime::LocalShellSessionEvent::Exit {
                session_id: "__shutdown__".to_string(),
                exit_code: None,
            },
        );
        if let Ok(runtime) = self.session_runtime.lock() {
            for session in runtime.list_sessions() {
                if !matches!(session.state, SessionState::Exited | SessionState::Failed) {
                    let _ = self
                        .local_shell_runtime
                        .terminate_session(&session.session_id);
                }
            }
        }
    }
}

impl DesktopRuntimeState {
    fn new(app_handle: Option<tauri::AppHandle>) -> Self {
        Self::try_new(app_handle.clone()).unwrap_or_else(|error| {
            eprintln!(
                "sdkwork-terminal: failed to initialize sqlite-backed session runtime, falling back to in-memory runtime: {error}"
            );
            Self::build(app_handle, SessionRuntime::new())
        })
    }

    #[cfg_attr(not(test), allow(dead_code))]
    fn new_with_sqlite(
        app_handle: Option<tauri::AppHandle>,
        sqlite_path: impl AsRef<Path>,
    ) -> Result<Self, String> {
        let runtime = create_session_runtime(Some(sqlite_path.as_ref()))?;
        Ok(Self::build(app_handle, runtime))
    }

    fn try_new(app_handle: Option<tauri::AppHandle>) -> Result<Self, String> {
        let runtime = create_session_runtime(
            resolve_session_runtime_db_path(app_handle.as_ref())?.as_deref(),
        )?;
        Ok(Self::build(app_handle, runtime))
    }

    fn build(app_handle: Option<tauri::AppHandle>, session_runtime: SessionRuntime) -> Self {
        let mut daemon = LocalSessionDaemon::default();
        daemon.start();
        daemon.mark_running();
        let session_runtime = Arc::new(Mutex::new(session_runtime));
        let local_shell_runtime = if cfg!(windows) {
            LocalShellSessionRuntime::with_synthetic_probe_responses()
        } else {
            LocalShellSessionRuntime::default()
        };
        let (local_shell_event_sender, local_shell_event_receiver) = mpsc::channel();
        let session_runtime_for_events = Arc::clone(&session_runtime);
        let app_handle_for_events = app_handle.clone();

        thread::spawn(move || {
            while let Ok(event) = local_shell_event_receiver.recv() {
                let occurred_at = current_occurred_at();
                let Ok(mut runtime) = session_runtime_for_events.lock() else {
                    continue;
                };
                let runtime_event = match event {
                    LocalShellSessionEvent::Output {
                        session_id,
                        payload,
                    } => runtime
                        .record_output(&session_id, &payload, &occurred_at)
                        .ok()
                        .map(|entry| {
                            (
                                build_local_shell_runtime_event_name("session.output"),
                                build_local_shell_stream_event_snapshot(entry),
                            )
                        }),
                    LocalShellSessionEvent::Warning {
                        session_id,
                        message,
                    } => runtime
                        .record_replay_event(
                            &session_id,
                            ReplayEventKind::Warning,
                            &message,
                            &occurred_at,
                        )
                        .ok()
                        .map(|entry| {
                            (
                                build_local_shell_runtime_event_name("session.warning"),
                                build_local_shell_stream_event_snapshot(entry),
                            )
                        }),
                    LocalShellSessionEvent::Exit {
                        session_id,
                        exit_code,
                    } => {
                        let runtime_event = build_exit_payload(exit_code)
                            .ok()
                            .and_then(|payload| {
                                runtime
                                    .record_replay_event(
                                        &session_id,
                                        ReplayEventKind::Exit,
                                        &payload,
                                        &occurred_at,
                                    )
                                    .ok()
                            })
                            .map(|entry| {
                                (
                                    build_local_shell_runtime_event_name("session.exit"),
                                    build_local_shell_stream_event_snapshot(entry),
                                )
                            });
                        let _ = runtime.terminate(&session_id, exit_code);
                        runtime_event
                    }
                };
                drop(runtime);

                if let (Some(app_handle), Some((event_name, payload))) =
                    (app_handle_for_events.as_ref(), runtime_event)
                {
                    let _ = app_handle.emit(&event_name, payload);
                }
            }
        });

        Self {
            daemon: Mutex::new(daemon),
            session_runtime,
            local_shell_runtime,
            local_shell_event_sender,
        }
    }

    fn launch_connector_session(
        &self,
        request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
        runner: &impl CommandRunner,
        occurred_at: &str,
    ) -> Result<DesktopConnectorLaunchSnapshot, ConnectorSessionLaunchError> {
        let mut runtime = self
            .session_runtime
            .lock()
            .map_err(|_| ConnectorSessionLaunchError::RuntimePoisoned)?;
        let resolution =
            launch_connector_session_from_request(&mut runtime, request, runner, occurred_at)?;

        Ok(map_connector_launch_snapshot(resolution))
    }

    fn create_connector_interactive_session(
        &self,
        request: DesktopConnectorInteractiveSessionCreateRequest,
        runner: &impl CommandRunner,
        occurred_at: &str,
    ) -> Result<DesktopConnectorInteractiveSessionCreateSnapshot, String> {
        let mut runtime = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?;
        let spawner = DesktopInteractiveConnectorSpawner {
            runtime: &self.local_shell_runtime,
            event_sender: self.local_shell_event_sender.clone(),
        };
        let bootstrap = create_interactive_connector_session(
            &mut runtime,
            &map_desktop_connector_interactive_request(&request),
            request.cols.unwrap_or(120),
            request.rows.unwrap_or(32),
            runner,
            &spawner,
            occurred_at,
        )
        .map_err(|error| error.to_string())?;

        Ok(map_connector_interactive_session_create_snapshot(bootstrap))
    }

    fn probe_connector_exec_session(
        &self,
        request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
        runner: &impl CommandRunner,
        occurred_at: &str,
    ) -> Result<DesktopConnectorExecSnapshot, ConnectorSessionLaunchError> {
        let mut runtime = self
            .session_runtime
            .lock()
            .map_err(|_| ConnectorSessionLaunchError::RuntimePoisoned)?;

        probe_connector_exec_from_request(&mut runtime, request, runner, occurred_at)
    }

    fn session_index(&self) -> Result<DesktopSessionIndexSnapshot, String> {
        let runtime = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?;

        Ok(DesktopSessionIndexSnapshot {
            sessions: runtime
                .list_sessions()
                .into_iter()
                .map(map_session_descriptor_snapshot)
                .collect(),
            attachments: runtime
                .list_attachments()
                .into_iter()
                .map(map_attachment_descriptor_snapshot)
                .collect(),
        })
    }

    fn session_replay_slice(
        &self,
        session_id: &str,
        from_cursor: Option<String>,
        limit: usize,
    ) -> Result<DesktopSessionReplaySnapshot, String> {
        let runtime = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?;
        let replay = runtime
            .replay(session_id, from_cursor.as_deref(), limit)
            .map_err(|error| error.to_string())?;

        Ok(DesktopSessionReplaySnapshot {
            session_id: replay.session_id,
            from_cursor: replay.from_cursor,
            next_cursor: replay.next_cursor,
            has_more: replay.has_more,
            entries: replay
                .entries
                .into_iter()
                .map(|entry| DesktopReplayEntrySnapshot {
                    sequence: entry.sequence,
                    kind: entry.kind.as_str().to_string(),
                    payload: entry.payload,
                    occurred_at: entry.occurred_at,
                })
                .collect(),
        })
    }

    fn attach_session(
        &self,
        request: DesktopSessionAttachRequest,
    ) -> Result<DesktopSessionAttachmentSnapshot, String> {
        let (session, attachment) = {
            let mut runtime = self
                .session_runtime
                .lock()
                .map_err(|_| "session runtime mutex poisoned".to_string())?;
            let attachment = runtime
                .attach(&request.session_id)
                .map_err(|error| error.to_string())?;
            let session = runtime
                .list_sessions()
                .into_iter()
                .find(|session| session.session_id == request.session_id)
                .ok_or_else(|| format!("session not found: {}", request.session_id))?;
            (session, attachment)
        };

        Ok(DesktopSessionAttachmentSnapshot {
            session: map_session_descriptor_snapshot(session),
            attachment: map_attachment_descriptor_snapshot(attachment),
        })
    }

    fn detach_session_attachment(
        &self,
        request: DesktopSessionDetachRequest,
    ) -> Result<DesktopSessionDescriptorSnapshot, String> {
        let session = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?
            .detach(&request.attachment_id)
            .map_err(|error| error.to_string())?;

        Ok(map_session_descriptor_snapshot(session))
    }

    fn reattach_session(
        &self,
        request: DesktopSessionAttachRequest,
    ) -> Result<DesktopSessionAttachmentSnapshot, String> {
        let result = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?
            .reattach(&request.session_id)
            .map_err(|error| error.to_string())?;

        Ok(DesktopSessionAttachmentSnapshot {
            session: map_session_descriptor_snapshot(result.session),
            attachment: map_attachment_descriptor_snapshot(result.attachment),
        })
    }

    fn create_local_shell_session(
        &self,
        request: DesktopLocalShellSessionCreateRequest,
    ) -> Result<DesktopLocalShellSessionCreateSnapshot, String> {
        let occurred_at = current_occurred_at();
        let mode_tags = vec!["cli-native".to_string()];
        let tags = vec![format!("profile:{}", request.profile.trim().to_lowercase())];
        let (session, attachment) = {
            let mut runtime = self
                .session_runtime
                .lock()
                .map_err(|_| "session runtime mutex poisoned".to_string())?;
            let session = runtime.create_session(SessionCreateRequest {
                workspace_id: "workspace-local".into(),
                target: "local-shell".into(),
                mode_tags: mode_tags.clone(),
                tags: tags.clone(),
                launch_intent: None,
            });
            let attachment = runtime
                .attach(&session.session_id)
                .map_err(|error| error.to_string())?;
            (session, attachment)
        };

        let bootstrap = match self.local_shell_runtime.create_session(
            LocalShellSessionCreateRequest {
                session_id: session.session_id.clone(),
                profile: request.profile,
                working_directory: request.working_directory,
                cols: request.cols.unwrap_or(120),
                rows: request.rows.unwrap_or(32),
            },
            self.local_shell_event_sender.clone(),
        ) {
            Ok(value) => value,
            Err(error) => {
                let mut runtime = self
                    .session_runtime
                    .lock()
                    .map_err(|_| "session runtime mutex poisoned".to_string())?;
                let _ = runtime.record_replay_event(
                    &session.session_id,
                    ReplayEventKind::Warning,
                    &error.to_string(),
                    &occurred_at,
                );
                let _ = runtime.fail(&session.session_id, &occurred_at);
                return Err(error.to_string());
            }
        };

        Ok(DesktopLocalShellSessionCreateSnapshot {
            session_id: session.session_id,
            workspace_id: session.workspace_id,
            target: session.target,
            state: session_state_label(&session.state).to_string(),
            created_at: session.created_at,
            last_active_at: session.last_active_at,
            mode_tags: session.mode_tags,
            tags: session.tags,
            attachment_id: attachment.attachment_id,
            cursor: attachment.cursor,
            last_ack_sequence: attachment.last_ack_sequence,
            writable: attachment.writable,
            profile: bootstrap.profile,
            working_directory: bootstrap.working_directory,
            invoked_program: bootstrap.invoked_program,
        })
    }

    fn write_local_shell_input(
        &self,
        request: DesktopLocalShellSessionInputRequest,
    ) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
        let accepted_bytes = self
            .local_shell_runtime
            .write_input(&request.session_id, &request.input)
            .map_err(|error| error.to_string())?;

        Ok(DesktopLocalShellSessionInputSnapshot {
            session_id: request.session_id,
            accepted_bytes,
        })
    }

    fn write_local_shell_input_bytes(
        &self,
        request: DesktopLocalShellSessionInputBytesRequest,
    ) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
        let accepted_bytes = self
            .local_shell_runtime
            .write_input_bytes(&request.session_id, &request.input_bytes)
            .map_err(|error| error.to_string())?;

        Ok(DesktopLocalShellSessionInputSnapshot {
            session_id: request.session_id,
            accepted_bytes,
        })
    }

    fn acknowledge_session_attachment(
        &self,
        request: DesktopSessionAttachmentAcknowledgeRequest,
    ) -> Result<DesktopAttachmentDescriptorSnapshot, String> {
        let attachment = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?
            .acknowledge(&request.attachment_id, request.sequence)
            .map_err(|error| error.to_string())?;

        Ok(DesktopAttachmentDescriptorSnapshot {
            attachment_id: attachment.attachment_id,
            session_id: attachment.session_id,
            cursor: attachment.cursor,
            last_ack_sequence: attachment.last_ack_sequence,
            writable: attachment.writable,
        })
    }

    fn resize_local_shell_session(
        &self,
        request: DesktopLocalShellSessionResizeRequest,
    ) -> Result<DesktopLocalShellSessionResizeSnapshot, String> {
        self.local_shell_runtime
            .resize_session(&request.session_id, request.cols, request.rows)
            .map_err(|error| error.to_string())?;

        Ok(DesktopLocalShellSessionResizeSnapshot {
            session_id: request.session_id,
            cols: request.cols,
            rows: request.rows,
        })
    }

    fn terminate_local_shell_session(
        &self,
        session_id: &str,
    ) -> Result<DesktopLocalShellSessionTerminateSnapshot, String> {
        self.local_shell_runtime
            .terminate_session(session_id)
            .map_err(|error| error.to_string())?;

        let session = self
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?
            .mark_stopping(session_id, &current_occurred_at())
            .map_err(|error| error.to_string())?;

        Ok(DesktopLocalShellSessionTerminateSnapshot {
            session_id: session.session_id,
            state: session_state_label(&session.state).to_string(),
        })
    }
}

fn create_session_runtime(sqlite_path: Option<&Path>) -> Result<SessionRuntime, String> {
    create_desktop_session_runtime(sqlite_path)
}

fn resolve_session_runtime_db_path(
    app_handle: Option<&tauri::AppHandle>,
) -> Result<Option<PathBuf>, String> {
    let Some(app_handle) = app_handle else {
        return Ok(None);
    };

    let app_local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("failed to resolve desktop app local data dir: {error}"))?;

    Ok(Some(
        app_local_data_dir.join(DESKTOP_SESSION_RUNTIME_DB_FILE_NAME),
    ))
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopReplayEntrySnapshot {
    pub sequence: u64,
    pub kind: String,
    pub payload: String,
    pub occurred_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellStreamEventSnapshot {
    pub session_id: String,
    pub next_cursor: String,
    pub entry: DesktopReplayEntrySnapshot,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConnectorLaunchSnapshot {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub replay_entry: DesktopReplayEntrySnapshot,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConnectorInteractiveSessionCreateRequest {
    pub workspace_id: String,
    pub target: String,
    pub authority: String,
    pub command: Vec<String>,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConnectorInteractiveSessionCreateSnapshot {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub attachment_id: String,
    pub cursor: String,
    pub last_ack_sequence: u64,
    pub writable: bool,
    pub authority: String,
    pub invoked_program: String,
    pub invoked_args: Vec<String>,
    pub working_directory: String,
    pub replay_entry: DesktopReplayEntrySnapshot,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConnectorExecSnapshot {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub exit_code: Option<i32>,
    pub replay_entries: Vec<DesktopReplayEntrySnapshot>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionDescriptorSnapshot {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopAttachmentDescriptorSnapshot {
    pub attachment_id: String,
    pub session_id: String,
    pub cursor: String,
    pub last_ack_sequence: u64,
    pub writable: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionIndexSnapshot {
    pub sessions: Vec<DesktopSessionDescriptorSnapshot>,
    pub attachments: Vec<DesktopAttachmentDescriptorSnapshot>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionReplaySnapshot {
    pub session_id: String,
    pub from_cursor: Option<String>,
    pub next_cursor: String,
    pub has_more: bool,
    pub entries: Vec<DesktopReplayEntrySnapshot>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionAttachRequest {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionDetachRequest {
    pub attachment_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionAttachmentSnapshot {
    pub session: DesktopSessionDescriptorSnapshot,
    pub attachment: DesktopAttachmentDescriptorSnapshot,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellExecRequest {
    pub profile: String,
    pub command_text: String,
    pub working_directory: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellExecSnapshot {
    pub profile: String,
    pub command_text: String,
    pub working_directory: String,
    pub invoked_program: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionCreateRequest {
    pub profile: String,
    pub working_directory: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionCreateSnapshot {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub attachment_id: String,
    pub cursor: String,
    pub last_ack_sequence: u64,
    pub writable: bool,
    pub profile: String,
    pub working_directory: String,
    pub invoked_program: String,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionInputRequest {
    pub session_id: String,
    pub input: String,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionInputBytesRequest {
    pub session_id: String,
    pub input_bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionInputSnapshot {
    pub session_id: String,
    pub accepted_bytes: usize,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionAttachmentAcknowledgeRequest {
    pub attachment_id: String,
    pub sequence: u64,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionResizeRequest {
    pub session_id: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionResizeSnapshot {
    pub session_id: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopLocalShellSessionTerminateSnapshot {
    pub session_id: String,
    pub state: String,
}

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

fn map_connector_launch_request(
    request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
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

fn summarize_connect_output(output: &CommandOutput) -> String {
    if !output.stdout.is_empty() {
        output.stdout.clone()
    } else if !output.stderr.is_empty() {
        output.stderr.clone()
    } else {
        format!("connect phase exited with status {}", output.status)
    }
}

fn build_exit_payload(exit_code: Option<i32>) -> Result<String, serde_json::Error> {
    serde_json::to_string(&serde_json::json!({
        "exitCode": exit_code,
    }))
}

fn build_local_shell_runtime_event_name(event_type: &str) -> String {
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

fn build_local_shell_stream_event_snapshot(
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

fn build_connector_execution_payload(
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

fn map_connector_execution_error(error: ConnectorExecutionError) -> ConnectorLaunchResolution {
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

fn map_connector_launch_snapshot(
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

fn map_connector_interactive_session_create_snapshot(
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

fn map_session_descriptor_snapshot(session: SessionRecord) -> DesktopSessionDescriptorSnapshot {
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

fn map_attachment_descriptor_snapshot(
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

fn map_desktop_connector_interactive_request(
    request: &DesktopConnectorInteractiveSessionCreateRequest,
) -> sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
    sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
        workspace_id: request.workspace_id.clone(),
        target: request.target.clone(),
        authority: request.authority.clone(),
        command: request.command.clone(),
        mode_tags: request.mode_tags.clone(),
        tags: request.tags.clone(),
    }
}

struct DesktopInteractiveConnectorSpawner<'a> {
    runtime: &'a LocalShellSessionRuntime,
    event_sender: mpsc::Sender<LocalShellSessionEvent>,
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

fn session_state_label(state: &SessionState) -> &'static str {
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

fn current_occurred_at() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    format!("epoch-ms:{millis}")
}

fn run_local_shell_exec(
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

pub fn build_desktop_host_snapshot() -> DesktopHostSnapshot {
    DesktopHostSnapshot {
        host_label: "sdkwork-terminal thin host ready".to_string(),
        contract_version: CONTRACT_VERSION,
        control_plane_kind: "tauri-ipc",
        control_plane_namespace: DESKTOP_BRIDGE_NAMESPACE,
        data_plane_kind: "local-runtime-channel",
        data_plane_namespace: LOCAL_RUNTIME_NAMESPACE,
    }
}

const DEFAULT_EXECUTION_TARGET_WORKSPACE_ID: &str = "workspace-demo";

fn connector_transport_label(transport: ConnectorTransport) -> &'static str {
    match transport {
        ConnectorTransport::SystemCli => "system-cli",
        ConnectorTransport::RemoteApi => "remote-api",
    }
}

fn connector_health_label(health: ConnectorHealth) -> &'static str {
    match health {
        ConnectorHealth::Ready => "ready",
        ConnectorHealth::Degraded => "degraded",
        ConnectorHealth::Unavailable => "unavailable",
    }
}

fn map_connector_execution_target_snapshot(
    target: ConnectorExecutionTarget,
) -> DesktopExecutionTargetDescriptorSnapshot {
    DesktopExecutionTargetDescriptorSnapshot {
        target_id: target.target_id,
        workspace_id: target.workspace_id,
        kind: target.kind,
        label: target.label,
        authority: target.authority,
        connector: DesktopExecutionTargetConnectorSnapshot {
            connector_id: target.connector_id,
            label: target.connector_label,
            transport: connector_transport_label(target.transport).to_string(),
            diagnostics_hint: target.diagnostics_hint,
        },
        health: DesktopExecutionTargetHealthSnapshot {
            status: connector_health_label(target.health).to_string(),
            summary: target.health_summary,
            last_checked_at: target.last_checked_at,
        },
        session_launchable: target.session_launchable,
        tags: target.tags,
    }
}

fn build_desktop_execution_target_catalog_with(
    runner: &impl CommandRunner,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> Vec<DesktopExecutionTargetDescriptorSnapshot> {
    let mut targets = vec![DesktopExecutionTargetDescriptorSnapshot {
        target_id: "target-local-shell".to_string(),
        workspace_id: DEFAULT_EXECUTION_TARGET_WORKSPACE_ID.to_string(),
        kind: "local-shell".to_string(),
        label: "Local Shell".to_string(),
        authority: "localhost".to_string(),
        connector: DesktopExecutionTargetConnectorSnapshot {
            connector_id: "builtin-local-shell".to_string(),
            label: "Builtin PTY".to_string(),
            transport: "builtin".to_string(),
            diagnostics_hint: "Verify local shell profile and PTY permissions.".to_string(),
        },
        health: DesktopExecutionTargetHealthSnapshot {
            status: "ready".to_string(),
            summary: "Local PTY runtime ready.".to_string(),
            last_checked_at: occurred_at.to_string(),
        },
        session_launchable: true,
        tags: vec!["desktop".to_string(), "default".to_string()],
    }];

    targets.extend(
        discover_connector_execution_targets(runner, environment, occurred_at)
            .into_iter()
            .map(map_connector_execution_target_snapshot),
    );

    targets
}

pub fn build_desktop_execution_target_catalog() -> Vec<DesktopExecutionTargetDescriptorSnapshot> {
    let occurred_at = current_occurred_at();
    build_desktop_execution_target_catalog_with(
        &sdkwork_terminal_resource_connectors::SystemCommandRunner,
        &ConnectorDiscoveryEnvironment::from_process(),
        &occurred_at,
    )
}

mod commands {
    use super::{
        build_desktop_execution_target_catalog, build_desktop_host_snapshot, current_occurred_at,
        run_local_shell_exec, DesktopAttachmentDescriptorSnapshot, DesktopConnectorExecSnapshot,
        DesktopConnectorInteractiveSessionCreateRequest,
        DesktopConnectorInteractiveSessionCreateSnapshot, DesktopConnectorLaunchSnapshot,
        DesktopExecutionTargetDescriptorSnapshot, DesktopHostSnapshot,
        DesktopLocalShellExecRequest, DesktopLocalShellExecSnapshot,
        DesktopLocalShellSessionCreateRequest, DesktopLocalShellSessionCreateSnapshot,
        DesktopLocalShellSessionInputBytesRequest, DesktopLocalShellSessionInputRequest,
        DesktopLocalShellSessionInputSnapshot, DesktopLocalShellSessionResizeRequest,
        DesktopLocalShellSessionResizeSnapshot, DesktopLocalShellSessionTerminateSnapshot,
        DesktopRuntimeState, DesktopSessionAttachRequest,
        DesktopSessionAttachmentAcknowledgeRequest, DesktopSessionAttachmentSnapshot,
        DesktopSessionDescriptorSnapshot, DesktopSessionDetachRequest, DesktopSessionIndexSnapshot,
        DesktopSessionReplaySnapshot,
    };
    use sdkwork_terminal_protocol::ConnectorSessionLaunchRequest;
    use sdkwork_terminal_resource_connectors::SystemCommandRunner;
    use sdkwork_terminal_session_runtime::LocalDaemonHealthSnapshot;

    #[tauri::command]
    pub fn desktop_host_status() -> DesktopHostSnapshot {
        build_desktop_host_snapshot()
    }

    #[tauri::command]
    pub fn desktop_daemon_health(
        state: tauri::State<'_, DesktopRuntimeState>,
    ) -> Result<LocalDaemonHealthSnapshot, String> {
        state
            .daemon
            .lock()
            .map_err(|_| "daemon mutex poisoned".to_string())
            .map(|daemon| daemon.health_snapshot())
    }

    #[tauri::command]
    pub fn desktop_daemon_start(
        state: tauri::State<'_, DesktopRuntimeState>,
    ) -> Result<LocalDaemonHealthSnapshot, String> {
        state
            .daemon
            .lock()
            .map_err(|_| "daemon mutex poisoned".to_string())
            .map(|mut daemon| daemon.start())
    }

    #[tauri::command]
    pub fn desktop_daemon_stop(
        state: tauri::State<'_, DesktopRuntimeState>,
    ) -> Result<LocalDaemonHealthSnapshot, String> {
        state
            .daemon
            .lock()
            .map_err(|_| "daemon mutex poisoned".to_string())
            .map(|mut daemon| daemon.stop())
    }

    #[tauri::command]
    pub fn desktop_daemon_reconnect(
        state: tauri::State<'_, DesktopRuntimeState>,
    ) -> Result<LocalDaemonHealthSnapshot, String> {
        state
            .daemon
            .lock()
            .map_err(|_| "daemon mutex poisoned".to_string())
            .map(|mut daemon| daemon.reconnect())
    }

    #[tauri::command]
    pub fn desktop_execution_target_catalog() -> Vec<DesktopExecutionTargetDescriptorSnapshot> {
        build_desktop_execution_target_catalog()
    }

    #[tauri::command]
    pub fn desktop_session_index(
        state: tauri::State<'_, DesktopRuntimeState>,
    ) -> Result<DesktopSessionIndexSnapshot, String> {
        state.session_index()
    }

    #[tauri::command]
    pub fn desktop_session_replay_slice(
        state: tauri::State<'_, DesktopRuntimeState>,
        session_id: String,
        from_cursor: Option<String>,
        limit: Option<usize>,
    ) -> Result<DesktopSessionReplaySnapshot, String> {
        state.session_replay_slice(&session_id, from_cursor, limit.unwrap_or(32))
    }

    #[tauri::command]
    pub fn desktop_session_attach(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopSessionAttachRequest,
    ) -> Result<DesktopSessionAttachmentSnapshot, String> {
        state.attach_session(request)
    }

    #[tauri::command]
    pub fn desktop_session_detach(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopSessionDetachRequest,
    ) -> Result<DesktopSessionDescriptorSnapshot, String> {
        state.detach_session_attachment(request)
    }

    #[tauri::command]
    pub fn desktop_session_reattach(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopSessionAttachRequest,
    ) -> Result<DesktopSessionAttachmentSnapshot, String> {
        state.reattach_session(request)
    }

    #[tauri::command]
    pub fn desktop_connector_launch(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: ConnectorSessionLaunchRequest,
    ) -> Result<DesktopConnectorLaunchSnapshot, String> {
        let runner = SystemCommandRunner;

        state
            .launch_connector_session(&request, &runner, &current_occurred_at())
            .map_err(|error| error.to_string())
    }

    #[tauri::command]
    pub fn desktop_connector_session_create(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopConnectorInteractiveSessionCreateRequest,
    ) -> Result<DesktopConnectorInteractiveSessionCreateSnapshot, String> {
        let runner = SystemCommandRunner;

        state.create_connector_interactive_session(request, &runner, &current_occurred_at())
    }

    #[tauri::command]
    pub fn desktop_connector_exec_probe(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: ConnectorSessionLaunchRequest,
    ) -> Result<DesktopConnectorExecSnapshot, String> {
        let runner = SystemCommandRunner;

        state
            .probe_connector_exec_session(&request, &runner, &current_occurred_at())
            .map_err(|error| error.to_string())
    }

    #[tauri::command]
    pub fn desktop_local_shell_exec(
        request: DesktopLocalShellExecRequest,
    ) -> Result<DesktopLocalShellExecSnapshot, String> {
        run_local_shell_exec(request)
    }

    #[tauri::command]
    pub fn desktop_local_shell_session_create(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionCreateRequest,
    ) -> Result<DesktopLocalShellSessionCreateSnapshot, String> {
        state.create_local_shell_session(request)
    }

    #[tauri::command]
    pub fn desktop_local_shell_session_input(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionInputRequest,
    ) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
        state.write_local_shell_input(request)
    }

    #[tauri::command]
    pub fn desktop_session_input(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionInputRequest,
    ) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
        state.write_local_shell_input(request)
    }

    #[tauri::command]
    pub fn desktop_local_shell_session_input_bytes(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionInputBytesRequest,
    ) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
        state.write_local_shell_input_bytes(request)
    }

    #[tauri::command]
    pub fn desktop_session_input_bytes(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionInputBytesRequest,
    ) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
        state.write_local_shell_input_bytes(request)
    }

    #[tauri::command]
    pub fn desktop_session_attachment_acknowledge(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopSessionAttachmentAcknowledgeRequest,
    ) -> Result<DesktopAttachmentDescriptorSnapshot, String> {
        state.acknowledge_session_attachment(request)
    }

    #[tauri::command]
    pub fn desktop_session_resize(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionResizeRequest,
    ) -> Result<DesktopLocalShellSessionResizeSnapshot, String> {
        state.resize_local_shell_session(request)
    }

    #[tauri::command]
    pub fn desktop_local_shell_session_resize(
        state: tauri::State<'_, DesktopRuntimeState>,
        request: DesktopLocalShellSessionResizeRequest,
    ) -> Result<DesktopLocalShellSessionResizeSnapshot, String> {
        state.resize_local_shell_session(request)
    }

    #[tauri::command]
    pub fn desktop_session_terminate(
        state: tauri::State<'_, DesktopRuntimeState>,
        session_id: String,
    ) -> Result<DesktopLocalShellSessionTerminateSnapshot, String> {
        state.terminate_local_shell_session(&session_id)
    }

    #[tauri::command]
    pub fn desktop_local_shell_session_terminate(
        state: tauri::State<'_, DesktopRuntimeState>,
        session_id: String,
    ) -> Result<DesktopLocalShellSessionTerminateSnapshot, String> {
        state.terminate_local_shell_session(&session_id)
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(DesktopRuntimeState::new(Some(app.handle().clone())));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::desktop_host_status,
            commands::desktop_daemon_health,
            commands::desktop_daemon_start,
            commands::desktop_daemon_stop,
            commands::desktop_daemon_reconnect,
            commands::desktop_execution_target_catalog,
            commands::desktop_session_index,
            commands::desktop_session_replay_slice,
            commands::desktop_session_attach,
            commands::desktop_session_detach,
            commands::desktop_session_reattach,
            commands::desktop_connector_launch,
            commands::desktop_connector_session_create,
            commands::desktop_connector_exec_probe,
            commands::desktop_local_shell_exec,
            commands::desktop_local_shell_session_create,
            commands::desktop_session_input,
            commands::desktop_session_input_bytes,
            commands::desktop_local_shell_session_input,
            commands::desktop_local_shell_session_input_bytes,
            commands::desktop_session_attachment_acknowledge,
            commands::desktop_session_resize,
            commands::desktop_session_terminate,
            commands::desktop_local_shell_session_resize,
            commands::desktop_local_shell_session_terminate
        ])
        .run(tauri::generate_context!())
        .expect("failed to run sdkwork-terminal desktop host");
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_terminal_resource_connectors::{
        CommandOutput, CommandRunner, CommandRunnerError, ConnectorCommand,
    };
    use sdkwork_terminal_session_runtime::{SessionRuntime, SessionState};
    use std::{
        cell::RefCell,
        collections::VecDeque,
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[derive(Debug, Clone)]
    enum StubOutcome {
        Ok(CommandOutput),
        Err(CommandRunnerError),
    }

    #[derive(Default)]
    struct StubRunner {
        commands: RefCell<Vec<ConnectorCommand>>,
        outcomes: RefCell<VecDeque<StubOutcome>>,
    }

    impl StubRunner {
        fn with_outcomes(outcomes: Vec<StubOutcome>) -> Self {
            Self {
                commands: RefCell::new(Vec::new()),
                outcomes: RefCell::new(VecDeque::from(outcomes)),
            }
        }
    }

    impl CommandRunner for StubRunner {
        fn run(&self, command: &ConnectorCommand) -> Result<CommandOutput, CommandRunnerError> {
            self.commands.borrow_mut().push(command.clone());
            match self.outcomes.borrow_mut().pop_front() {
                Some(StubOutcome::Ok(output)) => Ok(output),
                Some(StubOutcome::Err(error)) => Err(error),
                None => Ok(CommandOutput {
                    status: 0,
                    stdout: String::new(),
                    stderr: String::new(),
                }),
            }
        }
    }

    fn temp_db_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();

        std::env::temp_dir().join(format!("sdkwork-terminal-desktop-{name}-{unique}.db"))
    }

    #[test]
    fn desktop_host_snapshot_matches_contract_namespaces() {
        let snapshot = build_desktop_host_snapshot();

        assert_eq!(snapshot.contract_version, CONTRACT_VERSION);
        assert_eq!(snapshot.control_plane_namespace, DESKTOP_BRIDGE_NAMESPACE);
        assert_eq!(snapshot.data_plane_namespace, LOCAL_RUNTIME_NAMESPACE);
    }

    #[test]
    fn desktop_execution_target_catalog_uses_discovered_connector_targets() {
        let home_dir = std::env::temp_dir().join(format!(
            "sdkwork-terminal-target-catalog-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let ssh_dir = home_dir.join(".ssh");
        fs::create_dir_all(&ssh_dir).unwrap();
        fs::write(
            ssh_dir.join("config"),
            "Host prod-bastion stage-bastion\n  HostName 10.0.0.10\n",
        )
        .unwrap();
        fs::write(ssh_dir.join("known_hosts"), "prod-bastion ssh-ed25519 AAAA").unwrap();

        let runner = StubRunner::with_outcomes(vec![
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "OpenSSH_9.8".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "Docker version 27.0.0".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "workspace-dev\nworkspace-api".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "{\"clientVersion\":{\"gitVersion\":\"v1.30.0\"}}".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "prod-cluster".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "prod/web-0\nprod/web-1".into(),
                stderr: String::new(),
            }),
        ]);

        let catalog = build_desktop_execution_target_catalog_with(
            &runner,
            &ConnectorDiscoveryEnvironment {
                workspace_id: "workspace-desktop".into(),
                home_dir: Some(home_dir.clone()),
                ssh_authority: None,
                docker_authority: None,
                kubernetes_authority: None,
                remote_runtime_authority: Some("runtime://edge-node-a".into()),
            },
            "2026-04-10T15:10:00.000Z",
        );

        assert_eq!(catalog.len(), 8);
        assert_eq!(catalog[0].kind, "local-shell");
        assert_eq!(catalog[1].kind, "ssh");
        assert_eq!(catalog[1].authority, "prod-bastion");
        assert_eq!(catalog[1].health.status, "ready");
        assert_eq!(catalog[2].kind, "ssh");
        assert_eq!(catalog[2].authority, "stage-bastion");
        assert_eq!(catalog[2].health.status, "ready");
        assert_eq!(catalog[3].kind, "docker-exec");
        assert_eq!(catalog[3].authority, "docker://workspace-dev");
        assert_eq!(catalog[3].health.status, "ready");
        assert_eq!(catalog[4].kind, "docker-exec");
        assert_eq!(catalog[4].authority, "docker://workspace-api");
        assert_eq!(catalog[4].health.status, "ready");
        assert_eq!(catalog[5].kind, "kubernetes-exec");
        assert_eq!(catalog[5].authority, "k8s://prod/web-0");
        assert_eq!(catalog[5].health.status, "ready");
        assert_eq!(catalog[6].kind, "kubernetes-exec");
        assert_eq!(catalog[6].authority, "k8s://prod/web-1");
        assert_eq!(catalog[6].health.status, "ready");
        assert_eq!(catalog[7].kind, "remote-runtime");
        assert_eq!(catalog[7].authority, "runtime://edge-node-a");
        assert_eq!(catalog[7].health.status, "degraded");
        assert!(!catalog[7].session_launchable);

        let _ = fs::remove_dir_all(home_dir);
    }

    #[test]
    fn local_shell_runtime_event_names_follow_protocol_runtime_namespace() {
        assert_eq!(
            build_local_shell_runtime_event_name("session.output"),
            format!(
                "{}:{}",
                LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
                "session.output".replace('.', ":")
            )
        );
        assert_eq!(
            build_local_shell_runtime_event_name("session.warning"),
            format!(
                "{}:{}",
                LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
                "session.warning".replace('.', ":")
            )
        );
        assert_eq!(
            build_local_shell_runtime_event_name("session.exit"),
            format!(
                "{}:{}",
                LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
                "session.exit".replace('.', ":")
            )
        );
    }

    #[test]
    fn launch_connector_session_from_request_marks_session_running_after_successful_connect_phase()
    {
        let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            authority: "ops@prod-bastion".into(),
            command: vec!["bash".into(), "-l".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
        };
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "ssh handshake complete".into(),
            stderr: String::new(),
        })]);

        let resolution = launch_connector_session_from_request(
            &mut runtime,
            &request,
            &runner,
            "2026-04-09T00:00:20.000Z",
        )
        .unwrap();

        assert_eq!(resolution.session.state, SessionState::Running);
        let payload =
            serde_json::from_str::<serde_json::Value>(&resolution.replay_entry.payload).unwrap();
        assert_eq!(payload["state"], "running");
        assert_eq!(payload["phase"], "connect");
        assert_eq!(payload["detail"], "ssh handshake complete");
        assert_eq!(runner.commands.borrow()[0].program, "ssh");
    }

    #[test]
    fn launch_connector_session_from_request_marks_session_failed_after_connect_phase_error() {
        let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-remote".into(),
            target: "kubernetes-exec".into(),
            authority: "k8s://prod/web-0".into(),
            command: vec!["/bin/sh".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:kubernetes-exec".into()],
        };
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Err(CommandRunnerError::Exit {
            status: 1,
            stderr: "rbac denied".into(),
        })]);

        let resolution = launch_connector_session_from_request(
            &mut runtime,
            &request,
            &runner,
            "2026-04-09T00:00:21.000Z",
        )
        .unwrap();

        assert_eq!(resolution.session.state, SessionState::Failed);
        assert_eq!(resolution.replay_entry.kind.as_str(), "warning");
        let payload =
            serde_json::from_str::<serde_json::Value>(&resolution.replay_entry.payload).unwrap();
        assert_eq!(payload["state"], "failed");
        assert_eq!(payload["code"], "connector_connect_failed");
        assert_eq!(payload["program"], "kubectl");
        assert_eq!(payload["message"], "rbac denied");
    }

    #[test]
    fn desktop_runtime_state_launches_connector_session_with_runner() {
        let state = DesktopRuntimeState::new(None);
        let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            authority: "ops@prod-bastion".into(),
            command: vec!["bash".into(), "-l".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
        };
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "ssh handshake complete".into(),
            stderr: String::new(),
        })]);

        let snapshot = state
            .launch_connector_session(&request, &runner, "2026-04-09T00:00:22.000Z")
            .unwrap();

        assert_eq!(snapshot.session_id, "session-0001");
        assert_eq!(snapshot.state, "Running");
        assert_eq!(snapshot.replay_entry.kind, "state");
        assert_eq!(snapshot.workspace_id, "workspace-remote");
        assert_eq!(runner.commands.borrow()[0].program, "ssh");
    }

    #[test]
    fn probe_connector_exec_from_request_records_output_and_exit_after_connect_success() {
        let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            authority: "ops@prod-bastion".into(),
            command: vec!["/bin/sh".into(), "-lc".into(), "pwd".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
        };
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "ssh handshake complete".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "/workspace".into(),
                stderr: String::new(),
            }),
        ]);

        let snapshot = probe_connector_exec_from_request(
            &mut runtime,
            &request,
            &runner,
            "2026-04-09T00:00:23.000Z",
        )
        .unwrap();

        assert_eq!(snapshot.state, "Exited");
        assert_eq!(snapshot.exit_code, Some(0));
        assert_eq!(
            snapshot
                .replay_entries
                .iter()
                .map(|entry| entry.kind.as_str())
                .collect::<Vec<_>>(),
            vec!["state", "output", "exit"]
        );
        assert_eq!(snapshot.replay_entries[1].payload, "/workspace");
        assert_eq!(snapshot.replay_entries[2].payload, "{\"exitCode\":0}");
        assert_eq!(runner.commands.borrow().len(), 2);
        assert_eq!(runner.commands.borrow()[0].program, "ssh");
        assert_eq!(runner.commands.borrow()[1].program, "ssh");
    }

    #[test]
    fn probe_connector_exec_from_request_records_warning_and_exit_after_exec_failure() {
        let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-remote".into(),
            target: "docker-exec".into(),
            authority: "docker://workspace-dev".into(),
            command: vec!["/bin/sh".into(), "-lc".into(), "pwd".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:docker-exec".into()],
        };
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "true".into(),
                stderr: String::new(),
            }),
            StubOutcome::Err(CommandRunnerError::Exit {
                status: 126,
                stderr: "permission denied".into(),
            }),
        ]);

        let snapshot = probe_connector_exec_from_request(
            &mut runtime,
            &request,
            &runner,
            "2026-04-09T00:00:24.000Z",
        )
        .unwrap();

        assert_eq!(snapshot.state, "Exited");
        assert_eq!(snapshot.exit_code, Some(126));
        assert_eq!(
            snapshot
                .replay_entries
                .iter()
                .map(|entry| entry.kind.as_str())
                .collect::<Vec<_>>(),
            vec!["state", "warning", "exit"]
        );
        assert!(snapshot.replay_entries[1]
            .payload
            .contains("connector_exec_failed"));
        assert_eq!(snapshot.replay_entries[2].payload, "{\"exitCode\":126}");
        assert_eq!(runner.commands.borrow().len(), 2);
        assert_eq!(runner.commands.borrow()[0].program, "docker");
        assert_eq!(runner.commands.borrow()[1].program, "docker");
    }

    #[test]
    fn desktop_runtime_state_exposes_session_index_after_launch_and_probe() {
        let state = DesktopRuntimeState::new(None);
        let launch_request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-demo".into(),
            target: "ssh".into(),
            authority: "ops@prod-bastion".into(),
            command: vec!["bash".into(), "-l".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
        };
        let probe_request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-demo".into(),
            target: "docker-exec".into(),
            authority: "docker://workspace-dev".into(),
            command: vec!["/bin/sh".into(), "-lc".into(), "pwd".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:docker-exec".into()],
        };
        let runner = StubRunner::with_outcomes(vec![
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "ssh handshake complete".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "docker connected".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "/workspace".into(),
                stderr: String::new(),
            }),
        ]);

        state
            .launch_connector_session(&launch_request, &runner, "2026-04-09T00:00:25.000Z")
            .unwrap();
        state
            .probe_connector_exec_session(&probe_request, &runner, "2026-04-09T00:00:26.000Z")
            .unwrap();

        let session_index = state.session_index().unwrap();

        assert_eq!(session_index.sessions.len(), 2);
        assert_eq!(session_index.attachments.len(), 0);
        assert_eq!(session_index.sessions[0].session_id, "session-0001");
        assert_eq!(session_index.sessions[0].state, "Running");
        assert_eq!(session_index.sessions[1].session_id, "session-0002");
        assert_eq!(session_index.sessions[1].state, "Exited");
    }

    #[test]
    fn desktop_runtime_state_exposes_session_replay_slice_after_exec_probe() {
        let state = DesktopRuntimeState::new(None);
        let probe_request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-demo".into(),
            target: "docker-exec".into(),
            authority: "docker://workspace-dev".into(),
            command: vec!["/bin/sh".into(), "-lc".into(), "pwd".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:docker-exec".into()],
        };
        let runner = StubRunner::with_outcomes(vec![
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "docker connected".into(),
                stderr: String::new(),
            }),
            StubOutcome::Ok(CommandOutput {
                status: 0,
                stdout: "/workspace".into(),
                stderr: String::new(),
            }),
        ]);

        let snapshot = state
            .probe_connector_exec_session(&probe_request, &runner, "2026-04-09T00:00:27.000Z")
            .unwrap();

        let replay = state
            .session_replay_slice(&snapshot.session_id, None, 8)
            .unwrap();

        assert_eq!(replay.session_id, snapshot.session_id);
        assert_eq!(replay.next_cursor, "3");
        assert!(!replay.has_more);
        assert_eq!(
            replay
                .entries
                .iter()
                .map(|entry| entry.kind.as_str())
                .collect::<Vec<_>>(),
            vec!["state", "output", "exit"]
        );
        assert_eq!(replay.entries[1].payload, "/workspace");
    }

    #[test]
    fn desktop_runtime_state_exposes_attach_detach_and_reattach_for_existing_session() {
        let state = DesktopRuntimeState::new(None);
        let session = {
            let mut runtime = state.session_runtime.lock().unwrap();
            runtime.create_session(SessionCreateRequest {
                workspace_id: "workspace-demo".into(),
                target: "ssh".into(),
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:ssh".into()],
                launch_intent: None,
            })
        };

        let attached = state
            .attach_session(DesktopSessionAttachRequest {
                session_id: session.session_id.clone(),
            })
            .unwrap();
        assert_eq!(attached.session.session_id, session.session_id);
        assert_eq!(attached.session.state, "Running");
        assert_eq!(attached.attachment.session_id, session.session_id);

        let detached = state
            .detach_session_attachment(DesktopSessionDetachRequest {
                attachment_id: attached.attachment.attachment_id.clone(),
            })
            .unwrap();
        assert_eq!(detached.session_id, session.session_id);
        assert_eq!(detached.state, "Detached");

        let reattached = state
            .reattach_session(DesktopSessionAttachRequest {
                session_id: session.session_id.clone(),
            })
            .unwrap();
        assert_eq!(reattached.session.session_id, session.session_id);
        assert_eq!(reattached.session.state, "Running");
        assert_eq!(reattached.attachment.session_id, session.session_id);
        assert_ne!(
            reattached.attachment.attachment_id,
            attached.attachment.attachment_id
        );
    }

    #[test]
    fn desktop_runtime_state_recovers_persisted_session_index_and_replay_from_sqlite() {
        let db_path = temp_db_path("session-runtime-recovery");

        {
            let state = DesktopRuntimeState::new_with_sqlite(None, &db_path).unwrap();
            let session = {
                let mut runtime = state.session_runtime.lock().unwrap();
                let session = runtime.create_session(SessionCreateRequest {
                    workspace_id: "workspace-recovery".into(),
                    target: "local-shell".into(),
                    mode_tags: vec!["cli-native".into()],
                    tags: vec!["profile:powershell".into()],
                    launch_intent: None,
                });
                runtime
                    .record_output(
                        &session.session_id,
                        "Windows PowerShell ready",
                        "2026-04-10T10:00:00.000Z",
                    )
                    .unwrap();
                session
            };

            let replay = state
                .session_replay_slice(&session.session_id, None, 8)
                .unwrap();
            assert_eq!(replay.entries.len(), 1);
            assert_eq!(replay.entries[0].payload, "Windows PowerShell ready");
        }

        let recovered = DesktopRuntimeState::new_with_sqlite(None, &db_path).unwrap();
        let session_index = recovered.session_index().unwrap();

        assert_eq!(session_index.sessions.len(), 1);
        assert_eq!(session_index.sessions[0].workspace_id, "workspace-recovery");
        assert_eq!(session_index.sessions[0].target, "local-shell");
        assert_eq!(session_index.sessions[0].mode_tags, vec!["cli-native"]);
        assert_eq!(session_index.sessions[0].tags, vec!["profile:powershell"]);
        assert_eq!(session_index.attachments.len(), 0);

        let replay = recovered
            .session_replay_slice(&session_index.sessions[0].session_id, None, 8)
            .unwrap();
        assert_eq!(replay.entries.len(), 1);
        assert_eq!(replay.entries[0].payload, "Windows PowerShell ready");

        let _ = fs::remove_file(&db_path);
    }

    #[test]
    fn run_local_shell_exec_maps_runtime_output_for_desktop_bridge() {
        let request = DesktopLocalShellExecRequest {
            profile: if cfg!(windows) {
                "powershell".into()
            } else {
                "shell".into()
            },
            command_text: "echo sdkwork-terminal".into(),
            working_directory: None,
        };

        let snapshot = run_local_shell_exec(request).unwrap();

        assert_eq!(snapshot.exit_code, 0);
        assert_eq!(snapshot.command_text, "echo sdkwork-terminal");
        assert!(snapshot.stdout.contains("sdkwork-terminal"));
        assert!(!snapshot.invoked_program.is_empty());
    }
}
