use crate::http_envelope::{success_item, ApiError, RuntimeNodeHealthPayload};
use crate::{
    RemoteRuntimeSessionCreateRequest, RuntimeNodeHost,
    RuntimeNodeReplayEntrySnapshot, RuntimeNodeSessionInputSnapshot,
    RuntimeNodeSessionReplaySnapshot, RuntimeNodeSessionResizeSnapshot,
    RuntimeNodeSessionTerminateSnapshot, RuntimeNodeStreamEvent,
};
use axum::{
    body::Bytes,
    extract::{Path, Query, Request, State},
    http::{header, StatusCode},
    middleware::{self, Next},
    response::{
        sse::{Event, Sse},
        IntoResponse, Response,
    },
    routing::{get, post},
    Router,
};
use sdkwork_terminal_observability::{
    current_health_status, render_prometheus_text, set_health_status, with_registry, HealthStatus,
    DEFAULT_HTTP_LATENCY_BUCKETS,
};
use sdkwork_utils_rust::http_api::SdkWorkResultCode;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    convert::Infallible,
    sync::Arc,
    thread,
    time::Instant,
};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

const MAX_JSON_BODY_BYTES: usize = 1_048_576;
const MAX_INPUT_BYTES_BODY_BYTES: usize = 2_097_152;

#[derive(Clone)]
struct RuntimeNodeHttpState {
    host: Arc<RuntimeNodeHost>,
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

#[derive(Clone)]
struct RuntimeNodeAuthLayerState {
    bearer_token: Option<Arc<String>>,
}

pub fn create_runtime_node_router(host: Arc<RuntimeNodeHost>) -> Router {
    let protected = build_protected_router(host);
    Router::new()
        .route("/healthz", get(runtime_node_health))
        .route("/livez", get(runtime_node_livez))
        .route("/readyz", get(runtime_node_readiness))
        .route("/metrics", get(runtime_node_metrics))
        .merge(protected)
}

pub fn create_runtime_node_router_with_auth(
    host: Arc<RuntimeNodeHost>,
    auth_token: Option<String>,
) -> Router {
    let bearer_token = auth_token
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(Arc::new);
    let auth_layer = RuntimeNodeAuthLayerState { bearer_token };

    let protected = build_protected_router_with_auth(host, auth_layer);

    Router::new()
        .route("/healthz", get(runtime_node_health))
        .route("/livez", get(runtime_node_livez))
        .route("/readyz", get(runtime_node_readiness))
        .route("/metrics", get(runtime_node_metrics))
        .merge(protected)
}

fn protected_routes() -> Router<RuntimeNodeHttpState> {
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
}

fn build_protected_router(host: Arc<RuntimeNodeHost>) -> Router {
    protected_routes()
        .route_layer(middleware::from_fn(enforce_body_size_limit))
        .route_layer(middleware::from_fn(record_request_metrics))
        .with_state(RuntimeNodeHttpState { host })
}

fn build_protected_router_with_auth(
    host: Arc<RuntimeNodeHost>,
    auth_layer: RuntimeNodeAuthLayerState,
) -> Router {
    protected_routes()
        .route_layer(middleware::from_fn(enforce_body_size_limit))
        .route_layer(middleware::from_fn_with_state(
            auth_layer,
            enforce_runtime_node_auth,
        ))
        .route_layer(middleware::from_fn(record_request_metrics))
        .with_state(RuntimeNodeHttpState { host })
}

async fn runtime_node_health() -> Response {
    set_health_status(HealthStatus::Serving);
    with_registry(|registry| {
        registry
            .gauge(
                "runtime_node_health_status",
                "Runtime node health status (1=serving, 0=not serving)",
            )
            .set(HealthStatus::Serving.as_gauge_value() as i64);
    });
    success_item(RuntimeNodeHealthPayload {
        status: "ok",
        component: "sdkwork-terminal-runtime-node",
    })
}

async fn runtime_node_livez() -> Response {
    runtime_node_health().await
}

async fn runtime_node_readiness() -> Result<Response, ApiError> {
    let health = current_health_status();
    let is_ready = matches!(health, HealthStatus::Serving);
    if !is_ready {
        return Err(ApiError::platform(
            SdkWorkResultCode::ServiceUnavailable,
            "runtime node is not ready to serve traffic",
        ));
    }

    Ok(success_item(RuntimeNodeHealthPayload {
        status: "ready",
        component: "sdkwork-terminal-runtime-node",
    }))
}

async fn runtime_node_metrics() -> impl IntoResponse {
    let body = render_prometheus_text();
    (
        [(
            header::CONTENT_TYPE,
            "text/plain; version=0.0.4; charset=utf-8",
        )],
        body,
    )
}

async fn record_request_metrics(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let response = next.run(request).await;
    let duration = start.elapsed().as_secs_f64();

    with_registry(|registry| {
        registry
            .counter(
                "runtime_node_http_requests_total",
                "Total HTTP requests handled by the runtime node protected router",
            )
            .inc(1);
        registry
            .histogram(
                "runtime_node_http_request_duration_seconds",
                "HTTP request duration in seconds",
                DEFAULT_HTTP_LATENCY_BUCKETS,
            )
            .observe(duration);
    });

    response
}

async fn enforce_body_size_limit(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    if method == axum::http::Method::POST || method == axum::http::Method::PUT {
        let content_length = request
            .headers()
            .get(header::CONTENT_LENGTH)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<usize>().ok());

        let path = request.uri().path();
        let max_size = if path.contains("/input-bytes") {
            MAX_INPUT_BYTES_BODY_BYTES
        } else {
            MAX_JSON_BODY_BYTES
        };

        if let Some(length) = content_length {
            if length > max_size {
                return ApiError::platform(
                    SdkWorkResultCode::PayloadTooLarge,
                    format!(
                        "request body size {length} exceeds maximum allowed size {max_size}"
                    ),
                )
                .into_response();
            }
        }
    }

