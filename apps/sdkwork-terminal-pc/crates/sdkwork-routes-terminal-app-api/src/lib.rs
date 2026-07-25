use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{
        sse::{Event, Sse},
        IntoResponse, Response,
    },
    routing::{get, post},
    Router,
};
use sdkwork_terminal_runtime_node::{
    RemoteRuntimeSessionCreateRequest, RuntimeNodeHost, RuntimeNodeHostError,
    RuntimeNodeInteractiveSessionCreateSnapshot, RuntimeNodeReplayEntrySnapshot,
    RuntimeNodeSessionReplaySnapshot, RuntimeNodeStreamEvent,
};
use sdkwork_utils_rust::{
    http_api::{SdkWorkApiResponse, SdkWorkProblemDetail, SdkWorkResourceData, SdkWorkResultCode},
    id::uuid,
};
use sdkwork_web_contract::{HttpMethod, HttpRoute};
use sdkwork_web_core::WebRequestContext;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    convert::Infallible,
    sync::{mpsc::Receiver, Arc, Mutex},
    thread,
};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

pub const TERMINAL_APP_API_PREFIX: &str = "/app/v3/api/device/terminal";

pub mod project_execution;

use crate::project_execution::{
    DenyProjectTerminalExecutionResolver, ProjectTerminalExecutionError,
    ProjectTerminalExecutionRequest, ProjectTerminalExecutionResolver,
    ResolvedProjectTerminalExecution,
};

pub mod manifest {
    use super::*;

    pub const TERMINAL_APP_API_ROUTES: &[HttpRoute] = &[
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/app/v3/api/device/terminal/sessions",
            "deviceTerminalSessions",
            "device.terminal.sessions.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/app/v3/api/device/terminal/sessions",
            "deviceTerminalSessions",
            "device.terminal.sessions.create",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/app/v3/api/device/terminal/sessions/{sessionId}/replay",
            "deviceTerminalSessions",
            "device.terminal.sessions.replay.list",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/app/v3/api/device/terminal/sessions/{sessionId}/input",
            "deviceTerminalSessions",
            "device.terminal.sessions.input",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/app/v3/api/device/terminal/sessions/{sessionId}/input_bytes",
            "deviceTerminalSessions",
            "device.terminal.sessions.inputBytes",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/app/v3/api/device/terminal/sessions/{sessionId}/resize",
            "deviceTerminalSessions",
            "device.terminal.sessions.resize",
        ),
        HttpRoute::dual_token(
            HttpMethod::Post,
            "/app/v3/api/device/terminal/sessions/{sessionId}/terminate",
            "deviceTerminalSessions",
            "device.terminal.sessions.terminate",
        ),
        HttpRoute::dual_token(
            HttpMethod::Get,
            "/app/v3/api/device/terminal/sessions/{sessionId}/events",
            "deviceTerminalSessions",
            "device.terminal.sessions.events.stream",
        ),
    ];
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
struct SessionOwner {
    tenant_id: String,
    organization_id: Option<String>,
    subject_id: String,
}

#[derive(Clone)]
pub struct TerminalAppState {
    host: Arc<RuntimeNodeHost>,
    owners: Arc<Mutex<HashMap<String, SessionOwner>>>,
    project_execution_resolver: Arc<dyn ProjectTerminalExecutionResolver>,
}

impl TerminalAppState {
    pub fn new(host: Arc<RuntimeNodeHost>) -> Self {
        Self::with_project_execution_resolver(host, Arc::new(DenyProjectTerminalExecutionResolver))
    }

    pub fn with_project_execution_resolver(
        host: Arc<RuntimeNodeHost>,
        project_execution_resolver: Arc<dyn ProjectTerminalExecutionResolver>,
    ) -> Self {
        Self {
            host,
            owners: Arc::new(Mutex::new(HashMap::new())),
            project_execution_resolver,
        }
    }

    pub fn new_default() -> Result<Self, RuntimeNodeHostError> {
        Ok(Self::new(Arc::new(RuntimeNodeHost::new_default()?)))
    }

