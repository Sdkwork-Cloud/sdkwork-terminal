use crate::connector_session::{
    launch_connector_session_from_request, probe_connector_exec_from_request,
    ConnectorSessionLaunchError, DesktopInteractiveConnectorSpawner,
};
use crate::mapper::{
    build_exit_payload, build_local_shell_runtime_event_name,
    build_local_shell_stream_event_snapshot, current_occurred_at, derive_local_process_target,
    map_attachment_descriptor_snapshot, map_connector_interactive_session_create_snapshot,
    map_connector_launch_snapshot, map_desktop_connector_interactive_request,
    map_session_descriptor_snapshot, normalize_metadata_value, session_state_label,
};
use crate::snapshots::{
    DesktopAttachmentDescriptorSnapshot, DesktopConnectorExecSnapshot,
    DesktopConnectorInteractiveSessionCreateRequest,
    DesktopConnectorInteractiveSessionCreateSnapshot, DesktopConnectorLaunchSnapshot,
    DesktopLocalProcessSessionCreateRequest, DesktopLocalProcessSessionCreateSnapshot,
    DesktopLocalShellSessionCreateRequest, DesktopLocalShellSessionCreateSnapshot,
    DesktopLocalShellSessionInputBytesRequest, DesktopLocalShellSessionInputRequest,
    DesktopLocalShellSessionInputSnapshot, DesktopLocalShellSessionResizeRequest,
    DesktopLocalShellSessionResizeSnapshot, DesktopLocalShellSessionTerminateSnapshot,
    DesktopReplayEntrySnapshot, DesktopSessionAttachRequest,
    DesktopSessionAttachmentAcknowledgeRequest, DesktopSessionAttachmentSnapshot,
    DesktopSessionDetachRequest, DesktopSessionDescriptorSnapshot, DesktopSessionIndexSnapshot,
    DesktopSessionReplaySnapshot,
};
use sdkwork_terminal_control_plane::{
    create_desktop_session_runtime, create_interactive_connector_session,
    DESKTOP_SESSION_RUNTIME_DB_FILE_NAME,
};
use sdkwork_terminal_pty_runtime::{
    create_session_event_channel, LocalShellSessionCreateRequest, LocalShellSessionEvent,
    LocalShellSessionRuntime, PtyProcessLaunchCommand, PtyProcessSessionCreateRequest,
};
use sdkwork_terminal_replay_store::ReplayEventKind;
use sdkwork_terminal_resource_connectors::CommandRunner;
use sdkwork_terminal_session_runtime::{
    LocalSessionDaemon, SessionCreateRequest, SessionRuntime, SessionState,
};
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use tauri::{Emitter, Manager};

pub struct DesktopRuntimeState {
    pub(crate) daemon: Mutex<LocalSessionDaemon>,
    pub(crate) session_runtime: Arc<Mutex<SessionRuntime>>,
    pub(crate) local_shell_runtime: LocalShellSessionRuntime,
    pub(crate) local_shell_event_sender: mpsc::SyncSender<LocalShellSessionEvent>,
}

