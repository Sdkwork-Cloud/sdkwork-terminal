use rusqlite::{params, Connection};
use sdkwork_terminal_observability::readiness_summary as observability_readiness_summary;
use sdkwork_terminal_protocol::crate_id as protocol_crate_id;
use sdkwork_terminal_replay_store::{ReplayEntry, ReplayEventKind, ReplaySlice, ReplayStore};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    error::Error,
    fmt,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

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

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum LocalDaemonPhase {
    Stopped,
    Starting,
    Running,
    Reconnecting,
    Failed,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonHealthSnapshot {
    pub phase: LocalDaemonPhase,
    pub healthy: bool,
    pub start_count: u32,
    pub reconnect_count: u32,
    pub stop_count: u32,
    pub last_error: Option<String>,
    pub runtime_summary: String,
    pub observability_summary: String,
}

#[derive(Debug, Default)]
pub struct LocalSessionDaemon {
    start_count: u32,
    reconnect_count: u32,
    stop_count: u32,
    last_error: Option<String>,
    phase: Option<LocalDaemonPhase>,
}

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
    fn as_str(&self) -> &'static str {
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

    fn from_str(value: &str) -> Option<Self> {
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
    fn session_state(&self) -> SessionState {
        match self {
            Self::Running { .. } => SessionState::Running,
            Self::Failed { .. } => SessionState::Failed,
        }
    }

    fn replay_kind(&self) -> ReplayEventKind {
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

#[derive(Debug)]
pub enum SessionRuntimeError {
    SessionNotFound(String),
    AttachmentNotFound(String),
    InvalidSessionState(String),
    Sqlite(rusqlite::Error),
    Serde(serde_json::Error),
}

impl fmt::Display for SessionRuntimeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SessionNotFound(session_id) => {
                write!(formatter, "session not found: {session_id}")
            }
            Self::AttachmentNotFound(attachment_id) => {
                write!(formatter, "attachment not found: {attachment_id}")
            }
            Self::InvalidSessionState(message) => formatter.write_str(message),
            Self::Sqlite(cause) => write!(formatter, "sqlite error: {cause}"),
            Self::Serde(cause) => write!(formatter, "serde error: {cause}"),
        }
    }
}

impl Error for SessionRuntimeError {}

impl From<rusqlite::Error> for SessionRuntimeError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Sqlite(value)
    }
}

impl From<serde_json::Error> for SessionRuntimeError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serde(value)
    }
}

type SessionRuntimeResult<T> = Result<T, SessionRuntimeError>;

#[derive(Debug)]
pub struct SessionRuntime {
    session_counter: u64,
    attachment_counter: u64,
    sessions: HashMap<String, SessionRecord>,
    attachments: HashMap<String, AttachmentRecord>,
    replay_stores: HashMap<String, ReplayStore>,
    sqlite_connection: Option<Connection>,
}

impl SessionRuntime {
    pub fn new() -> Self {
        Self {
            session_counter: 0,
            attachment_counter: 0,
            sessions: HashMap::new(),
            attachments: HashMap::new(),
            replay_stores: HashMap::new(),
            sqlite_connection: None,
        }
    }

    pub fn with_sqlite(path: impl AsRef<Path>) -> SessionRuntimeResult<Self> {
        let sqlite_path = path.as_ref().to_path_buf();
        let connection = initialize_sqlite(&sqlite_path)?;
        let mut runtime = Self {
            session_counter: 0,
            attachment_counter: 0,
            sessions: HashMap::new(),
            attachments: HashMap::new(),
            replay_stores: HashMap::new(),
            sqlite_connection: Some(connection),
        };

        runtime.load_sessions_from_sqlite()?;
        runtime.load_replay_from_sqlite()?;
        runtime.session_counter = runtime
            .sessions
            .keys()
            .map(|session_id| parse_id_counter(session_id))
            .max()
            .unwrap_or(0);

        Ok(runtime)
    }