    fn owner(ctx: &WebRequestContext) -> Result<SessionOwner, ApiError> {
        let principal = ctx.require_principal().map_err(|error| {
            ApiError::platform(SdkWorkResultCode::AuthenticationRequired, error.to_string())
        })?;
        Ok(SessionOwner {
            tenant_id: principal.tenant_id().to_owned(),
            organization_id: principal.organization_id().map(str::to_owned),
            subject_id: principal.user_id().to_owned(),
        })
    }

    fn remember(&self, session_id: &str, owner: SessionOwner) -> Result<(), ApiError> {
        self.owners
            .lock()
            .map_err(|_| ApiError::internal("terminal owner registry lock poisoned"))?
            .insert(session_id.to_owned(), owner);
        Ok(())
    }

    fn require_owner(&self, session_id: &str, ctx: &WebRequestContext) -> Result<(), ApiError> {
        let caller = Self::owner(ctx)?;
        let owners = self
            .owners
            .lock()
            .map_err(|_| ApiError::internal("terminal owner registry lock poisoned"))?;
        match owners.get(session_id) {
            Some(owner) if owner == &caller => Ok(()),
            Some(_) => Err(ApiError::platform(
                SdkWorkResultCode::PermissionRequired,
                "terminal session belongs to another caller",
            )),
            None => Err(ApiError::platform(
                SdkWorkResultCode::NotFound,
                format!("terminal session not found: {session_id}"),
            )),
        }
    }

    fn owned_session_ids(&self, ctx: &WebRequestContext) -> Result<HashSet<String>, ApiError> {
        let caller = Self::owner(ctx)?;
        let owners = self
            .owners
            .lock()
            .map_err(|_| ApiError::internal("terminal owner registry lock poisoned"))?;
        Ok(owners
            .iter()
            .filter_map(|(session_id, owner)| (owner == &caller).then(|| session_id.clone()))
            .collect())
    }
}

