use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use http_body_util::BodyExt;
use sdkwork_terminal_runtime_node::{
    create_runtime_node_router, RemoteRuntimeSessionCreateRequest, RuntimeNodeHost,
    RuntimeNodeStreamEvent,
};
use sdkwork_terminal_shell_integration::build_local_shell_launch_command;
use std::{
    sync::{mpsc::Receiver, Arc},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio_stream::StreamExt;
use tower::ServiceExt;

fn interactive_command() -> Vec<String> {
    if cfg!(windows) {
        let command = build_local_shell_launch_command("powershell").unwrap();
        let mut tokens = vec![command.program];
        tokens.extend(command.args);
        tokens
    } else {
        vec!["/bin/sh".into()]
    }
}

fn echo_input(token: &str) -> String {
    if cfg!(windows) {
        format!("Write-Output '{token}'\r\n")
    } else {
        format!("echo {token}\r\n")
    }
}

fn split_enter_command() -> (&'static str, &'static str) {
    if cfg!(windows) {
        (
            "Write-Output ('sdk'+'work'+'-runtime-http-split-enter')",
            "sdkwork-runtime-http-split-enter",
        )
    } else {
        (
            "printf '%s%s%s\\n' sdk work -runtime-http-split-enter",
            "sdkwork-runtime-http-split-enter",
        )
    }
}

fn backspace_edit_command() -> (&'static str, &'static str, &'static str) {
    (
        "echo sdkwork-runtime-http-backspace-FAIL",
        "\u{7f}\u{7f}\u{7f}\u{7f}PASS\r",
        "sdkwork-runtime-http-backspace-PASS",
    )
}

fn recv_until<F>(
    receiver: &Receiver<RuntimeNodeStreamEvent>,
    timeout: Duration,
    mut predicate: F,
) -> Vec<RuntimeNodeStreamEvent>
where
    F: FnMut(&[RuntimeNodeStreamEvent]) -> bool,
{
    let deadline = std::time::Instant::now() + timeout;
    let mut events = Vec::new();

    while std::time::Instant::now() < deadline {
        match receiver.recv_timeout(Duration::from_millis(250)) {
            Ok(event) => {
                events.push(event);
                if predicate(&events) {
                    break;
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    events
}

fn replay_body_shell_ready(body: &serde_json::Value) -> bool {
    if cfg!(windows) {
        body["entries"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .any(|entry| {
                entry["payload"]
                    .as_str()
                    .unwrap_or("")
                    .contains("PowerShell")
                    || entry["payload"].as_str().unwrap_or("").contains("PS ")
            })
    } else {
        true
    }
}

async fn send_json_request(
    app: &axum::Router,
    method: Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> axum::response::Response {
    let request = Request::builder()
        .method(method)
        .uri(path)
        .header(header::ACCEPT, "application/json")
        .header(header::CONTENT_TYPE, "application/json")
        .body(match body {
            Some(value) => Body::from(value.to_string()),
            None => Body::empty(),
        })
        .unwrap();

    app.clone().oneshot(request).await.unwrap()
}

async fn read_json_body(response: axum::response::Response) -> serde_json::Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

async fn wait_for_replay_payload(
    app: &axum::Router,
    session_id: &str,
    predicate: impl Fn(&serde_json::Value) -> bool,
) -> serde_json::Value {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(10);

    loop {
        let response = send_json_request(
            app,
            Method::GET,
            &format!("/terminal/api/v1/replays?sessionId={session_id}&limit=256"),
            None,
        )
        .await;
        let body = read_json_body(response).await;
        if predicate(&body) {
            return body;
        }

        if tokio::time::Instant::now() >= deadline {
            panic!("timed out waiting for replay predicate: {body}");
        }

        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}

fn replay_body_output(body: &serde_json::Value) -> String {
    body["entries"]
        .as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .filter_map(|entry| entry["payload"].as_str())
        .collect::<Vec<_>>()
        .join("")
}

#[tokio::test(flavor = "multi_thread")]
async fn runtime_node_router_exposes_public_api_session_lifecycle() {
    let host = Arc::new(RuntimeNodeHost::new_default().unwrap());
    let app = create_runtime_node_router(Arc::clone(&host));
    let token = format!(
        "sdkwork-runtime-http-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );

    let create_response = send_json_request(
        &app,
        Method::POST,
        "/terminal/api/v1/sessions",
        Some(
            serde_json::to_value(RemoteRuntimeSessionCreateRequest {
                workspace_id: "workspace-runtime-http".into(),
                target: "remote-runtime".into(),
                authority: "runtime://edge-node-http".into(),
                command: interactive_command(),
                working_directory: None,
                cols: Some(132),
                rows: Some(36),
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:remote-runtime".into()],
            })
            .unwrap(),
        ),
    )
    .await;
    assert_eq!(create_response.status(), StatusCode::OK);
    let created = read_json_body(create_response).await;
    let session_id = created["sessionId"].as_str().unwrap().to_string();

    let _ = wait_for_replay_payload(&app, &session_id, replay_body_shell_ready).await;

    let index_response =
        send_json_request(&app, Method::GET, "/terminal/api/v1/sessions", None).await;
    assert_eq!(index_response.status(), StatusCode::OK);
    let index = read_json_body(index_response).await;
    assert!(index["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .any(|session| session["sessionId"] == session_id));

    let input_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/input"),
        Some(serde_json::json!({
            "input": echo_input(&token),
        })),
    )
    .await;
    assert_eq!(input_response.status(), StatusCode::OK);
    let input = read_json_body(input_response).await;
    assert!(input["acceptedBytes"].as_u64().unwrap() > 0);

    let resize_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/resize"),
        Some(serde_json::json!({
            "cols": 140,
            "rows": 40,
        })),
    )
    .await;
    assert_eq!(resize_response.status(), StatusCode::OK);
    let resized = read_json_body(resize_response).await;
    assert_eq!(resized["cols"], 140);
    assert_eq!(resized["rows"], 40);

    let replay_with_output = wait_for_replay_payload(&app, &session_id, |body| {
        body["entries"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .any(|entry| entry["payload"].as_str().unwrap_or("").contains(&token))
    })
    .await;
    assert!(replay_with_output["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["kind"] == "state"));

    let terminate_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/terminate"),
        None,
    )
    .await;
    assert_eq!(terminate_response.status(), StatusCode::OK);
    let terminated = read_json_body(terminate_response).await;
    assert!(matches!(
        terminated["state"].as_str(),
        Some("Stopping") | Some("Exited")
    ));

    let replay_with_exit = wait_for_replay_payload(&app, &session_id, |body| {
        body["entries"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .any(|entry| entry["kind"] == "exit")
    })
    .await;
    assert!(replay_with_exit["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["payload"].as_str().unwrap_or("").contains(&token)));
}

#[tokio::test(flavor = "multi_thread")]
async fn runtime_node_router_normalizes_windows_powershell_prompt() {
    if !cfg!(windows) {
        return;
    }

    let host = Arc::new(RuntimeNodeHost::new_default().unwrap());
    let app = create_runtime_node_router(host);

    let create_response = send_json_request(
        &app,
        Method::POST,
        "/terminal/api/v1/sessions",
        Some(serde_json::json!({
            "workspaceId": "workspace-runtime-http-prompt",
            "target": "remote-runtime",
            "authority": "runtime://edge-node-http-prompt",
            "command": interactive_command(),
            "cols": 132,
            "rows": 36,
            "modeTags": ["cli-native"],
            "tags": ["resource:remote-runtime"]
        })),
    )
    .await;
    assert_eq!(create_response.status(), StatusCode::OK);
    let created = read_json_body(create_response).await;
    let session_id = created["sessionId"].as_str().unwrap().to_string();

    let replay = wait_for_replay_payload(&app, &session_id, |body| {
        replay_body_output(body).contains("PS ")
    })
    .await;
    let output = replay_body_output(&replay);

    assert!(output.contains("PS "));
    assert!(!output.contains("Microsoft.PowerShell.Core"));
    assert!(!output.contains("FileSystem::"));
}

#[tokio::test(flavor = "multi_thread")]
async fn runtime_node_router_streams_sse_attach_events() {
    let host = Arc::new(RuntimeNodeHost::new_default().unwrap());
    let app = create_runtime_node_router(Arc::clone(&host));
    let token = format!(
        "sdkwork-runtime-sse-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );

    let create_response = send_json_request(
        &app,
        Method::POST,
        "/terminal/api/v1/sessions",
        Some(serde_json::json!({
            "workspaceId": "workspace-runtime-sse",
            "target": "remote-runtime",
            "authority": "runtime://edge-node-sse",
            "command": interactive_command(),
            "modeTags": ["cli-native"],
            "tags": ["resource:remote-runtime"]
        })),
    )
    .await;
    let created = read_json_body(create_response).await;
    let session_id = created["sessionId"].as_str().unwrap().to_string();

    let _ = wait_for_replay_payload(&app, &session_id, replay_body_shell_ready).await;

    let attach_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/terminal/stream/v1/attach?sessionId={session_id}"))
                .header(header::ACCEPT, "text/event-stream")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(attach_response.status(), StatusCode::OK);
    assert!(attach_response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .starts_with("text/event-stream"));

    let output_receiver = host.subscribe_session_events(&session_id).unwrap();
    let sse_token = token.clone();
    let body_reader = tokio::spawn(async move {
        let mut stream = attach_response.into_body().into_data_stream();
        let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
        let mut buffer = String::new();
        let mut frames = Vec::new();

        while tokio::time::Instant::now() < deadline {
            match tokio::time::timeout(Duration::from_millis(500), stream.next()).await {
                Ok(Some(Ok(chunk))) => {
                    buffer.push_str(&String::from_utf8_lossy(&chunk));
                    while let Some(frame_end) = buffer.find("\n\n") {
                        let frame = buffer[..frame_end].to_string();
                        buffer = buffer[(frame_end + 2)..].to_string();
                        if frame.trim().is_empty() {
                            continue;
                        }
                        frames.push(frame);
                        let has_output = frames.iter().any(|item| {
                            item.contains("event: session.output") && item.contains(&sse_token)
                        });
                        let has_exit = frames
                            .iter()
                            .any(|item| item.contains("event: session.exit"));
                        if has_output && has_exit {
                            return frames;
                        }
                    }
                }
                Ok(Some(Err(error))) => panic!("failed to read sse chunk: {error}"),
                Ok(None) => break,
                Err(_) => {}
            }
        }

        frames
    });

    let input_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/input"),
        Some(serde_json::json!({
            "input": echo_input(&token),
        })),
    )
    .await;
    assert_eq!(input_response.status(), StatusCode::OK);

    let output_events = recv_until(&output_receiver, Duration::from_secs(10), |events| {
        events.iter().any(|event| match event {
            RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(&token),
            _ => false,
        })
    });
    assert!(output_events.iter().any(|event| match event {
        RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(&token),
        _ => false,
    }));

    let terminate_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/terminate"),
        None,
    )
    .await;
    assert_eq!(terminate_response.status(), StatusCode::OK);

    let frames = body_reader.await.unwrap();
    assert!(frames
        .iter()
        .any(|frame| frame.contains("event: session.output") && frame.contains(&token)));
    assert!(frames
        .iter()
        .any(|frame| frame.contains("event: session.exit")));
}

#[tokio::test(flavor = "multi_thread")]
async fn runtime_node_router_executes_command_when_enter_is_sent_separately() {
    let host = Arc::new(RuntimeNodeHost::new_default().unwrap());
    let app = create_runtime_node_router(Arc::clone(&host));
    let (command, token) = split_enter_command();

    let create_response = send_json_request(
        &app,
        Method::POST,
        "/terminal/api/v1/sessions",
        Some(serde_json::json!({
            "workspaceId": "workspace-runtime-http-split-enter",
            "target": "remote-runtime",
            "authority": "runtime://edge-node-http-split-enter",
            "command": interactive_command(),
            "cols": 132,
            "rows": 36,
            "modeTags": ["cli-native"],
            "tags": ["resource:remote-runtime"]
        })),
    )
    .await;
    assert_eq!(create_response.status(), StatusCode::OK);
    let created = read_json_body(create_response).await;
    let session_id = created["sessionId"].as_str().unwrap().to_string();

    let _ = wait_for_replay_payload(&app, &session_id, replay_body_shell_ready).await;

    let command_input_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/input"),
        Some(serde_json::json!({
            "input": command,
        })),
    )
    .await;
    assert_eq!(command_input_response.status(), StatusCode::OK);
    let command_input = read_json_body(command_input_response).await;
    assert!(command_input["acceptedBytes"].as_u64().unwrap() > 0);

    let enter_input_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/input"),
        Some(serde_json::json!({
            "input": "\r",
        })),
    )
    .await;
    assert_eq!(enter_input_response.status(), StatusCode::OK);
    let enter_input = read_json_body(enter_input_response).await;
    assert!(enter_input["acceptedBytes"].as_u64().unwrap() > 0);

    let replay_with_output = wait_for_replay_payload(&app, &session_id, |body| {
        body["entries"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .any(|entry| entry["payload"].as_str().unwrap_or("").contains(token))
    })
    .await;
    assert!(replay_with_output["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["payload"].as_str().unwrap_or("").contains(token)));

    let terminate_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/terminate"),
        None,
    )
    .await;
    assert_eq!(terminate_response.status(), StatusCode::OK);
}

#[tokio::test(flavor = "multi_thread")]
async fn runtime_node_router_applies_backspace_edits_before_enter() {
    let host = Arc::new(RuntimeNodeHost::new_default().unwrap());
    let app = create_runtime_node_router(Arc::clone(&host));
    let (command, correction, token) = backspace_edit_command();

    let create_response = send_json_request(
        &app,
        Method::POST,
        "/terminal/api/v1/sessions",
        Some(serde_json::json!({
            "workspaceId": "workspace-runtime-http-backspace",
            "target": "remote-runtime",
            "authority": "runtime://edge-node-http-backspace",
            "command": interactive_command(),
            "cols": 132,
            "rows": 36,
            "modeTags": ["cli-native"],
            "tags": ["resource:remote-runtime"]
        })),
    )
    .await;
    assert_eq!(create_response.status(), StatusCode::OK);
    let created = read_json_body(create_response).await;
    let session_id = created["sessionId"].as_str().unwrap().to_string();

    let _ = wait_for_replay_payload(&app, &session_id, replay_body_shell_ready).await;

    let command_input_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/input"),
        Some(serde_json::json!({
            "input": command,
        })),
    )
    .await;
    assert_eq!(command_input_response.status(), StatusCode::OK);
    let command_input = read_json_body(command_input_response).await;
    assert!(command_input["acceptedBytes"].as_u64().unwrap() > 0);

    let correction_input_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/input"),
        Some(serde_json::json!({
            "input": correction,
        })),
    )
    .await;
    assert_eq!(correction_input_response.status(), StatusCode::OK);
    let correction_input = read_json_body(correction_input_response).await;
    assert!(correction_input["acceptedBytes"].as_u64().unwrap() > 0);

    let replay_with_output = wait_for_replay_payload(&app, &session_id, |body| {
        body["entries"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .any(|entry| entry["payload"].as_str().unwrap_or("").contains(token))
    })
    .await;
    assert!(replay_with_output["entries"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["payload"].as_str().unwrap_or("").contains(token)));

    let terminate_response = send_json_request(
        &app,
        Method::POST,
        &format!("/terminal/api/v1/sessions/{session_id}/terminate"),
        None,
    )
    .await;
    assert_eq!(terminate_response.status(), StatusCode::OK);
}

#[tokio::test(flavor = "multi_thread")]
async fn runtime_node_router_maps_missing_session_to_contract_error() {
    let host = Arc::new(RuntimeNodeHost::new_default().unwrap());
    let app = create_runtime_node_router(host);

    let response = send_json_request(
        &app,
        Method::GET,
        "/terminal/api/v1/replays?sessionId=session-missing&limit=16",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let payload = read_json_body(response).await;

    assert_eq!(payload["code"], "session_not_found");
    assert!(payload["message"]
        .as_str()
        .unwrap_or("")
        .contains("session not found"));
    assert!(payload["traceId"]
        .as_str()
        .unwrap_or("")
        .starts_with("runtime-node-"));
    assert_eq!(payload["retryable"], false);
    assert!(payload["details"].is_object());
}