    pub fn create_session(&mut self, request: SessionCreateRequest) -> SessionRecord {
        self.session_counter += 1;
        let session_id = format!("session-{:04}", self.session_counter);
        let created_at = current_timestamp();
        let launch_intent = request.launch_intent;
        let session = SessionRecord {
            session_id: session_id.clone(),
            workspace_id: request.workspace_id,
            target: request.target,
            state: if launch_intent.is_some() {
                SessionState::Starting
            } else {
                SessionState::Running
            },
            created_at: created_at.clone(),
            last_active_at: created_at,
            mode_tags: request.mode_tags,
            tags: request.tags,
            launch_intent,
            last_ack_sequence: 0,
            exit_code: None,
        };

        self.sessions.insert(session_id.clone(), session.clone());
        self.replay_stores
            .insert(session_id, ReplayStore::new(session.session_id.clone()));
        let _ = self.persist_session(&session);

        session
    }

    pub fn attach(&mut self, session_id: &str) -> SessionRuntimeResult<AttachmentRecord> {
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            if matches!(session.state, SessionState::Exited | SessionState::Failed) {
                return Err(SessionRuntimeError::InvalidSessionState(format!(
                    "session {session_id} cannot be attached in state {}",
                    session.state.as_str()
                )));
            }

            if !matches!(session.state, SessionState::Starting) {
                session.state = SessionState::Running;
            }
            session.last_active_at = current_timestamp();
            session.clone()
        };
        self.persist_session(&session_snapshot)?;

        self.attachment_counter += 1;
        let attachment = AttachmentRecord {
            attachment_id: format!("attachment-{:04}", self.attachment_counter),
            session_id: session_id.to_string(),
            cursor: self
                .replay_stores
                .get(session_id)
                .map(ReplayStore::latest_cursor)
                .unwrap_or_else(|| "0".to_string()),
            last_ack_sequence: session_snapshot.last_ack_sequence,
            writable: true,
        };

        self.attachments
            .insert(attachment.attachment_id.clone(), attachment.clone());