#[derive(Debug, Deserialize)]
struct ReplayQuery {
    #[serde(alias = "fromCursor")]
    cursor: Option<String>,
    #[serde(alias = "limit")]
    page_size: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InputBody {
    input: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InputBytesBody {
    input_bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResizeBody {
    cols: u16,
    rows: u16,
}

/// Project terminal creation intentionally excludes `workingDirectory`,
/// target, and authority. Those execution facts are resolved from the
/// authenticated project runtime location.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateProjectTerminalSessionBody {
    project_id: String,
    runtime_location_id: String,
    command: Vec<String>,
    cols: Option<u16>,
    rows: Option<u16>,
    #[serde(default)]
    mode_tags: Vec<String>,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamPayload {
    session_id: String,
    next_cursor: String,
    entry: RuntimeNodeReplayEntrySnapshot,
}

/// A path-free projection of a created project terminal session. The runtime
/// host keeps the actual working directory only long enough to spawn the PTY;
/// it is not an app-api response field.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectTerminalSessionCreatePayload {
    session_id: String,
    project_id: String,
    runtime_location_id: String,
    target: String,
    state: String,
    created_at: String,
    last_active_at: String,
    mode_tags: Vec<String>,
    tags: Vec<String>,
    attachment_id: String,
    cursor: String,
    last_ack_sequence: u64,
    writable: bool,
    invoked_program: String,
    invoked_args: Vec<String>,
    replay_entry: RuntimeNodeReplayEntrySnapshot,
}

impl ProjectTerminalSessionCreatePayload {
    fn from_snapshot(
        snapshot: RuntimeNodeInteractiveSessionCreateSnapshot,
        project_id: String,
        runtime_location_id: String,
    ) -> Self {
        Self {
            session_id: snapshot.session_id,
            project_id,
            runtime_location_id,
            target: snapshot.target,
            state: snapshot.state,
            created_at: snapshot.created_at,
            last_active_at: snapshot.last_active_at,
            mode_tags: snapshot.mode_tags,
            tags: snapshot.tags,
            attachment_id: snapshot.attachment_id,
            cursor: snapshot.cursor,
            last_ack_sequence: snapshot.last_ack_sequence,
            writable: snapshot.writable,
            invoked_program: snapshot.invoked_program,
            invoked_args: snapshot.invoked_args,
            replay_entry: redact_runtime_location_replay_entry(snapshot.replay_entry),
        }
    }
}

pub fn build_terminal_app_api_router() -> Router<TerminalAppState> {
    Router::new()
        .route(
            "/app/v3/api/device/terminal/sessions",
            get(list_sessions).post(create_session),
        )
        .route(
            "/app/v3/api/device/terminal/sessions/{session_id}/replay",
            get(read_replay),
        )
        .route(
            "/app/v3/api/device/terminal/sessions/{session_id}/input",
            post(write_input),
        )
        .route(
            "/app/v3/api/device/terminal/sessions/{session_id}/input_bytes",
            post(write_input_bytes),
        )
        .route(
            "/app/v3/api/device/terminal/sessions/{session_id}/resize",
            post(resize_session),
        )
        .route(
            "/app/v3/api/device/terminal/sessions/{session_id}/terminate",
            post(terminate_session),
        )
        .route(
            "/app/v3/api/device/terminal/sessions/{session_id}/events",
            get(stream_session_events),
        )
}

async fn list_sessions(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
) -> Result<Response, ApiError> {
    let owned = state.owned_session_ids(&ctx)?;
    let mut snapshot = state.host.session_index().map_err(ApiError::from)?;
    snapshot
        .sessions
        .retain(|session| owned.contains(&session.session_id));
    snapshot
        .attachments
        .retain(|attachment| owned.contains(&attachment.session_id));
    Ok(success_item(StatusCode::OK, snapshot))
}

async fn create_session(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    body: Bytes,
) -> Result<Response, ApiError> {
    let owner = TerminalAppState::owner(&ctx)?;
    let request =
        parse_json::<CreateProjectTerminalSessionBody>(&body, "project terminal session create")?;
    validate_project_terminal_create_request(&request)?;
    let execution = state
        .project_execution_resolver
        .resolve_project_terminal_execution(ProjectTerminalExecutionRequest {
            tenant_id: owner.tenant_id.clone(),
            organization_id: owner.organization_id.clone(),
            subject_id: owner.subject_id.clone(),
            project_id: request.project_id.clone(),
            runtime_location_id: request.runtime_location_id.clone(),
        })
        .await
        .map_err(ApiError::from)?;
    let working_directory = canonical_project_terminal_root(&execution)?;
    let project_id = request.project_id;
    let runtime_location_id = request.runtime_location_id;
    let mut runtime_request = RemoteRuntimeSessionCreateRequest {
        workspace_id: execution.workspace_id().to_owned(),
        target: execution.target().as_host_target().to_owned(),
        authority: execution.authority().to_owned(),
        command: request.command,
        working_directory: Some(working_directory),
        cols: request.cols,
        rows: request.rows,
        mode_tags: request.mode_tags,
        tags: request.tags,
    };
    normalize_host_shell_command(&mut runtime_request);
    let snapshot = state
        .host
        .create_project_runtime_session(runtime_request)
        .map_err(ApiError::from)?;
    state.remember(&snapshot.session_id, owner)?;
    Ok(success_item(
        StatusCode::CREATED,
        ProjectTerminalSessionCreatePayload::from_snapshot(
            snapshot,
            project_id,
            runtime_location_id,
        ),
    ))
}

fn validate_project_terminal_create_request(
    request: &CreateProjectTerminalSessionBody,
) -> Result<(), ApiError> {
    validate_opaque_identifier(&request.project_id, "projectId")?;
    validate_opaque_identifier(&request.runtime_location_id, "runtimeLocationId")?;
    if request.command.is_empty()
        || request.command.len() > 32
        || request.command.iter().any(|value| {
            value.trim().is_empty()
                || value.len() > 2048
                || value.bytes().any(|byte| byte < 0x20 || byte == 0x7f)
        })
    {
        return Err(ApiError::validation(
            "command must contain at most 32 non-empty printable arguments.",
        ));
    }
    for (field, values) in [("modeTags", &request.mode_tags), ("tags", &request.tags)] {
        if values.len() > 32
            || values.iter().any(|value| {
                value.trim().is_empty()
                    || value.len() > 128
                    || value.bytes().any(|byte| byte < 0x20 || byte == 0x7f)
            })
        {
            return Err(ApiError::validation(format!(
                "{field} must contain at most 32 non-empty printable values."
            )));
        }
    }
    if request.cols.is_some_and(|value| value > 500)
        || request.rows.is_some_and(|value| value > 500)
    {
        return Err(ApiError::validation(
            "terminal dimensions must not exceed 500 columns or rows.",
        ));
    }
    Ok(())
}

fn validate_opaque_identifier(value: &str, field: &str) -> Result<(), ApiError> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > 160
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-' | b':'))
        || value.contains("..")
    {
        return Err(ApiError::validation(format!(
            "{field} must be an opaque identifier."
        )));
    }
    Ok(())
}

fn canonical_project_terminal_root(
    execution: &ResolvedProjectTerminalExecution,
) -> Result<String, ApiError> {
    validate_opaque_identifier(execution.workspace_id(), "workspaceId")?;
    validate_opaque_identifier(execution.authority(), "execution authority")?;
    let path = execution.canonical_root();
    if !path.is_absolute() {
        return Err(ApiError::project_execution_unavailable());
    }
    let metadata =
        std::fs::symlink_metadata(path).map_err(|_| ApiError::project_execution_unavailable())?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(ApiError::project_execution_unavailable());
    }
    let canonical =
        std::fs::canonicalize(path).map_err(|_| ApiError::project_execution_unavailable())?;
    if !canonical.is_absolute() || !canonical.is_dir() || canonical != path {
        return Err(ApiError::project_execution_unavailable());
    }
    Ok(canonical.to_string_lossy().into_owned())
}