impl Drop for DesktopRuntimeState {
    fn drop(&mut self) {
        let _ = self.local_shell_event_sender.send(LocalShellSessionEvent::Exit {
            session_id: "__shutdown__".to_string(),
            exit_code: None,
        });
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
    pub(crate) fn new(app_handle: Option<tauri::AppHandle>) -> Self {
        Self::try_new(app_handle.clone()).unwrap_or_else(|error| {
            eprintln!(
                "sdkwork-terminal: failed to initialize sqlite-backed session runtime, falling back to in-memory runtime: {error}"
            );
            Self::build(app_handle, SessionRuntime::new())
        })
    }

    #[cfg_attr(not(test), allow(dead_code))]
    pub(crate) fn new_with_sqlite(
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
        let (local_shell_event_sender, local_shell_event_receiver) = create_session_event_channel();
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

    pub(crate) fn launch_connector_session(
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

    pub(crate) fn create_connector_interactive_session(
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

    pub(crate) fn probe_connector_exec_session(
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

    pub(crate) fn session_index(&self) -> Result<DesktopSessionIndexSnapshot, String> {
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

    pub(crate) fn session_replay_slice(
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

    pub(crate) fn attach_session(
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

    pub(crate) fn detach_session_attachment(
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

    pub(crate) fn reattach_session(
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

    pub(crate) fn create_local_shell_session(
        &self,
        request: DesktopLocalShellSessionCreateRequest,
    ) -> Result<DesktopLocalShellSessionCreateSnapshot, String> {
        let DesktopLocalShellSessionCreateRequest {
            profile,
            working_directory,
            cols,
            rows,
            title: _title,
            profile_id,
            workspace_id,
            project_id,
        } = request;
        let occurred_at = current_occurred_at();
        let mode_tags = vec!["cli-native".to_string()];
        let resolved_profile_tag = normalize_metadata_value(profile_id.as_deref())
            .unwrap_or_else(|| profile.trim().to_lowercase());
        let resolved_workspace_id = normalize_metadata_value(workspace_id.as_deref())
            .unwrap_or_else(|| "workspace-local".to_string());
        let mut tags = vec![format!("profile:{resolved_profile_tag}")];
        if let Some(project_tag) = normalize_metadata_value(project_id.as_deref()) {
            tags.push(format!("project:{project_tag}"));
        }
        let (session, attachment) = {
            let mut runtime = self
                .session_runtime
                .lock()
                .map_err(|_| "session runtime mutex poisoned".to_string())?;
            let session = runtime.create_session(SessionCreateRequest {
                workspace_id: resolved_workspace_id,
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
                profile,
                working_directory,
                cols: cols.unwrap_or(120),
                rows: rows.unwrap_or(32),
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

    pub(crate) fn create_local_process_session(
        &self,
        request: DesktopLocalProcessSessionCreateRequest,
    ) -> Result<DesktopLocalProcessSessionCreateSnapshot, String> {
        let DesktopLocalProcessSessionCreateRequest {
            command,
            working_directory,
            cols,
            rows,
            title: _title,
            profile_id,
            workspace_id,
            project_id,
        } = request;
        let program = command
            .first()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "local process command must include a program".to_string())?;
        let occurred_at = current_occurred_at();
        let program_target = derive_local_process_target(program);
        let target = normalize_metadata_value(profile_id.as_deref())
            .unwrap_or_else(|| program_target.clone());
        let resolved_workspace_id = normalize_metadata_value(workspace_id.as_deref())
            .unwrap_or_else(|| "workspace-local".to_string());
        let mode_tags = vec!["cli-native".to_string()];
        let mut tags = vec![
            "launcher:local-process".to_string(),
            format!("program:{program_target}"),
        ];
        if let Some(profile_tag) = normalize_metadata_value(profile_id.as_deref()) {
            tags.push(format!("profile:{profile_tag}"));
        }
        if let Some(project_tag) = normalize_metadata_value(project_id.as_deref()) {
            tags.push(format!("project:{project_tag}"));
        }
        let (session, attachment) = {
            let mut runtime = self
                .session_runtime
                .lock()
                .map_err(|_| "session runtime mutex poisoned".to_string())?;
            let session = runtime.create_session(SessionCreateRequest {
                workspace_id: resolved_workspace_id,
                target: target.clone(),
                mode_tags: mode_tags.clone(),
                tags: tags.clone(),
                launch_intent: None,
            });
            let attachment = runtime
                .attach(&session.session_id)
                .map_err(|error| error.to_string())?;
            (session, attachment)
        };

        let bootstrap = match self.local_shell_runtime.create_process_session(
            PtyProcessSessionCreateRequest {
                session_id: session.session_id.clone(),
                command: PtyProcessLaunchCommand {
                    program: program.to_string(),
                    args: command.into_iter().skip(1).collect(),
                },
                working_directory,
                cols: cols.unwrap_or(120),
                rows: rows.unwrap_or(32),
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

        Ok(DesktopLocalProcessSessionCreateSnapshot {
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
            working_directory: bootstrap.working_directory,
            invoked_program: bootstrap.invoked_program,
            invoked_args: bootstrap.invoked_args,
        })
    }

    pub(crate) fn write_local_shell_input(
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

    pub(crate) fn write_local_shell_input_bytes(
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

    pub(crate) fn acknowledge_session_attachment(
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

    pub(crate) fn resize_local_shell_session(
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

    pub(crate) fn terminate_local_shell_session(
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