        Ok(attachment)
    }

    pub fn detach(&mut self, attachment_id: &str) -> SessionRuntimeResult<SessionRecord> {
        let attachment = self
            .attachments
            .remove(attachment_id)
            .ok_or_else(|| SessionRuntimeError::AttachmentNotFound(attachment_id.to_string()))?;
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(&attachment.session_id)
                .ok_or_else(|| {
                    SessionRuntimeError::SessionNotFound(attachment.session_id.clone())
                })?;

            if !matches!(session.state, SessionState::Exited | SessionState::Failed) {
                if !matches!(session.state, SessionState::Starting) {
                    session.state = SessionState::Detached;
                }
                session.last_active_at = current_timestamp();
            }

            session.clone()
        };

        self.persist_session(&session_snapshot)?;

        Ok(session_snapshot)
    }

    pub fn reattach(&mut self, session_id: &str) -> SessionRuntimeResult<ReattachResult> {
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            if matches!(session.state, SessionState::Exited | SessionState::Failed) {
                return Err(SessionRuntimeError::InvalidSessionState(format!(
                    "session {session_id} cannot be reattached in state {}",
                    session.state.as_str()
                )));
            }

            if !matches!(session.state, SessionState::Starting) {
                session.state = SessionState::Running;
            }
            session.last_active_at = current_timestamp();
            session.clone()
        };
        self.persist_session(&session_snapshot)?;

        let attachment = self.attach(session_id)?;

        Ok(ReattachResult {
            session: session_snapshot,
            attachment,
        })
    }

    pub fn record_output(
        &mut self,
        session_id: &str,
        payload: &str,
        occurred_at: &str,
    ) -> SessionRuntimeResult<ReplayEntry> {
        let entry = {
            let store = self
                .replay_stores
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;
            store.append(ReplayEventKind::Output, payload, occurred_at)
        };
        let has_active_attachment = self.has_active_attachment(session_id);
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            if !matches!(session.state, SessionState::Starting) {
                session.state = if has_active_attachment {
                    SessionState::Running
                } else {
                    SessionState::Detached
                };
            }
            session.last_active_at = occurred_at.to_string();
            session.clone()
        };
        self.persist_session(&session_snapshot)?;
        self.persist_replay_entry(&entry)?;

        Ok(entry)
    }

    pub fn record_replay_event(
        &mut self,
        session_id: &str,
        kind: ReplayEventKind,
        payload: &str,
        occurred_at: &str,
    ) -> SessionRuntimeResult<ReplayEntry> {
        let entry = {
            let store = self
                .replay_stores
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;
            store.append(kind, payload, occurred_at)
        };
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;
            session.last_active_at = occurred_at.to_string();
            session.clone()
        };
        self.persist_session(&session_snapshot)?;
        self.persist_replay_entry(&entry)?;

        Ok(entry)
    }

    pub fn resolve_connector_launch(
        &mut self,
        session_id: &str,
        resolution: ConnectorLaunchResolution,
        occurred_at: &str,
    ) -> SessionRuntimeResult<ConnectorLaunchResolutionResult> {
        let replay_payload = serde_json::to_string(&resolution)?;
        let next_state = resolution.session_state();
        let replay_kind = resolution.replay_kind();
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            if !matches!(session.state, SessionState::Starting) {
                return Err(SessionRuntimeError::InvalidSessionState(format!(
                    "session {session_id} cannot resolve connector launch in state {}",
                    session.state.as_str()
                )));
            }

            session.state = next_state;
            session.last_active_at = occurred_at.to_string();
            session.clone()
        };
        let replay_entry = {
            let store = self
                .replay_stores
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;
            store.append(replay_kind, replay_payload, occurred_at)
        };

        self.persist_session(&session_snapshot)?;
        self.persist_replay_entry(&replay_entry)?;

        Ok(ConnectorLaunchResolutionResult {
            session: session_snapshot,
            replay_entry,
        })
    }

    pub fn acknowledge(
        &mut self,
        attachment_id: &str,
        sequence: u64,
    ) -> SessionRuntimeResult<AttachmentRecord> {
        let (attachment_snapshot, session_id) = {
            let attachment = self.attachments.get_mut(attachment_id).ok_or_else(|| {
                SessionRuntimeError::AttachmentNotFound(attachment_id.to_string())
            })?;
            attachment.last_ack_sequence = sequence;
            attachment.cursor = sequence.to_string();
            (attachment.clone(), attachment.session_id.clone())
        };

        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(&session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.clone()))?;
            session.last_ack_sequence = sequence;
            session.last_active_at = current_timestamp();
            session.clone()
        };
        self.persist_session(&session_snapshot)?;

        Ok(attachment_snapshot)
    }

    pub fn replay(
        &self,
        session_id: &str,
        from_cursor: Option<&str>,
        limit: usize,
    ) -> SessionRuntimeResult<ReplaySlice> {
        let store = self
            .replay_stores
            .get(session_id)
            .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

        Ok(store.replay_from(from_cursor, limit))
    }

    pub fn terminate(
        &mut self,
        session_id: &str,
        exit_code: Option<i32>,
    ) -> SessionRuntimeResult<SessionRecord> {
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            session.state = SessionState::Exited;
            session.exit_code = exit_code;
            session.last_active_at = current_timestamp();
            session.clone()
        };

        self.attachments
            .retain(|_, attachment| attachment.session_id != session_id);
        self.persist_session(&session_snapshot)?;

        Ok(session_snapshot)
    }

    pub fn mark_stopping(
        &mut self,
        session_id: &str,
        occurred_at: &str,
    ) -> SessionRuntimeResult<SessionRecord> {
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            if !matches!(session.state, SessionState::Exited | SessionState::Failed) {
                session.state = SessionState::Stopping;
                session.last_active_at = occurred_at.to_string();
            }

            session.clone()
        };

        self.persist_session(&session_snapshot)?;

        Ok(session_snapshot)
    }

    pub fn fail(
        &mut self,
        session_id: &str,
        occurred_at: &str,
    ) -> SessionRuntimeResult<SessionRecord> {
        let session_snapshot = {
            let session = self
                .sessions
                .get_mut(session_id)
                .ok_or_else(|| SessionRuntimeError::SessionNotFound(session_id.to_string()))?;

            session.state = SessionState::Failed;
            session.last_active_at = occurred_at.to_string();
            session.clone()
        };

        self.attachments
            .retain(|_, attachment| attachment.session_id != session_id);
        self.persist_session(&session_snapshot)?;

        Ok(session_snapshot)
    }

    pub fn list_sessions(&self) -> Vec<SessionRecord> {
        let mut sessions = self.sessions.values().cloned().collect::<Vec<_>>();
        sessions.sort_by(|left, right| left.session_id.cmp(&right.session_id));
        sessions
    }

    pub fn list_attachments(&self) -> Vec<AttachmentRecord> {
        let mut attachments = self.attachments.values().cloned().collect::<Vec<_>>();
        attachments.sort_by(|left, right| left.attachment_id.cmp(&right.attachment_id));
        attachments
    }

    fn has_active_attachment(&self, session_id: &str) -> bool {
        self.attachments
            .values()
            .any(|attachment| attachment.session_id == session_id)
    }

    fn persist_session(&self, session: &SessionRecord) -> SessionRuntimeResult<()> {
        let Some(connection) = &self.sqlite_connection else {
            return Ok(());
        };

        connection.execute(
            "insert into session_index (
                session_id, workspace_id, target, state, created_at, last_active_at,
                mode_tags, tags, launch_intent, last_ack_sequence, exit_code
            ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            on conflict(session_id) do update set
                workspace_id = excluded.workspace_id,
                target = excluded.target,
                state = excluded.state,
                created_at = excluded.created_at,
                last_active_at = excluded.last_active_at,
                mode_tags = excluded.mode_tags,
                tags = excluded.tags,
                launch_intent = excluded.launch_intent,
                last_ack_sequence = excluded.last_ack_sequence,
                exit_code = excluded.exit_code",
            params![
                session.session_id,
                session.workspace_id,
                session.target,
                session.state.as_str(),
                session.created_at,
                session.last_active_at,
                serde_json::to_string(&session.mode_tags)?,
                serde_json::to_string(&session.tags)?,
                session
                    .launch_intent
                    .as_ref()
                    .map(serde_json::to_string)
                    .transpose()?,
                session.last_ack_sequence as i64,
                session.exit_code,
            ],
        )?;

        Ok(())
    }

    fn persist_replay_entry(&self, entry: &ReplayEntry) -> SessionRuntimeResult<()> {
        let Some(connection) = &self.sqlite_connection else {
            return Ok(());
        };

        connection.execute(
            "insert or replace into replay_entries (
                session_id, sequence, kind, payload, occurred_at
            ) values (?1, ?2, ?3, ?4, ?5)",
            params![
                entry.session_id,
                entry.sequence as i64,
                entry.kind.as_str(),
                entry.payload,
                entry.occurred_at,
            ],
        )?;

        Ok(())
    }

    fn load_sessions_from_sqlite(&mut self) -> SessionRuntimeResult<()> {
        let Some(connection) = &self.sqlite_connection else {
            return Ok(());
        };

        let mut statement = connection.prepare(
            "select session_id, workspace_id, target, state, created_at, last_active_at,
                    mode_tags, tags, launch_intent, last_ack_sequence, exit_code
             from session_index",
        )?;
        let rows = statement.query_map([], |row| {
            let state = row.get::<_, String>(3)?;
            let mode_tags = row.get::<_, String>(6)?;
            let tags = row.get::<_, String>(7)?;
            let launch_intent = row.get::<_, Option<String>>(8)?;

            Ok(SessionRecord {
                session_id: row.get(0)?,
                workspace_id: row.get(1)?,
                target: row.get(2)?,
                state: SessionState::from_str(&state).unwrap_or(SessionState::Failed),
                created_at: row.get(4)?,
                last_active_at: row.get(5)?,
                mode_tags: serde_json::from_str(&mode_tags).unwrap_or_default(),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
                launch_intent: launch_intent
                    .as_deref()
                    .map(serde_json::from_str)
                    .transpose()
                    .unwrap_or(None),
                last_ack_sequence: row.get::<_, i64>(9)? as u64,
                exit_code: row.get(10)?,
            })
        })?;

        for row in rows {
            let session = row?;
            self.sessions.insert(session.session_id.clone(), session);
        }

        Ok(())
    }

    fn load_replay_from_sqlite(&mut self) -> SessionRuntimeResult<()> {
        let Some(connection) = &self.sqlite_connection else {
            return Ok(());
        };

        let mut statement = connection.prepare(
            "select session_id, sequence, kind, payload, occurred_at
             from replay_entries
             order by session_id asc, sequence asc",
        )?;
        let rows = statement.query_map([], |row| {
            let kind = row.get::<_, String>(2)?;
            let sequence = row.get::<_, i64>(1)? as u64;

            Ok(ReplayEntry {
                session_id: row.get(0)?,
                sequence,
                cursor: sequence.to_string(),
                kind: ReplayEventKind::from_str(&kind).unwrap_or(ReplayEventKind::Warning),
                payload: row.get(3)?,
                occurred_at: row.get(4)?,
            })
        })?;

        let mut grouped = HashMap::<String, Vec<ReplayEntry>>::new();
        for row in rows {
            let entry = row?;
            grouped
                .entry(entry.session_id.clone())
                .or_default()
                .push(entry);
        }

        for session_id in self.sessions.keys() {
            let entries = grouped.remove(session_id).unwrap_or_default();
            self.replay_stores.insert(
                session_id.clone(),
                ReplayStore::from_entries(session_id.clone(), entries),
            );
        }

        Ok(())
    }
}