fn normalize_host_shell_command(request: &mut RemoteRuntimeSessionCreateRequest) {
    if !cfg!(windows) {
        return;
    }
    let requested_program = request
        .command
        .first()
        .map(String::as_str)
        .unwrap_or_default();
    if matches!(requested_program, "/bin/sh" | "/bin/bash" | "sh" | "bash") {
        request.command = vec!["cmd.exe".to_owned(), "/Q".to_owned()];
    }
}

async fn read_replay(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    Path(session_id): Path<String>,
    Query(query): Query<ReplayQuery>,
) -> Result<Response, ApiError> {
    state.require_owner(&session_id, &ctx)?;
    let replay = state
        .host
        .session_replay(
            &session_id,
            query.cursor.as_deref(),
            query.page_size.unwrap_or(128).clamp(1, 200),
        )
        .map_err(ApiError::from)?;
    Ok(success_item(
        StatusCode::OK,
        redact_runtime_location_replay_snapshot(replay),
    ))
}

async fn write_input(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    state.require_owner(&session_id, &ctx)?;
    let request = parse_json::<InputBody>(&body, "terminal input")?;
    let result = state
        .host
        .write_session_input(&session_id, &request.input)
        .map_err(ApiError::from)?;
    Ok(success_item(StatusCode::OK, result))
}

async fn write_input_bytes(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    state.require_owner(&session_id, &ctx)?;
    let request = parse_json::<InputBytesBody>(&body, "terminal byte input")?;
    let result = state
        .host
        .write_session_input_bytes(&session_id, &request.input_bytes)
        .map_err(ApiError::from)?;
    Ok(success_item(StatusCode::OK, result))
}

async fn resize_session(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    state.require_owner(&session_id, &ctx)?;
    let request = parse_json::<ResizeBody>(&body, "terminal resize")?;
    let result = state
        .host
        .resize_session(&session_id, request.cols, request.rows)
        .map_err(ApiError::from)?;
    Ok(success_item(StatusCode::OK, result))
}

async fn terminate_session(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    Path(session_id): Path<String>,
) -> Result<Response, ApiError> {
    state.require_owner(&session_id, &ctx)?;
    let result = state
        .host
        .terminate_session(&session_id)
        .map_err(ApiError::from)?;
    Ok(success_item(StatusCode::OK, result))
}

