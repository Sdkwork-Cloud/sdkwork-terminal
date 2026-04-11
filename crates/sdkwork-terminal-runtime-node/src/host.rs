use crate::{
    create_runtime_node_session_runtime, RuntimeNodeBootstrapConfig, RuntimeNodeRecoveryDiagnostics,
};
use sdkwork_terminal_pty_runtime::{
    LocalShellExecutionError, LocalShellSessionEvent, LocalShellSessionRuntime,
    PtyProcessLaunchCommand, PtyProcessSessionCreateRequest,
};
use sdkwork_terminal_replay_store::{ReplayEntry, ReplayEventKind, ReplaySlice};
use sdkwork_terminal_session_runtime::{
    AttachmentRecord, SessionCreateRequest, SessionRecord, SessionRuntime, SessionRuntimeError,
    SessionState,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    error::Error,
    fmt,
    path::Path,
    sync::{
        mpsc::{self, Receiver, Sender},
        Arc, Mutex,
    },
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteRuntimeSessionCreateRequest {
    pub workspace_id: String,
    pub target: String,
    pub authority: String,
    pub command: Vec<String>,
    pub working_directory: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeReplayEntrySnapshot {
    pub sequence: u64,
    pub kind: String,
    pub payload: String,
    pub occurred_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionDescriptor {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub last_ack_sequence: u64,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionAttachmentDescriptor {
    pub attachment_id: String,
    pub session_id: String,
    pub cursor: String,
    pub last_ack_sequence: u64,
    pub writable: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeInteractiveSessionCreateSnapshot {
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
    pub replay_entry: RuntimeNodeReplayEntrySnapshot,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionIndexSnapshot {
    pub sessions: Vec<RuntimeNodeSessionDescriptor>,
    pub attachments: Vec<RuntimeNodeSessionAttachmentDescriptor>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionReplaySnapshot {
    pub session_id: String,
    pub from_cursor: Option<String>,
    pub next_cursor: String,
    pub has_more: bool,
    pub entries: Vec<RuntimeNodeReplayEntrySnapshot>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionInputSnapshot {
    pub session_id: String,
    pub accepted_bytes: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionResizeSnapshot {
    pub session_id: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeNodeSessionTerminateSnapshot {
    pub session_id: String,
    pub state: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum RuntimeNodeStreamEvent {
    Output {
        session_id: String,
        next_cursor: String,
        entry: RuntimeNodeReplayEntrySnapshot,
    },
    Warning {
        session_id: String,
        next_cursor: String,
        entry: RuntimeNodeReplayEntrySnapshot,
    },
    Exit {
        session_id: String,
        next_cursor: String,
        entry: RuntimeNodeReplayEntrySnapshot,
    },
}

#[derive(Debug)]
pub enum RuntimeNodeHostError {
    Bootstrap(String),
    InvalidRequest(String),
    Runtime(SessionRuntimeError),
    Pty(LocalShellExecutionError),
    Serde(serde_json::Error),
    Poisoned(&'static str),
}

impl fmt::Display for RuntimeNodeHostError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Bootstrap(message) => {
                write!(formatter, "runtime node bootstrap error: {message}")
            }
            Self::InvalidRequest(message) => {
                write!(formatter, "runtime node invalid request: {message}")
            }
            Self::Runtime(error) => write!(formatter, "runtime node runtime error: {error}"),
            Self::Pty(error) => write!(formatter, "runtime node pty error: {error}"),
            Self::Serde(error) => write!(formatter, "runtime node serde error: {error}"),
            Self::Poisoned(name) => write!(formatter, "runtime node {name} mutex poisoned"),
        }
    }
}

impl Error for RuntimeNodeHostError {}

impl From<SessionRuntimeError> for RuntimeNodeHostError {
    fn from(value: SessionRuntimeError) -> Self {
        Self::Runtime(value)
    }
}

impl From<LocalShellExecutionError> for RuntimeNodeHostError {
    fn from(value: LocalShellExecutionError) -> Self {
        Self::Pty(value)
    }
}

impl From<serde_json::Error> for RuntimeNodeHostError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serde(value)
    }
}

pub struct RuntimeNodeHost {
    diagnostics: RuntimeNodeRecoveryDiagnostics,
    runtime: Arc<Mutex<SessionRuntime>>,
    pty_runtime: LocalShellSessionRuntime,
    event_sender: Sender<LocalShellSessionEvent>,
    subscribers: Arc<Mutex<HashMap<String, Vec<Sender<RuntimeNodeStreamEvent>>>>>,
}

impl RuntimeNodeHost {
    pub fn new_default() -> Result<Self, RuntimeNodeHostError> {
        Self::new(RuntimeNodeBootstrapConfig::default(), None::<&Path>)
    }

    pub fn new_with_sqlite_path(path: impl AsRef<Path>) -> Result<Self, RuntimeNodeHostError> {
        Self::new(RuntimeNodeBootstrapConfig::default(), Some(path.as_ref()))
    }

    pub fn new(
        config: RuntimeNodeBootstrapConfig,
        sqlite_path: Option<&Path>,
    ) -> Result<Self, RuntimeNodeHostError> {
        let bootstrap = create_runtime_node_session_runtime(&config, sqlite_path)
            .map_err(RuntimeNodeHostError::Bootstrap)?;
        let runtime = Arc::new(Mutex::new(bootstrap.session_runtime));
        let subscribers = Arc::new(Mutex::new(HashMap::new()));
        let (event_sender, event_receiver) = mpsc::channel();

        spawn_runtime_node_event_loop(
            Arc::clone(&runtime),
            Arc::clone(&subscribers),
            event_receiver,
        );

        let pty_runtime = if cfg!(windows) {
            LocalShellSessionRuntime::with_synthetic_probe_responses()
        } else {
            LocalShellSessionRuntime::default()
        };

        Ok(Self {
            diagnostics: bootstrap.diagnostics,
            runtime,
            pty_runtime,
            event_sender,
            subscribers,
        })
    }

    pub fn diagnostics(&self) -> RuntimeNodeRecoveryDiagnostics {
        self.diagnostics.clone()
    }

    pub fn session_index(&self) -> Result<RuntimeNodeSessionIndexSnapshot, RuntimeNodeHostError> {
        self.with_runtime(|runtime| {
            Ok(RuntimeNodeSessionIndexSnapshot {
                sessions: runtime
                    .list_sessions()
                    .into_iter()
                    .map(map_session_record)
                    .collect(),
                attachments: runtime
                    .list_attachments()
                    .into_iter()
                    .map(map_attachment_record)
                    .collect(),
            })
        })
    }

    pub fn create_remote_runtime_session(
        &self,
        request: RemoteRuntimeSessionCreateRequest,
    ) -> Result<RuntimeNodeInteractiveSessionCreateSnapshot, RuntimeNodeHostError> {
        validate_remote_runtime_request(&request)?;
        let command = split_runtime_command(&request.command)?;
        let occurred_at = current_timestamp();

        let (session, attachment) = self.with_runtime(|runtime| {
            let session = runtime.create_session(SessionCreateRequest {
                workspace_id: request.workspace_id.clone(),
                target: request.target.clone(),
                mode_tags: request.mode_tags.clone(),
                tags: request.tags.clone(),
                launch_intent: None,
            });
            let attachment = runtime.attach(&session.session_id)?;
            Ok((session, attachment))
        })?;

        let spawn_request = PtyProcessSessionCreateRequest {
            session_id: session.session_id.clone(),
            command: PtyProcessLaunchCommand {
                program: command.0.clone(),
                args: command.1.clone(),
            },
            working_directory: request.working_directory.clone(),
            cols: request.cols.unwrap_or(120).max(1),
            rows: request.rows.unwrap_or(32).max(1),
        };

        let bootstrap = match self
            .pty_runtime
            .create_process_session(spawn_request, self.event_sender.clone())
        {
            Ok(bootstrap) => bootstrap,
            Err(error) => {
                let failure_at = current_timestamp();
                let message = error.to_string();
                let _ = self.with_runtime(|runtime| {
                    let _ = runtime.record_replay_event(
                        &session.session_id,
                        ReplayEventKind::Warning,
                        &message,
                        &failure_at,
                    )?;
                    let _ = runtime.fail(&session.session_id, &failure_at)?;
                    Ok(())
                });
                return Err(RuntimeNodeHostError::Pty(error));
            }
        };

        let state_payload = serde_json::to_string(&serde_json::json!({
            "state": "running",
            "authority": request.authority.clone(),
            "invokedProgram": bootstrap.invoked_program.clone(),
            "invokedArgs": bootstrap.invoked_args.clone(),
            "workingDirectory": bootstrap.working_directory.clone(),
        }))?;
        let replay_entry = self.with_runtime(|runtime| {
            Ok(runtime.record_replay_event(
                &session.session_id,
                ReplayEventKind::State,
                &state_payload,
                &occurred_at,
            )?)
        })?;

        Ok(RuntimeNodeInteractiveSessionCreateSnapshot {
            session_id: session.session_id,
            workspace_id: session.workspace_id,
            target: session.target,
            state: session_state_to_string(&SessionState::Running),
            created_at: session.created_at,
            last_active_at: occurred_at,
            mode_tags: session.mode_tags,
            tags: session.tags,
            attachment_id: attachment.attachment_id,
            cursor: attachment.cursor,
            last_ack_sequence: attachment.last_ack_sequence,
            writable: attachment.writable,
            authority: request.authority,
            invoked_program: bootstrap.invoked_program,
            invoked_args: bootstrap.invoked_args,
            working_directory: bootstrap.working_directory,
            replay_entry: map_replay_entry(&replay_entry),
        })
    }

    pub fn session_replay(
        &self,
        session_id: &str,
        from_cursor: Option<&str>,
        limit: usize,
    ) -> Result<RuntimeNodeSessionReplaySnapshot, RuntimeNodeHostError> {
        self.with_runtime(|runtime| {
            let replay = runtime.replay(session_id, from_cursor, limit)?;
            Ok(map_replay_slice(replay))
        })
    }

    pub fn write_session_input(
        &self,
        session_id: &str,
        input: &str,
    ) -> Result<RuntimeNodeSessionInputSnapshot, RuntimeNodeHostError> {
        let accepted_bytes = self.pty_runtime.write_input(session_id, input)?;
        Ok(RuntimeNodeSessionInputSnapshot {
            session_id: session_id.to_string(),
            accepted_bytes,
        })
    }

    pub fn write_session_input_bytes(
        &self,
        session_id: &str,
        input_bytes: &[u8],
    ) -> Result<RuntimeNodeSessionInputSnapshot, RuntimeNodeHostError> {
        let accepted_bytes = self
            .pty_runtime
            .write_input_bytes(session_id, input_bytes)?;
        Ok(RuntimeNodeSessionInputSnapshot {
            session_id: session_id.to_string(),
            accepted_bytes,
        })
    }

    pub fn resize_session(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<RuntimeNodeSessionResizeSnapshot, RuntimeNodeHostError> {
        let safe_cols = cols.max(1);
        let safe_rows = rows.max(1);
        self.pty_runtime
            .resize_session(session_id, safe_cols, safe_rows)?;
        Ok(RuntimeNodeSessionResizeSnapshot {
            session_id: session_id.to_string(),
            cols: safe_cols,
            rows: safe_rows,
        })
    }

    pub fn terminate_session(
        &self,
        session_id: &str,
    ) -> Result<RuntimeNodeSessionTerminateSnapshot, RuntimeNodeHostError> {
        self.pty_runtime.terminate_session(session_id)?;
        let occurred_at = current_timestamp();
        let session =
            self.with_runtime(|runtime| Ok(runtime.mark_stopping(session_id, &occurred_at)?))?;
        Ok(RuntimeNodeSessionTerminateSnapshot {
            session_id: session.session_id,
            state: session_state_to_string(&session.state),
        })
    }

    pub fn subscribe_session_events(
        &self,
        session_id: &str,
    ) -> Result<Receiver<RuntimeNodeStreamEvent>, RuntimeNodeHostError> {
        let exists = self.with_runtime(|runtime| {
            Ok(runtime
                .list_sessions()
                .iter()
                .any(|session| session.session_id == session_id))
        })?;
        if !exists {
            return Err(RuntimeNodeHostError::Runtime(
                SessionRuntimeError::SessionNotFound(session_id.to_string()),
            ));
        }

        let (sender, receiver) = mpsc::channel();
        let mut subscribers = self
            .subscribers
            .lock()
            .map_err(|_| RuntimeNodeHostError::Poisoned("subscribers"))?;
        subscribers
            .entry(session_id.to_string())
            .or_default()
            .push(sender);

        Ok(receiver)
    }

    fn with_runtime<T, F>(&self, operation: F) -> Result<T, RuntimeNodeHostError>
    where
        F: FnOnce(&mut SessionRuntime) -> Result<T, RuntimeNodeHostError>,
    {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| RuntimeNodeHostError::Poisoned("session-runtime"))?;
        operation(&mut runtime)
    }
}

fn spawn_runtime_node_event_loop(
    runtime: Arc<Mutex<SessionRuntime>>,
    subscribers: Arc<Mutex<HashMap<String, Vec<Sender<RuntimeNodeStreamEvent>>>>>,
    receiver: Receiver<LocalShellSessionEvent>,
) {
    thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            let maybe_stream_event = match event {
                LocalShellSessionEvent::Output {
                    session_id,
                    payload,
                } => handle_runtime_output_event(&runtime, &session_id, &payload),
                LocalShellSessionEvent::Warning {
                    session_id,
                    message,
                } => handle_runtime_warning_event(&runtime, &session_id, &message),
                LocalShellSessionEvent::Exit {
                    session_id,
                    exit_code,
                } => handle_runtime_exit_event(&runtime, &session_id, exit_code),
            };

            if let Some(stream_event) = maybe_stream_event {
                dispatch_runtime_stream_event(&subscribers, stream_event);
            }
        }
    });
}

fn handle_runtime_output_event(
    runtime: &Arc<Mutex<SessionRuntime>>,
    session_id: &str,
    payload: &str,
) -> Option<RuntimeNodeStreamEvent> {
    let occurred_at = current_timestamp();
    let entry = {
        let mut runtime = runtime.lock().ok()?;
        let state = runtime
            .list_sessions()
            .into_iter()
            .find(|session| session.session_id == session_id)
            .map(|session| session.state)?;

        let result = if matches!(
            state,
            SessionState::Stopping | SessionState::Exited | SessionState::Failed
        ) {
            runtime.record_replay_event(session_id, ReplayEventKind::Output, payload, &occurred_at)
        } else {
            runtime.record_output(session_id, payload, &occurred_at)
        };

        result.ok()?
    };

    Some(RuntimeNodeStreamEvent::Output {
        session_id: session_id.to_string(),
        next_cursor: entry.cursor.clone(),
        entry: map_replay_entry(&entry),
    })
}

fn handle_runtime_warning_event(
    runtime: &Arc<Mutex<SessionRuntime>>,
    session_id: &str,
    message: &str,
) -> Option<RuntimeNodeStreamEvent> {
    let occurred_at = current_timestamp();
    let entry = {
        let mut runtime = runtime.lock().ok()?;
        runtime
            .record_replay_event(session_id, ReplayEventKind::Warning, message, &occurred_at)
            .ok()?
    };

    Some(RuntimeNodeStreamEvent::Warning {
        session_id: session_id.to_string(),
        next_cursor: entry.cursor.clone(),
        entry: map_replay_entry(&entry),
    })
}

fn handle_runtime_exit_event(
    runtime: &Arc<Mutex<SessionRuntime>>,
    session_id: &str,
    exit_code: Option<i32>,
) -> Option<RuntimeNodeStreamEvent> {
    let occurred_at = current_timestamp();
    let payload = serde_json::to_string(&serde_json::json!({
        "exitCode": exit_code,
    }))
    .ok()?;
    let entry = {
        let mut runtime = runtime.lock().ok()?;
        let entry = runtime
            .record_replay_event(session_id, ReplayEventKind::Exit, &payload, &occurred_at)
            .ok()?;
        let _ = runtime.terminate(session_id, exit_code);
        entry
    };

    Some(RuntimeNodeStreamEvent::Exit {
        session_id: session_id.to_string(),
        next_cursor: entry.cursor.clone(),
        entry: map_replay_entry(&entry),
    })
}

fn dispatch_runtime_stream_event(
    subscribers: &Arc<Mutex<HashMap<String, Vec<Sender<RuntimeNodeStreamEvent>>>>>,
    event: RuntimeNodeStreamEvent,
) {
    let session_id = match &event {
        RuntimeNodeStreamEvent::Output { session_id, .. }
        | RuntimeNodeStreamEvent::Warning { session_id, .. }
        | RuntimeNodeStreamEvent::Exit { session_id, .. } => session_id.clone(),
    };
    let clear_after_dispatch = matches!(&event, RuntimeNodeStreamEvent::Exit { .. });

    let mut subscribers = match subscribers.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };

    {
        let Some(listeners) = subscribers.get_mut(&session_id) else {
            return;
        };

        listeners.retain(|listener| listener.send(event.clone()).is_ok());
    }

    if clear_after_dispatch {
        subscribers.remove(&session_id);
    }
}

fn validate_remote_runtime_request(
    request: &RemoteRuntimeSessionCreateRequest,
) -> Result<(), RuntimeNodeHostError> {
    if request.workspace_id.trim().is_empty() {
        return Err(RuntimeNodeHostError::InvalidRequest(
            "workspace_id cannot be empty".into(),
        ));
    }

    if !matches!(
        request.target.as_str(),
        "remote-runtime" | "server-runtime-node"
    ) {
        return Err(RuntimeNodeHostError::InvalidRequest(format!(
            "unsupported runtime target: {}",
            request.target
        )));
    }

    if request.authority.trim().is_empty() {
        return Err(RuntimeNodeHostError::InvalidRequest(
            "authority cannot be empty".into(),
        ));
    }

    if request.command.is_empty() {
        return Err(RuntimeNodeHostError::InvalidRequest(
            "command cannot be empty".into(),
        ));
    }

    Ok(())
}

fn split_runtime_command(
    command: &[String],
) -> Result<(String, Vec<String>), RuntimeNodeHostError> {
    let program = command
        .first()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            RuntimeNodeHostError::InvalidRequest("command program cannot be empty".into())
        })?
        .to_string();

    Ok((program, command.iter().skip(1).cloned().collect()))
}

fn map_session_record(record: SessionRecord) -> RuntimeNodeSessionDescriptor {
    RuntimeNodeSessionDescriptor {
        session_id: record.session_id,
        workspace_id: record.workspace_id,
        target: record.target,
        state: session_state_to_string(&record.state),
        created_at: record.created_at,
        last_active_at: record.last_active_at,
        mode_tags: record.mode_tags,
        tags: record.tags,
        last_ack_sequence: record.last_ack_sequence,
        exit_code: record.exit_code,
    }
}

fn map_attachment_record(record: AttachmentRecord) -> RuntimeNodeSessionAttachmentDescriptor {
    RuntimeNodeSessionAttachmentDescriptor {
        attachment_id: record.attachment_id,
        session_id: record.session_id,
        cursor: record.cursor,
        last_ack_sequence: record.last_ack_sequence,
        writable: record.writable,
    }
}

fn map_replay_entry(entry: &ReplayEntry) -> RuntimeNodeReplayEntrySnapshot {
    RuntimeNodeReplayEntrySnapshot {
        sequence: entry.sequence,
        kind: entry.kind.as_str().to_string(),
        payload: entry.payload.clone(),
        occurred_at: entry.occurred_at.clone(),
    }
}

fn map_replay_slice(slice: ReplaySlice) -> RuntimeNodeSessionReplaySnapshot {
    RuntimeNodeSessionReplaySnapshot {
        session_id: slice.session_id,
        from_cursor: slice.from_cursor,
        next_cursor: slice.next_cursor,
        has_more: slice.has_more,
        entries: slice.entries.iter().map(map_replay_entry).collect(),
    }
}

fn session_state_to_string(state: &SessionState) -> String {
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
    .to_string()
}

fn current_timestamp() -> String {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();

    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let mut year = 1970i32;
    let mut remaining_days = days as i32;
    loop {
        let year_days = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days < year_days {
            break;
        }
        remaining_days -= year_days;
        year += 1;
    }

    let month_days = if is_leap_year(year) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1u32;
    let mut day = 1u32;
    for (index, &days_in_month) in month_days.iter().enumerate() {
        if remaining_days < days_in_month as i32 {
            month = index as u32 + 1;
            day = remaining_days as u32 + 1;
            break;
        }
        remaining_days -= days_in_month as i32;
    }

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hours, minutes, seconds, millis
    )
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}
