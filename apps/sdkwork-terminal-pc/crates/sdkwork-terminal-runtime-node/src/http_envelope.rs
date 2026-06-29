use axum::{
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sdkwork_terminal_pty_runtime::LocalShellExecutionError;
use sdkwork_terminal_session_runtime::SessionRuntimeError;
use sdkwork_utils_rust::http_api::{
    SdkWorkApiResponse, SdkWorkProblemDetail, SdkWorkResourceData, SdkWorkResultCode,
};
use sdkwork_utils_rust::id::uuid;
use serde::Serialize;

use crate::RuntimeNodeHostError;

const TRACE_HEADER: &str = "x-sdkwork-trace-id";

pub(crate) struct ApiError {
    status: StatusCode,
    problem: SdkWorkProblemDetail,
}

impl ApiError {
    pub(crate) fn platform(result_code: SdkWorkResultCode, detail: impl Into<String>) -> Self {
        let trace_id = uuid();
        let status = StatusCode::from_u16(result_code.http_status_code())
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        Self {
            status,
            problem: SdkWorkProblemDetail::platform(result_code, detail, trace_id),
        }
    }

    pub(crate) fn validation(detail: impl Into<String>) -> Self {
        Self::platform(SdkWorkResultCode::ValidationError, detail)
    }
}

impl From<RuntimeNodeHostError> for ApiError {
    fn from(value: RuntimeNodeHostError) -> Self {
        match value {
            RuntimeNodeHostError::InvalidRequest(message) => Self::validation(message),
            RuntimeNodeHostError::Runtime(error) => match error {
                SessionRuntimeError::SessionNotFound(session_id) => Self::platform(
                    SdkWorkResultCode::NotFound,
                    format!("session not found: {session_id}"),
                ),
                SessionRuntimeError::AttachmentNotFound(attachment_id) => Self::platform(
                    SdkWorkResultCode::NotFound,
                    format!("attachment not found: {attachment_id}"),
                ),
                SessionRuntimeError::InvalidSessionState(message) => {
                    Self::platform(SdkWorkResultCode::Conflict, message)
                }
                SessionRuntimeError::Sqlite(error) => Self::platform(
                    SdkWorkResultCode::InternalError,
                    format!("runtime storage error: {error}"),
                ),
                SessionRuntimeError::Serde(error) => Self::platform(
                    SdkWorkResultCode::InternalError,
                    format!("runtime serde error: {error}"),
                ),
            },
            RuntimeNodeHostError::Pty(error) => match error {
                LocalShellExecutionError::SessionNotFound(session_id) => Self::platform(
                    SdkWorkResultCode::NotFound,
                    format!("session not found: {session_id}"),
                ),
                LocalShellExecutionError::InvalidCommand(message)
                | LocalShellExecutionError::WorkingDirectory(message) => Self::validation(message),
                LocalShellExecutionError::DuplicateSessionId(session_id) => Self::platform(
                    SdkWorkResultCode::Conflict,
                    format!("duplicate session id: {session_id}"),
                ),
                other => Self::platform(
                    SdkWorkResultCode::InternalError,
                    format!("runtime pty error: {other}"),
                ),
            },
            RuntimeNodeHostError::Bootstrap(message) => {
                Self::platform(SdkWorkResultCode::InternalError, message)
            }
            RuntimeNodeHostError::Serde(error) => Self::platform(
                SdkWorkResultCode::InternalError,
                format!("runtime serde error: {error}"),
            ),
            RuntimeNodeHostError::Poisoned(name) => Self::platform(
                SdkWorkResultCode::InternalError,
                format!("runtime lock error: {name}"),
            ),
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
        if let Ok(value) = HeaderValue::from_str(&self.problem.trace_id) {
            headers.insert(header::HeaderName::from_static(TRACE_HEADER), value);
        }
        (self.status, headers, Json(self.problem)).into_response()
    }
}

pub(crate) fn success_item<T: Serialize>(item: T) -> Response {
    let trace_id = uuid();
    let body = SdkWorkApiResponse::success(SdkWorkResourceData { item }, trace_id.clone());
    let mut headers = HeaderMap::new();
    if let Ok(value) = HeaderValue::from_str(&trace_id) {
        headers.insert(header::HeaderName::from_static(TRACE_HEADER), value);
    }
    (StatusCode::OK, headers, Json(body)).into_response()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RuntimeNodeHealthPayload {
    pub status: &'static str,
    pub component: &'static str,
}