    next.run(request).await
}

async fn enforce_runtime_node_auth(
    State(auth): State<RuntimeNodeAuthLayerState>,
    request: Request,
    next: Next,
) -> Response {
    let Some(expected) = auth.bearer_token.as_ref() else {
        return ApiError::platform(
            SdkWorkResultCode::ServiceUnavailable,
            "runtime node auth token is not configured; server refuses unauthenticated access",
        )
        .into_response();
    };

    if runtime_node_request_is_authorized(&request, expected.as_str()) {
        return next.run(request).await;
    }

    ApiError::platform(
        SdkWorkResultCode::AuthenticationRequired,
        "missing or invalid runtime node bearer token",
    )
    .into_response()
}

fn runtime_node_request_is_authorized(request: &Request, expected: &str) -> bool {
    let presented = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|header_value| header_value.to_str().ok())
        .map(|text| text.strip_prefix("Bearer ").unwrap_or(text).trim());

    let Some(presented) = presented else {
        return false;
    };

    sdkwork_utils_rust::crypto::secure_compare(presented, expected)
}

async fn list_sessions(State(state): State<RuntimeNodeHttpState>) -> Result<Response, ApiError> {
    let snapshot = state.host.session_index().map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn create_session(
    State(state): State<RuntimeNodeHttpState>,
    body: Bytes,
) -> Result<Response, ApiError> {
    let request = parse_json_body::<RemoteRuntimeSessionCreateRequest>(&body, "session create")?;
    let snapshot = state
        .host
        .create_remote_runtime_session(request)
        .map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn read_replay(
    State(state): State<RuntimeNodeHttpState>,
    Query(query): Query<RuntimeReplayQuery>,
) -> Result<Response, ApiError> {
    let session_id = required_query_string(query.session_id, "sessionId")?;
    let limit = (match query.limit {
        Some(value) => value.parse::<usize>().map_err(|_| {
            ApiError::validation(format!("limit must be a positive integer: {value}"))
        })?,
        None => 128,
    })
    .clamp(1, 4096);

    let snapshot = state
        .host
        .session_replay(&session_id, query.from_cursor.as_deref(), limit)
        .map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn write_input(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    let request = parse_json_body::<RuntimeInputBody>(&body, "session input")?;
    let snapshot = state
        .host
        .write_session_input(&session_id, &request.input)
        .map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn write_input_bytes(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    let request = parse_json_body::<RuntimeInputBytesBody>(&body, "session input bytes")?;
    let snapshot = state
        .host
        .write_session_input_bytes(&session_id, &request.input_bytes)
        .map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn resize_session(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
    body: Bytes,
) -> Result<Response, ApiError> {
    let request = parse_json_body::<RuntimeResizeBody>(&body, "session resize")?;
    let snapshot = state
        .host
        .resize_session(&session_id, request.cols, request.rows)
        .map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn terminate_session(
    State(state): State<RuntimeNodeHttpState>,
    Path(session_id): Path<String>,
) -> Result<Response, ApiError> {
    let snapshot = state
        .host
        .terminate_session(&session_id)
        .map_err(ApiError::from)?;
    Ok(success_item(snapshot))
}

async fn attach_session_stream(
    State(state): State<RuntimeNodeHttpState>,
    Query(query): Query<RuntimeStreamAttachQuery>,
) -> Result<Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let session_id = required_query_string(query.session_id, "sessionId")?;
    let (receiver, guard) = state
        .host
        .subscribe_session_events(&session_id)
        .map_err(ApiError::from)?;

    let (tx, rx) = mpsc::channel(256);

    thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            if tx.blocking_send(event).is_err() {
                break;
            }
        }
        drop(guard);
    });

    let stream = ReceiverStream::new(rx).map(|event| {
        let (event_name, payload) = map_stream_event(event);
        match serde_json::to_string(&payload) {
            Ok(data) => Ok::<Event, Infallible>(Event::default().event(event_name).data(data)),
            Err(error) => {
                eprintln!("runtime-node stream payload serialization failed: {error}");
                Ok::<Event, Infallible>(
                    Event::default()
                        .event("session.stream_error")
                        .data(serde_json::json!({"error": "serialization_failed"}).to_string()),
                )
            }
        }
    });

    Ok(Sse::new(stream))
}

fn parse_json_body<T>(body: &[u8], label: &'static str) -> Result<T, ApiError>
where
    T: DeserializeOwned,
{
    serde_json::from_slice::<T>(body).map_err(|error| {
        ApiError::validation(format!("{label} body is invalid json: {error}"))
    })
}

fn required_query_string(
    value: Option<String>,
    field: &'static str,
) -> Result<String, ApiError> {
    let Some(value) = value.map(|item| item.trim().to_string()) else {
        return Err(ApiError::validation(format!("{field} is required")));
    };

    if value.is_empty() {
        return Err(ApiError::validation(format!("{field} is required")));
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