fn initialize_sqlite(path: &Path) -> SessionRuntimeResult<Connection> {
    let connection = Connection::open(path)?;
    connection.execute_batch("pragma journal_mode = wal;")?;
    connection.execute_batch(
        "create table if not exists session_index (
            session_id text primary key,
            workspace_id text not null,
            target text not null,
            state text not null,
            created_at text not null,
            last_active_at text not null,
            mode_tags text not null,
            tags text not null,
            launch_intent text,
            last_ack_sequence integer not null,
            exit_code integer
        );
        create table if not exists replay_entries (
            session_id text not null,
            sequence integer not null,
            kind text not null,
            payload text not null,
            occurred_at text not null,
            primary key (session_id, sequence)
        );",
    )?;
    ensure_sqlite_column(&connection, "session_index", "launch_intent", "text")?;

    Ok(connection)
}

fn ensure_sqlite_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> SessionRuntimeResult<()> {
    let pragma = format!("pragma table_info({table})");
    let mut statement = connection.prepare(&pragma)?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    let mut exists = false;

    for row in rows {
        if row? == column {
            exists = true;
            break;
        }
    }

    if !exists {
        let alter = format!("alter table {table} add column {column} {definition}");
        connection.execute(&alter, [])?;
    }

    Ok(())
}

fn parse_id_counter(value: &str) -> u64 {
    value
        .rsplit('-')
        .next()
        .and_then(|suffix| suffix.parse::<u64>().ok())
        .unwrap_or(0)
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
    for (i, &days_in_month) in month_days.iter().enumerate() {
        if remaining_days < days_in_month as i32 {
            month = i as u32 + 1;
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

impl LocalSessionDaemon {
    pub fn health_snapshot(&self) -> LocalDaemonHealthSnapshot {
        let phase = self.phase.clone().unwrap_or(LocalDaemonPhase::Stopped);
        let healthy = matches!(phase, LocalDaemonPhase::Running);

        LocalDaemonHealthSnapshot {
            phase,
            healthy,
            start_count: self.start_count,
            reconnect_count: self.reconnect_count,
            stop_count: self.stop_count,
            last_error: self.last_error.clone(),
            runtime_summary: readiness_summary(),
            observability_summary: observability_readiness_summary(),
        }
    }

    pub fn start(&mut self) -> LocalDaemonHealthSnapshot {
        self.phase = Some(LocalDaemonPhase::Starting);
        self.start_count += 1;
        self.last_error = None;
        self.health_snapshot()
    }

    pub fn mark_running(&mut self) -> LocalDaemonHealthSnapshot {
        if matches!(
            self.phase,
            Some(LocalDaemonPhase::Starting) | Some(LocalDaemonPhase::Reconnecting)
        ) {
            self.phase = Some(LocalDaemonPhase::Running);
        }
        self.health_snapshot()
    }

    pub fn stop(&mut self) -> LocalDaemonHealthSnapshot {
        self.stop_count += 1;
        self.phase = Some(LocalDaemonPhase::Stopped);
        self.health_snapshot()
    }

    pub fn reconnect(&mut self) -> LocalDaemonHealthSnapshot {
        self.reconnect_count += 1;
        self.phase = Some(LocalDaemonPhase::Reconnecting);
        self.last_error = None;
        self.health_snapshot()
    }

    pub fn fail(&mut self, message: impl Into<String>) -> LocalDaemonHealthSnapshot {
        self.phase = Some(LocalDaemonPhase::Failed);
        self.last_error = Some(message.into());
        self.health_snapshot()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_db_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();

        std::env::temp_dir().join(format!("sdkwork-terminal-{name}-{unique}.db"))
    }

    #[test]
    fn exposes_readiness_summary() {
        assert!(readiness_summary().contains("sdkwork-terminal-protocol"));
        assert!(readiness_summary().contains("sdkwork-terminal-observability"));
    }

    #[test]
    fn local_session_daemon_lifecycle_is_stable() {
        let mut daemon = LocalSessionDaemon::default();

        let initial = daemon.health_snapshot();
        assert_eq!(initial.phase, LocalDaemonPhase::Stopped);
        assert!(!initial.healthy);
        assert_eq!(initial.start_count, 0);
        assert_eq!(initial.reconnect_count, 0);
        assert_eq!(initial.stop_count, 0);

        let started = daemon.start();
        assert_eq!(started.phase, LocalDaemonPhase::Starting);
        assert!(!started.healthy);
        assert_eq!(started.start_count, 1);
        assert_eq!(started.reconnect_count, 0);

        let running = daemon.mark_running();
        assert_eq!(running.phase, LocalDaemonPhase::Running);
        assert!(running.healthy);

        let reconnected = daemon.reconnect();
        assert_eq!(reconnected.phase, LocalDaemonPhase::Reconnecting);
        assert!(!reconnected.healthy);
        assert_eq!(reconnected.start_count, 1);
        assert_eq!(reconnected.reconnect_count, 1);

        let running_after_reconnect = daemon.mark_running();
        assert_eq!(running_after_reconnect.phase, LocalDaemonPhase::Running);
        assert!(running_after_reconnect.healthy);

        let stopped = daemon.stop();
        assert_eq!(stopped.phase, LocalDaemonPhase::Stopped);
        assert!(!stopped.healthy);
        assert_eq!(stopped.stop_count, 1);
    }

    #[test]
    fn local_session_daemon_failure_is_visible() {
        let mut daemon = LocalSessionDaemon::default();

        let failed = daemon.fail("bridge handshake timeout");

        assert_eq!(failed.phase, LocalDaemonPhase::Failed);
        assert!(!failed.healthy);
        assert_eq!(
            failed.last_error.as_deref(),
            Some("bridge handshake timeout")
        );
    }

    #[test]
    fn session_runtime_tracks_attach_detach_reattach_and_replay() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-a".into(),
            target: "local-shell".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["codex".into()],
            launch_intent: None,
        });

        assert_eq!(session.state, SessionState::Running);

        let attachment = runtime.attach(&session.session_id).unwrap();
        runtime
            .record_output(
                &session.session_id,
                "session ready",
                "2026-04-09T00:00:00.000Z",
            )
            .unwrap();
        runtime.acknowledge(&attachment.attachment_id, 1).unwrap();

        let detached = runtime.detach(&attachment.attachment_id).unwrap();
        assert_eq!(detached.state, SessionState::Detached);

        let reattached = runtime.reattach(&session.session_id).unwrap();
        assert_eq!(reattached.session.state, SessionState::Running);
        assert_eq!(reattached.attachment.last_ack_sequence, 1);

        let replay = runtime.replay(&session.session_id, None, 10).unwrap();
        assert_eq!(replay.entries.len(), 1);
        assert_eq!(replay.entries[0].payload, "session ready");
    }

    #[test]
    fn detached_session_stays_detached_when_runtime_records_output_without_active_attachment() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-a".into(),
            target: "local-shell".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["codex".into()],
            launch_intent: None,
        });

        let attachment = runtime.attach(&session.session_id).unwrap();
        let detached = runtime.detach(&attachment.attachment_id).unwrap();
        assert_eq!(detached.state, SessionState::Detached);

        runtime
            .record_output(
                &session.session_id,
                "background output",
                "2026-04-10T08:00:10.000Z",
            )
            .unwrap();

        let session_snapshot = runtime
            .list_sessions()
            .into_iter()
            .find(|entry| entry.session_id == session.session_id)
            .unwrap();
        assert_eq!(session_snapshot.state, SessionState::Detached);
    }

    #[test]
    fn session_runtime_persists_index_and_replay_into_sqlite() {
        let db_path = temp_db_path("session-runtime");

        {
            let mut runtime = SessionRuntime::with_sqlite(&db_path).unwrap();
            let session = runtime.create_session(SessionCreateRequest {
                workspace_id: "workspace-b".into(),
                target: "local-shell".into(),
                mode_tags: vec!["cli-native".into()],
                tags: vec!["gemini".into()],
                launch_intent: None,
            });

            runtime
                .record_output(
                    &session.session_id,
                    "persisted line",
                    "2026-04-09T00:00:00.000Z",
                )
                .unwrap();
            runtime.terminate(&session.session_id, Some(0)).unwrap();
        }

        {
            let runtime = SessionRuntime::with_sqlite(&db_path).unwrap();
            let sessions = runtime.list_sessions();

            assert_eq!(sessions.len(), 1);
            assert_eq!(sessions[0].state, SessionState::Exited);
            assert_eq!(sessions[0].exit_code, Some(0));

            let replay = runtime.replay(&sessions[0].session_id, None, 10).unwrap();
            assert_eq!(replay.entries.len(), 1);
            assert_eq!(replay.entries[0].payload, "persisted line");
        }

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn connector_backed_session_starts_with_persisted_launch_intent() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
            launch_intent: Some(SessionLaunchIntent {
                authority: "ops@prod-bastion".into(),
                command: vec!["bash".into(), "-l".into()],
            }),
        });

        assert_eq!(session.state, SessionState::Starting);
        assert_eq!(
            session.launch_intent,
            Some(SessionLaunchIntent {
                authority: "ops@prod-bastion".into(),
                command: vec!["bash".into(), "-l".into()],
            })
        );
    }

    #[test]
    fn connector_launch_intent_persists_into_sqlite_and_reload() {
        let db_path = temp_db_path("connector-launch-intent");

        {
            let mut runtime = SessionRuntime::with_sqlite(&db_path).unwrap();
            runtime.create_session(SessionCreateRequest {
                workspace_id: "workspace-remote".into(),
                target: "docker-exec".into(),
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:docker-exec".into()],
                launch_intent: Some(SessionLaunchIntent {
                    authority: "docker://workspace-dev".into(),
                    command: vec!["/bin/sh".into()],
                }),
            });
        }

        {
            let runtime = SessionRuntime::with_sqlite(&db_path).unwrap();
            let sessions = runtime.list_sessions();

            assert_eq!(sessions.len(), 1);
            assert_eq!(sessions[0].state, SessionState::Starting);
            assert_eq!(
                sessions[0].launch_intent,
                Some(SessionLaunchIntent {
                    authority: "docker://workspace-dev".into(),
                    command: vec!["/bin/sh".into()],
                })
            );
        }

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn maps_protocol_connector_launch_request_into_session_create_request() {
        let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
            workspace_id: "workspace-remote".into(),
            target: "kubernetes-exec".into(),
            authority: "k8s://prod/web-0".into(),
            command: vec!["/bin/sh".into()],
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:kubernetes-exec".into()],
        };

        let create_request = SessionCreateRequest::from_connector_launch_request(&request);
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(create_request);

        assert_eq!(session.workspace_id, "workspace-remote");
        assert_eq!(session.target, "kubernetes-exec");
        assert_eq!(session.state, SessionState::Starting);
        assert_eq!(
            session.launch_intent,
            Some(SessionLaunchIntent {
                authority: "k8s://prod/web-0".into(),
                command: vec!["/bin/sh".into()],
            })
        );
        assert_eq!(session.tags, vec!["resource:kubernetes-exec".to_string()]);
    }

    #[test]
    fn connector_backed_session_stays_starting_until_launch_resolution() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
            launch_intent: Some(SessionLaunchIntent {
                authority: "ops@prod-bastion".into(),
                command: vec!["bash".into(), "-l".into()],
            }),
        });

        let attachment = runtime.attach(&session.session_id).unwrap();
        let output = runtime
            .record_output(
                &session.session_id,
                "bootstrap banner",
                "2026-04-09T00:00:10.000Z",
            )
            .unwrap();
        let session_snapshot = runtime.list_sessions().remove(0);

        assert_eq!(attachment.session_id, session.session_id);
        assert_eq!(output.kind, ReplayEventKind::Output);
        assert_eq!(session_snapshot.state, SessionState::Starting);
    }

    #[test]
    fn connector_launch_resolution_marks_session_running_and_records_state_evidence() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
            launch_intent: Some(SessionLaunchIntent {
                authority: "ops@prod-bastion".into(),
                command: vec!["bash".into(), "-l".into()],
            }),
        });

        let resolution = runtime
            .resolve_connector_launch(
                &session.session_id,
                ConnectorLaunchResolution::Running {
                    phase: "connect".into(),
                    detail: "ssh handshake complete".into(),
                },
                "2026-04-09T00:00:11.000Z",
            )
            .unwrap();

        assert_eq!(resolution.session.state, SessionState::Running);
        assert_eq!(resolution.replay_entry.kind, ReplayEventKind::State);

        let payload =
            serde_json::from_str::<serde_json::Value>(&resolution.replay_entry.payload).unwrap();
        assert_eq!(payload["state"], "running");
        assert_eq!(payload["phase"], "connect");
        assert_eq!(payload["detail"], "ssh handshake complete");
    }

    #[test]
    fn connector_launch_resolution_marks_session_failed_and_records_warning_evidence() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-remote".into(),
            target: "kubernetes-exec".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:kubernetes-exec".into()],
            launch_intent: Some(SessionLaunchIntent {
                authority: "k8s://prod/web-0".into(),
                command: vec!["/bin/sh".into()],
            }),
        });

        let resolution = runtime
            .resolve_connector_launch(
                &session.session_id,
                ConnectorLaunchResolution::Failed {
                    code: "connector_connect_failed".into(),
                    phase: "connect".into(),
                    retryable: true,
                    program: "kubectl".into(),
                    status: Some(1),
                    message: "exec credential plugin rejected".into(),
                },
                "2026-04-09T00:00:12.000Z",
            )
            .unwrap();

        assert_eq!(resolution.session.state, SessionState::Failed);
        assert_eq!(resolution.replay_entry.kind, ReplayEventKind::Warning);

        let payload =
            serde_json::from_str::<serde_json::Value>(&resolution.replay_entry.payload).unwrap();
        assert_eq!(payload["state"], "failed");
        assert_eq!(payload["code"], "connector_connect_failed");
        assert_eq!(payload["retryable"], true);
        assert_eq!(payload["program"], "kubectl");
        assert_eq!(payload["status"], 1);
        assert_eq!(payload["message"], "exec credential plugin rejected");
    }

    #[test]
    fn session_runtime_records_generic_warning_and_exit_replay_evidence() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-remote".into(),
            target: "ssh".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:ssh".into()],
            launch_intent: None,
        });

        let warning = runtime
            .record_replay_event(
                &session.session_id,
                ReplayEventKind::Warning,
                "{\"message\":\"permission denied\"}",
                "2026-04-09T00:00:13.000Z",
            )
            .unwrap();
        let exit = runtime
            .record_replay_event(
                &session.session_id,
                ReplayEventKind::Exit,
                "{\"exitCode\":126}",
                "2026-04-09T00:00:14.000Z",
            )
            .unwrap();
        let replay = runtime.replay(&session.session_id, None, 10).unwrap();

        assert_eq!(warning.kind, ReplayEventKind::Warning);
        assert_eq!(exit.kind, ReplayEventKind::Exit);
        assert_eq!(replay.entries.len(), 2);
        assert_eq!(replay.entries[0].kind, ReplayEventKind::Warning);
        assert_eq!(replay.entries[1].kind, ReplayEventKind::Exit);
    }

    #[test]
    fn session_runtime_marks_session_failed_and_drops_attachments() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-local".into(),
            target: "local-shell".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["profile:powershell".into()],
            launch_intent: None,
        });
        let attachment = runtime.attach(&session.session_id).unwrap();

        let failed = runtime
            .fail(&session.session_id, "2026-04-09T00:00:15.000Z")
            .unwrap();

        assert_eq!(failed.state, SessionState::Failed);
        assert_eq!(runtime.list_attachments().len(), 0);
        assert_eq!(attachment.session_id, session.session_id);
    }

    #[test]
    fn session_runtime_marks_session_stopping_before_exit() {
        let mut runtime = SessionRuntime::new();
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-local".into(),
            target: "local-shell".into(),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["profile:powershell".into()],
            launch_intent: None,
        });

        let stopping = runtime
            .mark_stopping(&session.session_id, "2026-04-09T00:00:16.000Z")
            .unwrap();

        assert_eq!(stopping.state, SessionState::Stopping);
    }
}
