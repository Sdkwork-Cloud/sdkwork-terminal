use crate::{
    RemoteRuntimeSessionCreateRequest, RuntimeNodeHost, RuntimeNodeHostError,
    RuntimeNodeReplayEntrySnapshot, RuntimeNodeSessionIndexSnapshot,
    RuntimeNodeSessionInputSnapshot, RuntimeNodeSessionReplaySnapshot,
    RuntimeNodeSessionResizeSnapshot, RuntimeNodeSessionTerminateSnapshot, RuntimeNodeStreamEvent,
};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{
        sse::{Event, Sse},
        IntoResponse, Response,
    },
    routing::{get, post},
    Json, Router,
};
use sdkwork_terminal_pty_runtime::LocalShellExecutionError;
use sdkwork_terminal_session_runtime::SessionRuntimeError;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    convert::Infallible,
    sync::Arc,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

#[derive(Clone)]
struct RuntimeNodeHttpState {
    host: Arc<RuntimeNodeHost>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeNodeHttpErrorBody {
    code: String,
    message: String,
    trace_id: String,
    retryable: bool,
    details: serde_json::Value,
}

struct RuntimeNodeHttpError {
    status: StatusCode,
    body: RuntimeNodeHttpErrorBody,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeReplayQuery {
    session_id: Option<String>,
    from_cursor: Option<String>,
    limit: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStreamAttachQuery {
    session_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInputBody {
    input: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInputBytesBody {
    input_bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeResizeBody {
    cols: u16,
    rows: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStreamEventPayload {
    session_id: String,
    next_cursor: String,
    entry: RuntimeNodeReplayEntrySnapshot,
}

pub fn create_runtime_node_router(host: Arc<RuntimeNodeHost>) -> Router {
    Router::new()
        .route(
            "/terminal/api/v1/sessions",
            get(list_sessions).post(create_session),
        )
        .route("/terminal/api/v1/replays", get(read_replay))
        .route(
            "/terminal/api/v1/sessions/:session_id/input",
            post(write_input),
        )
        .route(
            "/terminal/api/v1/sessions/:session_id/input-bytes",
            post(write_input_bytes),
        )
        .route(
            "/terminal/api/v1/sessions/:session_id/resize",
            post(resize_session),
        )
        .route(
            "/terminal/api/v1/sessions/:session_id/terminate",
            post(terminate_session),
        )
        .route("/terminal/stream/v1/attach", get(attach_session_stream))
        .with_state(RuntimeNodeHttpState { host })
}

async fn list_sessions(
    State(state): State<RuntimeNodeHttpState>,
) -> Result<Json<RuntimeNodeSessionIndexSnapshot>, RuntimeNodeHttpError> {
    Ok(Json(
        state
            .host
            .session_index()
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn create_session(
    State(state): State<RuntimeNodeHttpState>,
    body: Bytes,
) -> Result<Json<crate::RuntimeNodeInteractiveSessionCreateSnapshot>, RuntimeNodeHttpError> {
    let request = parse_json_body::<RemoteRuntimeSessionCreateRequest>(&body, "session create")?;
    Ok(Json(
        state
            .host
            .create_remote_runtime_session(request)
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn read_replay(
    State(state): State<RuntimeNodeHttpState>,
    Query(query): Query<RuntimeReplayQuery>,
) -> Result<Json<RuntimeNodeSessionReplaySnapshot>, RuntimeNodeHttpError> {
    let session_id = required_query_string(query.session_id, "sessionId")?;
    let limit = match query.limit {
        Some(value) => value.parse::<usize>().map_err(|_| {
            RuntimeNodeHttpError::bad_request(
                "invalid_limit",
                "limit must be a positive integer",
                serde_json::json!({
                    "field": "limit",
                    "value": value,
                }),
            )
        })?,
        None => 128,
    }
    .max(1);

    Ok(Json(
        state
            .host
            .session_replay(&session_id, query.from_cursor.as_deref(), limit)
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn write_input(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Json<RuntimeNodeSessionInputSnapshot>, RuntimeNodeHttpError> {
    let request = parse_json_body::<RuntimeInputBody>(&body, "session input")?;
    Ok(Json(
        state
            .host
            .write_session_input(&session_id, &request.input)
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn write_input_bytes(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Json<RuntimeNodeSessionInputSnapshot>, RuntimeNodeHttpError> {
    let request = parse_json_body::<RuntimeInputBytesBody>(&body, "session input bytes")?;
    Ok(Json(
        state
            .host
            .write_session_input_bytes(&session_id, &request.input_bytes)
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn resize_session(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Json<RuntimeNodeSessionResizeSnapshot>, RuntimeNodeHttpError> {
    let request = parse_json_body::<RuntimeResizeBody>(&body, "session resize")?;
    Ok(Json(
        state
            .host
            .resize_session(&session_id, request.cols, request.rows)
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn terminate_session(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
) -> Result<Json<RuntimeNodeSessionTerminateSnapshot>, RuntimeNodeHttpError> {
    Ok(Json(
        state
            .host
            .terminate_session(&session_id)
            .map_err(RuntimeNodeHttpError::from)?,
    ))
}

async fn attach_session_stream(
    State(state): State<RuntimeNodeHttpState>,
    Query(query): Query<RuntimeStreamAttachQuery>,
) -> Result<Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>>, RuntimeNodeHttpError>
{
    let session_id = required_query_string(query.session_id, "sessionId")?;
    let receiver = state
        .host
        .subscribe_session_events(&session_id)
        .map_err(RuntimeNodeHttpError::from)?;
    let (sender, runtime_receiver) = mpsc::channel(64);

    thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            if sender.blocking_send(event).is_err() {
                break;
            }
        }
    });

    let stream = ReceiverStream::new(runtime_receiver).map(|event| {
        let (event_name, payload) = map_stream_event(event);
        let data =
            serde_json::to_string(&payload).expect("runtime-node stream payload serialization");
        Ok::<Event, Infallible>(Event::default().event(event_name).data(data))
    });

    Ok(Sse::new(stream))
}

fn parse_json_body<T>(body: &[u8], label: &'static str) -> Result<T, RuntimeNodeHttpError>
where
    T: DeserializeOwned,
{
    serde_json::from_slice::<T>(body).map_err(|error| {
        RuntimeNodeHttpError::bad_request(
            "invalid_request_body",
            &format!("{label} body is invalid json"),
            serde_json::json!({
                "label": label,
                "reason": error.to_string(),
            }),
        )
    })
}

fn required_query_string(
    value: Option<String>,
    field: &'static str,
) -> Result<String, RuntimeNodeHttpError> {
    let Some(value) = value.map(|item| item.trim().to_string()) else {
        return Err(RuntimeNodeHttpError::bad_request(
            "missing_query_parameter",
            &format!("{field} is required"),
            serde_json::json!({
                "field": field,
            }),
        ));
    };

    if value.is_empty() {
        return Err(RuntimeNodeHttpError::bad_request(
            "missing_query_parameter",
            &format!("{field} is required"),
            serde_json::json!({
                "field": field,
            }),
        ));
    }

    Ok(value)
}

fn map_stream_event(event: RuntimeNodeStreamEvent) -> (&'static str, RuntimeStreamEventPayload) {
    match event {
        RuntimeNodeStreamEvent::Output {
            session_id,
            next_cursor,
            entry,
        } => (
            "session.output",
            RuntimeStreamEventPayload {
                session_id,
                next_cursor,
                entry,
            },
        ),
        RuntimeNodeStreamEvent::Warning {
            session_id,
            next_cursor,
            entry,
        } => (
            "session.warning",
            RuntimeStreamEventPayload {
                session_id,
                next_cursor,
                entry,
            },
        ),
        RuntimeNodeStreamEvent::Exit {
            session_id,
            next_cursor,
            entry,
        } => (
            "session.exit",
            RuntimeStreamEventPayload {
                session_id,
                next_cursor,
                entry,
            },
        ),
    }
}

impl RuntimeNodeHttpError {
    fn bad_request(code: &str, message: &str, details: serde_json::Value) -> Self {
        Self::new(StatusCode::BAD_REQUEST, code, message, false, details)
    }

    fn new(
        status: StatusCode,
        code: &str,
        message: &str,
        retryable: bool,
        details: serde_json::Value,
    ) -> Self {
        Self {
            status,
            body: RuntimeNodeHttpErrorBody {
                code: code.into(),
                message: message.into(),
                trace_id: next_trace_id(),
                retryable,
                details,
            },
        }
    }
}

impl From<RuntimeNodeHostError> for RuntimeNodeHttpError {
    fn from(value: RuntimeNodeHostError) -> Self {
        match value {
            RuntimeNodeHostError::InvalidRequest(message) => Self::new(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                &message,
                false,
                serde_json::json!({
                    "category": "invalid-request",
                }),
            ),
            RuntimeNodeHostError::Runtime(error) => match error {
                SessionRuntimeError::SessionNotFound(session_id) => Self::new(
                    StatusCode::NOT_FOUND,
                    "session_not_found",
                    &format!("session not found: {session_id}"),
                    false,
                    serde_json::json!({
                        "sessionId": session_id,
                    }),
                ),
                SessionRuntimeError::AttachmentNotFound(attachment_id) => Self::new(
                    StatusCode::NOT_FOUND,
                    "attachment_not_found",
                    &format!("attachment not found: {attachment_id}"),
                    false,
                    serde_json::json!({
                        "attachmentId": attachment_id,
                    }),
                ),
                SessionRuntimeError::InvalidSessionState(message) => Self::new(
                    StatusCode::CONFLICT,
                    "invalid_session_state",
                    &message,
                    false,
                    serde_json::json!({
                        "category": "session-state",
                    }),
                ),
                SessionRuntimeError::Sqlite(error) => Self::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "runtime_storage_error",
                    &format!("runtime storage error: {error}"),
                    true,
                    serde_json::json!({
                        "category": "sqlite",
                    }),
                ),
                SessionRuntimeError::Serde(error) => Self::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "runtime_serde_error",
                    &format!("runtime serde error: {error}"),
                    false,
                    serde_json::json!({
                        "category": "serde",
                    }),
                ),
            },
            RuntimeNodeHostError::Pty(error) => match error {
                LocalShellExecutionError::SessionNotFound(session_id) => Self::new(
                    StatusCode::NOT_FOUND,
                    "session_not_found",
                    &format!("session not found: {session_id}"),
                    false,
                    serde_json::json!({
                        "sessionId": session_id,
                    }),
                ),
                LocalShellExecutionError::InvalidCommand(message)
                | LocalShellExecutionError::WorkingDirectory(message) => Self::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_runtime_command",
                    &message,
                    false,
                    serde_json::json!({
                        "category": "runtime-command",
                    }),
                ),
                LocalShellExecutionError::DuplicateSessionId(session_id) => Self::new(
                    StatusCode::CONFLICT,
                    "duplicate_session_id",
                    &format!("duplicate session id: {session_id}"),
                    false,
                    serde_json::json!({
                        "sessionId": session_id,
                    }),
                ),
                other => Self::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "runtime_pty_error",
                    &format!("runtime pty error: {other}"),
                    true,
                    serde_json::json!({
                        "category": "pty",
                    }),
                ),
            },
            RuntimeNodeHostError::Bootstrap(message) => Self::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "runtime_bootstrap_error",
                &message,
                true,
                serde_json::json!({
                    "category": "bootstrap",
                }),
            ),
            RuntimeNodeHostError::Serde(error) => Self::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "runtime_serde_error",
                &format!("runtime serde error: {error}"),
                false,
                serde_json::json!({
                    "category": "serde",
                }),
            ),
            RuntimeNodeHostError::Poisoned(name) => Self::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "runtime_lock_error",
                &format!("runtime lock error: {name}"),
                true,
                serde_json::json!({
                    "category": "lock",
                    "name": name,
                }),
            ),
        }
    }
}

impl IntoResponse for RuntimeNodeHttpError {
    fn into_response(self) -> Response {
        (self.status, Json(self.body)).into_response()
    }
}

fn next_trace_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("runtime-node-{nanos}")
}