async fn stream_session_events(
    State(state): State<TerminalAppState>,
    ctx: WebRequestContext,
    Path(session_id): Path<String>,
) -> Result<Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    state.require_owner(&session_id, &ctx)?;
    let (receiver, guard) = state
        .host
        .subscribe_session_events(&session_id)
        .map_err(ApiError::from)?;
    let stream = bridge_stream(receiver, guard).map(_map_stream_event);
    Ok(Sse::new(stream))
}

fn bridge_stream(
    receiver: Receiver<RuntimeNodeStreamEvent>,
    guard: sdkwork_terminal_runtime_node::SessionEventSubscriptionGuard,
) -> ReceiverStream<RuntimeNodeStreamEvent> {
    let (tx, rx) = mpsc::channel(256);
    thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            if tx.blocking_send(event).is_err() {
                break;
            }
        }
        drop(guard);
    });
    ReceiverStream::new(rx)
}

fn redact_runtime_location_replay_snapshot(
    mut snapshot: RuntimeNodeSessionReplaySnapshot,
) -> RuntimeNodeSessionReplaySnapshot {
    snapshot.entries = snapshot
        .entries
        .into_iter()
        .map(redact_runtime_location_replay_entry)
        .collect();
    snapshot
}

fn redact_runtime_location_replay_entry(
    mut entry: RuntimeNodeReplayEntrySnapshot,
) -> RuntimeNodeReplayEntrySnapshot {
    if entry.kind != "state" {
        return entry;
    }
    let Ok(mut payload) = serde_json::from_str::<serde_json::Value>(&entry.payload) else {
        entry.payload = "{}".to_owned();
        return entry;
    };
    let Some(payload) = payload.as_object_mut() else {
        entry.payload = "{}".to_owned();
        return entry;
    };
    payload.remove("workingDirectory");
    entry.payload = serde_json::to_string(payload).unwrap_or_else(|_| "{}".to_owned());
    entry
}

fn stream_payload(event: RuntimeNodeStreamEvent) -> (&'static str, StreamPayload) {
    match event {
        RuntimeNodeStreamEvent::Output {
            session_id,
            next_cursor,
            entry,
        } => (
            "session.output",
            StreamPayload {
                session_id,
                next_cursor,
                entry: redact_runtime_location_replay_entry(entry),
            },
        ),
        RuntimeNodeStreamEvent::Warning {
            session_id,
            next_cursor,
            entry,
        } => (
            "session.warning",
            StreamPayload {
                session_id,
                next_cursor,
                entry: redact_runtime_location_replay_entry(entry),
            },
        ),
        RuntimeNodeStreamEvent::Exit {
            session_id,
            next_cursor,
            entry,
        } => (
            "session.exit",
            StreamPayload {
                session_id,
                next_cursor,
                entry: redact_runtime_location_replay_entry(entry),
            },
        ),
    }
}

fn parse_json<T: DeserializeOwned>(body: &[u8], label: &str) -> Result<T, ApiError> {
    serde_json::from_slice(body)
        .map_err(|error| ApiError::validation(format!("{label} body is invalid: {error}")))
}

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    problem: SdkWorkProblemDetail,
}

impl ApiError {
    fn platform(code: SdkWorkResultCode, detail: impl Into<String>) -> Self {
        let status = StatusCode::from_u16(code.http_status_code())
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        Self {
            status,
            problem: SdkWorkProblemDetail::platform(code, detail, uuid()),
        }
    }

    fn validation(detail: impl Into<String>) -> Self {
        Self::platform(SdkWorkResultCode::ValidationError, detail)
    }

    fn internal(detail: impl Into<String>) -> Self {
        Self::platform(SdkWorkResultCode::InternalError, detail)
    }

    fn project_execution_unavailable() -> Self {
        Self::platform(
            SdkWorkResultCode::ServiceUnavailable,
            "The requested project runtime location is unavailable for terminal execution.",
        )
    }
}

impl From<ProjectTerminalExecutionError> for ApiError {
    fn from(error: ProjectTerminalExecutionError) -> Self {
        match error {
            ProjectTerminalExecutionError::InvalidInput => {
                Self::validation("Project terminal execution input is invalid.")
            }
            ProjectTerminalExecutionError::NotFound => Self::platform(
                SdkWorkResultCode::NotFound,
                "The requested project runtime location was not found.",
            ),
            ProjectTerminalExecutionError::Forbidden => Self::platform(
                SdkWorkResultCode::PermissionRequired,
                "The caller is not authorized to use the requested project runtime location.",
            ),
            ProjectTerminalExecutionError::Conflict => Self::platform(
                SdkWorkResultCode::Conflict,
                "The requested project runtime location cannot be used for terminal execution.",
            ),
            ProjectTerminalExecutionError::Unavailable => Self::project_execution_unavailable(),
            ProjectTerminalExecutionError::Internal => {
                Self::internal("Project terminal execution could not be resolved.")
            }
        }
    }
}

impl From<RuntimeNodeHostError> for ApiError {
    fn from(error: RuntimeNodeHostError) -> Self {
        let detail = error.to_string();
        match error {
            RuntimeNodeHostError::InvalidRequest(_) => Self::validation(detail),
            RuntimeNodeHostError::Runtime(
                sdkwork_terminal_session_runtime::SessionRuntimeError::SessionNotFound(_),
            )
            | RuntimeNodeHostError::Pty(
                sdkwork_terminal_pty_runtime::LocalShellExecutionError::SessionNotFound(_),
            ) => Self::platform(SdkWorkResultCode::NotFound, detail),
            RuntimeNodeHostError::Runtime(
                sdkwork_terminal_session_runtime::SessionRuntimeError::InvalidSessionState(_),
            )
            | RuntimeNodeHostError::Pty(
                sdkwork_terminal_pty_runtime::LocalShellExecutionError::DuplicateSessionId(_),
            ) => Self::platform(SdkWorkResultCode::Conflict, detail),
            _ => Self::internal(detail),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/problem+json"),
        );
        (self.status, headers, axum::Json(self.problem)).into_response()
    }
}

fn success_item<T: Serialize>(status: StatusCode, item: T) -> Response {
    let trace_id = uuid();
    let body = SdkWorkApiResponse::success(SdkWorkResourceData { item }, trace_id.clone());
    let mut headers = HeaderMap::new();
    if let Ok(value) = HeaderValue::from_str(&trace_id) {
        headers.insert(header::HeaderName::from_static("x-sdkwork-trace-id"), value);
    }
    (status, headers, axum::Json(body)).into_response()
}

fn _map_stream_event(event: RuntimeNodeStreamEvent) -> Result<Event, Infallible> {
    let (event_name, payload) = stream_payload(event);
    let data = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_owned());
    Ok(Event::default().event(event_name).data(data))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use http_body_util::BodyExt;
    use sdkwork_web_core::{
        request_identity::ServerRequestId, WebApiSurface, WebAuthMode, WebClientKind,
        WebDeploymentMode, WebEnvironment, WebTransportFacts,
    };
    use std::{path::PathBuf, sync::Mutex};
    use tower::ServiceExt;

    use crate::project_execution::{
        ProjectTerminalExecutionRequest, ProjectTerminalExecutionResolver,
        ProjectTerminalExecutionTarget, ResolvedProjectTerminalExecution,
    };

    struct TestDirectory {
        root: PathBuf,
    }

    impl TestDirectory {
        fn new() -> Self {
            let root = std::env::temp_dir()
                .join(format!("sdkwork-terminal-project-runtime-route-{}", uuid()));
            std::fs::create_dir_all(&root).expect("create test project root");
            Self { root }
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[derive(Clone)]
    struct RecordingProjectExecutionResolver {
        root: PathBuf,
        requests: Arc<Mutex<Vec<ProjectTerminalExecutionRequest>>>,
    }

    #[async_trait::async_trait]
    impl ProjectTerminalExecutionResolver for RecordingProjectExecutionResolver {
        async fn resolve_project_terminal_execution(
            &self,
            request: ProjectTerminalExecutionRequest,
        ) -> Result<ResolvedProjectTerminalExecution, ProjectTerminalExecutionError> {
            self.requests
                .lock()
                .expect("record project terminal request")
                .push(request);
            Ok(ResolvedProjectTerminalExecution::new(
                "workspace-terminal-test",
                ProjectTerminalExecutionTarget::ServerRuntimeNode,
                "project-runtime-location:location-test",
                std::fs::canonicalize(&self.root).expect("canonical test project root"),
            ))
        }
    }

    fn request_context(user_id: &str) -> WebRequestContext {
        WebRequestContext {
            request_id: ServerRequestId(uuid()),
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: TERMINAL_APP_API_PREFIX.to_owned(),
                method: "POST".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(
                sdkwork_web_core::WebRequestPrincipal::builder()
                    .tenant_id("100001")
                    .organization_id(Some("0".to_owned()))
                    .user_id(user_id)
                    .app_id("sdkwork-birdcoder")
                    .environment(WebEnvironment::Test)
                    .deployment_mode(WebDeploymentMode::Local)
                    .build(),
            ),
            locale: Some("en-US".to_owned()),
            client_kind: Some(WebClientKind::Browser),
            operation: None,
            trace_id: None,
            idempotency_key: None,
        }
    }

    fn request(method: &str, uri: &str, body: Body, user_id: &str) -> Request<Body> {
        let mut request = Request::builder()
            .method(method)
            .uri(uri)
            .header(header::CONTENT_TYPE, "application/json")
            .body(body)
            .expect("request");
        request.extensions_mut().insert(request_context(user_id));
        request
    }

    #[tokio::test]
    async fn browser_session_lifecycle_is_owner_scoped() {
        let root = TestDirectory::new();
        let requests = Arc::new(Mutex::new(Vec::new()));
        let state = TerminalAppState::with_project_execution_resolver(
            Arc::new(RuntimeNodeHost::new_default().expect("terminal app state")),
            Arc::new(RecordingProjectExecutionResolver {
                root: root.root.clone(),
                requests: requests.clone(),
            }),
        );
        let app = build_terminal_app_api_router().with_state(state);
        let command = if cfg!(windows) {
            vec!["cmd.exe", "/Q"]
        } else {
            vec!["/bin/sh"]
        };
        let create_body = serde_json::json!({
            "projectId": "project-browser-test",
            "runtimeLocationId": "location-test",
            "command": command,
            "cols": 100,
            "rows": 30,
            "modeTags": ["cli-native"],
            "tags": ["surface:browser"]
        });
        let response = app
            .clone()
            .oneshot(request(
                "POST",
                "/app/v3/api/device/terminal/sessions",
                Body::from(create_body.to_string()),
                "user-a",
            ))
            .await
            .expect("create response");
        assert_eq!(StatusCode::CREATED, response.status());
        let body: serde_json::Value = serde_json::from_slice(
            &response
                .into_body()
                .collect()
                .await
                .expect("body")
                .to_bytes(),
        )
        .expect("json body");
        assert!(body["data"]["item"].get("workingDirectory").is_none());
        assert!(body["data"]["item"].get("authority").is_none());
        assert!(
            !body
                .to_string()
                .contains(root.root.to_string_lossy().as_ref()),
            "project root must not be returned by the terminal app API"
        );
        assert_eq!(
            *requests.lock().expect("read project terminal requests"),
            vec![ProjectTerminalExecutionRequest {
                tenant_id: "100001".to_owned(),
                organization_id: Some("0".to_owned()),
                subject_id: "user-a".to_owned(),
                project_id: "project-browser-test".to_owned(),
                runtime_location_id: "location-test".to_owned(),
            }]
        );
        let replay_payload = body["data"]["item"]["replayEntry"]["payload"]
            .as_str()
            .expect("replay payload");
        assert!(
            !replay_payload.contains("workingDirectory"),
            "project root must not be retained in project terminal replay state"
        );
        let session_id = body["data"]["item"]["sessionId"]
            .as_str()
            .expect("session id")
            .to_owned();

        let foreign = app
            .clone()
            .oneshot(request(
                "POST",
                &format!("/app/v3/api/device/terminal/sessions/{session_id}/resize"),
                Body::from(r#"{"cols":120,"rows":40}"#),
                "user-b",
            ))
            .await
            .expect("foreign response");
        assert_eq!(StatusCode::FORBIDDEN, foreign.status());

        let resize = app
            .clone()
            .oneshot(request(
                "POST",
                &format!("/app/v3/api/device/terminal/sessions/{session_id}/resize"),
                Body::from(r#"{"cols":120,"rows":40}"#),
                "user-a",
            ))
            .await
            .expect("resize response");
        assert_eq!(StatusCode::OK, resize.status());

        let input = if cfg!(windows) {
            "echo sdkwork-terminal\r\n"
        } else {
            "echo sdkwork-terminal\n"
        };
        let input_response = app
            .clone()
            .oneshot(request(
                "POST",
                &format!("/app/v3/api/device/terminal/sessions/{session_id}/input"),
                Body::from(serde_json::json!({ "input": input }).to_string()),
                "user-a",
            ))
            .await
            .expect("input response");
        assert_eq!(StatusCode::OK, input_response.status());

        let terminate = app
            .oneshot(request(
                "POST",
                &format!("/app/v3/api/device/terminal/sessions/{session_id}/terminate"),
                Body::empty(),
                "user-a",
            ))
            .await
            .expect("terminate response");
        assert_eq!(StatusCode::OK, terminate.status());
    }

    #[tokio::test]
    async fn project_terminal_create_rejects_client_selected_directory_and_requires_location_id() {
        let root = TestDirectory::new();
        let requests = Arc::new(Mutex::new(Vec::new()));
        let state = TerminalAppState::with_project_execution_resolver(
            Arc::new(RuntimeNodeHost::new_default().expect("terminal app state")),
            Arc::new(RecordingProjectExecutionResolver {
                root: root.root.clone(),
                requests: requests.clone(),
            }),
        );
        let app = build_terminal_app_api_router().with_state(state);
        let command = if cfg!(windows) {
            vec!["cmd.exe", "/Q"]
        } else {
            vec!["/bin/sh"]
        };

        let injected_directory = app
            .clone()
            .oneshot(request(
                "POST",
                "/app/v3/api/device/terminal/sessions",
                Body::from(
                    serde_json::json!({
                        "projectId": "project-browser-test",
                        "runtimeLocationId": "location-test",
                        "workingDirectory": "C:\\\\untrusted",
                        "command": command.clone(),
                    })
                    .to_string(),
                ),
                "user-a",
            ))
            .await
            .expect("directory injection response");
        assert_eq!(StatusCode::BAD_REQUEST, injected_directory.status());

        let missing_location = app
            .oneshot(request(
                "POST",
                "/app/v3/api/device/terminal/sessions",
                Body::from(
                    serde_json::json!({
                        "projectId": "project-browser-test",
                        "command": command,
                    })
                    .to_string(),
                ),
                "user-a",
            ))
            .await
            .expect("missing location response");
        assert_eq!(StatusCode::BAD_REQUEST, missing_location.status());
        assert!(
            requests
                .lock()
                .expect("read project terminal requests")
                .is_empty(),
            "invalid caller input must not reach the resolver"
        );
    }

    #[tokio::test]
    async fn default_terminal_state_fails_closed_without_project_execution_resolver() {
        let state = TerminalAppState::new_default().expect("terminal app state");
        let app = build_terminal_app_api_router().with_state(state);
        let command = if cfg!(windows) {
            vec!["cmd.exe", "/Q"]
        } else {
            vec!["/bin/sh"]
        };
        let response = app
            .oneshot(request(
                "POST",
                "/app/v3/api/device/terminal/sessions",
                Body::from(
                    serde_json::json!({
                        "projectId": "project-browser-test",
                        "runtimeLocationId": "location-test",
                        "command": command,
                    })
                    .to_string(),
                ),
                "user-a",
            ))
            .await
            .expect("deny response");
        assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    }

    #[test]
    fn public_terminal_routes_are_dual_token_app_routes_without_internal_rate_tiers() {
        for route in manifest::TERMINAL_APP_API_ROUTES {
            assert!(route.path.starts_with(TERMINAL_APP_API_PREFIX));
            assert_eq!(route.auth, sdkwork_web_contract::RouteAuth::DualToken);
            assert_eq!(route.rate_limit_tier, None);
        }
    }
}
