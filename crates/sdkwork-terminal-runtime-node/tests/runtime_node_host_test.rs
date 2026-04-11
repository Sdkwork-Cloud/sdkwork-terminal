use sdkwork_terminal_runtime_node::{
    RemoteRuntimeSessionCreateRequest, RuntimeNodeHost, RuntimeNodeStreamEvent,
};
use std::{
    fs,
    path::PathBuf,
    sync::mpsc::Receiver,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

fn temp_db_path(name: &str) -> PathBuf {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();

    std::env::temp_dir().join(format!(
        "sdkwork-terminal-runtime-node-host-{name}-{unique}.db"
    ))
}

fn interactive_command() -> Vec<String> {
    if cfg!(windows) {
        vec!["powershell".into(), "-NoLogo".into()]
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
            "Write-Output ('sdk'+'work'+'-runtime-node-split-enter')",
            "sdkwork-runtime-node-split-enter",
        )
    } else {
        (
            "printf '%s%s%s\\n' sdk work -runtime-node-split-enter",
            "sdkwork-runtime-node-split-enter",
        )
    }
}

fn backspace_edit_command() -> (&'static str, &'static str, &'static str) {
    (
        "echo sdkwork-runtime-node-backspace-FAIL",
        "\u{7f}\u{7f}\u{7f}\u{7f}PASS\r",
        "sdkwork-runtime-node-backspace-PASS",
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

fn shell_ready(events: &[RuntimeNodeStreamEvent]) -> bool {
    if cfg!(windows) {
        events.iter().any(|event| match event {
            RuntimeNodeStreamEvent::Output { entry, .. } => {
                entry.payload.contains("PowerShell") || entry.payload.contains("PS ")
            }
            _ => false,
        })
    } else {
        true
    }
}

#[test]
fn runtime_node_host_creates_remote_runtime_session_and_streams_output_exit_events() {
    let host = RuntimeNodeHost::new_default().unwrap();
    let token = format!(
        "sdkwork-runtime-node-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );

    let created = host
        .create_remote_runtime_session(RemoteRuntimeSessionCreateRequest {
            workspace_id: "workspace-runtime-host".into(),
            target: "remote-runtime".into(),
            authority: "runtime://edge-node-a".into(),
            command: interactive_command(),
            working_directory: None,
            cols: Some(132),
            rows: Some(36),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:remote-runtime".into()],
        })
        .unwrap();
    let receiver = host.subscribe_session_events(&created.session_id).unwrap();

    assert_eq!(created.target, "remote-runtime");
    assert_eq!(created.state, "Running");
    assert!(!created.attachment_id.is_empty());

    let _ = recv_until(&receiver, Duration::from_secs(8), shell_ready);
    let input = echo_input(&token);
    let accepted = host
        .write_session_input(&created.session_id, &input)
        .unwrap();
    assert_eq!(accepted.accepted_bytes as usize, input.len());

    let output_events = recv_until(&receiver, Duration::from_secs(10), |events| {
        events.iter().any(|event| match event {
            RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(&token),
            _ => false,
        })
    });
    assert!(output_events.iter().any(|event| match event {
        RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(&token),
        _ => false,
    }));

    let stopping = host.terminate_session(&created.session_id).unwrap();
    assert!(matches!(stopping.state.as_str(), "Stopping" | "Exited"));

    let exit_events = recv_until(&receiver, Duration::from_secs(10), |events| {
        events
            .iter()
            .any(|event| matches!(event, RuntimeNodeStreamEvent::Exit { .. }))
    });
    assert!(exit_events
        .iter()
        .any(|event| matches!(event, RuntimeNodeStreamEvent::Exit { .. })));
}

#[test]
fn runtime_node_host_recovers_session_index_and_replay_after_rebuild() {
    let db_path = temp_db_path("recovery");
    let token = format!(
        "sdkwork-runtime-node-recovery-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );

    {
        let host = RuntimeNodeHost::new_with_sqlite_path(&db_path).unwrap();
        let created = host
            .create_remote_runtime_session(RemoteRuntimeSessionCreateRequest {
                workspace_id: "workspace-runtime-recovery".into(),
                target: "server-runtime-node".into(),
                authority: "runtime://node-b".into(),
                command: interactive_command(),
                working_directory: None,
                cols: Some(120),
                rows: Some(32),
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:server-runtime-node".into()],
            })
            .unwrap();
        let receiver = host.subscribe_session_events(&created.session_id).unwrap();

        let _ = recv_until(&receiver, Duration::from_secs(8), shell_ready);
        host.write_session_input(&created.session_id, &echo_input(&token))
            .unwrap();
        let output_events = recv_until(&receiver, Duration::from_secs(10), |events| {
            events.iter().any(|event| match event {
                RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(&token),
                _ => false,
            })
        });
        assert!(output_events.iter().any(|event| match event {
            RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(&token),
            _ => false,
        }));

        host.terminate_session(&created.session_id).unwrap();
        let exit_events = recv_until(&receiver, Duration::from_secs(10), |events| {
            events
                .iter()
                .any(|event| matches!(event, RuntimeNodeStreamEvent::Exit { .. }))
        });
        assert!(exit_events
            .iter()
            .any(|event| matches!(event, RuntimeNodeStreamEvent::Exit { .. })));
    }

    let recovered = RuntimeNodeHost::new_with_sqlite_path(&db_path).unwrap();
    let session_index = recovered.session_index().unwrap();

    assert_eq!(session_index.sessions.len(), 1);
    assert_eq!(
        session_index.sessions[0].workspace_id,
        "workspace-runtime-recovery"
    );
    assert_eq!(session_index.sessions[0].target, "server-runtime-node");
    assert_eq!(session_index.sessions[0].state, "Exited");

    let replay = recovered
        .session_replay(&session_index.sessions[0].session_id, None, 32)
        .unwrap();
    assert!(replay
        .entries
        .iter()
        .any(|entry| entry.payload.contains(&token)));
    assert!(replay.entries.iter().any(|entry| entry.kind == "exit"));

    let _ = fs::remove_file(db_path);
}

#[test]
fn runtime_node_host_executes_command_when_enter_is_sent_separately() {
    let host = RuntimeNodeHost::new_default().unwrap();
    let (command, token) = split_enter_command();

    let created = host
        .create_remote_runtime_session(RemoteRuntimeSessionCreateRequest {
            workspace_id: "workspace-runtime-split-enter".into(),
            target: "remote-runtime".into(),
            authority: "runtime://edge-node-split-enter".into(),
            command: interactive_command(),
            working_directory: None,
            cols: Some(132),
            rows: Some(36),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:remote-runtime".into()],
        })
        .unwrap();
    let receiver = host.subscribe_session_events(&created.session_id).unwrap();

    let _ = recv_until(&receiver, Duration::from_secs(8), shell_ready);
    host.write_session_input(&created.session_id, command).unwrap();
    host.write_session_input(&created.session_id, "\r").unwrap();

    let output_events = recv_until(&receiver, Duration::from_secs(10), |events| {
        events.iter().any(|event| match event {
            RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(token),
            _ => false,
        })
    });
    assert!(output_events.iter().any(|event| match event {
        RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(token),
        _ => false,
    }));

    let _ = host.terminate_session(&created.session_id).unwrap();
}

#[test]
fn runtime_node_host_applies_backspace_edits_before_enter() {
    let host = RuntimeNodeHost::new_default().unwrap();
    let (command, correction, token) = backspace_edit_command();

    let created = host
        .create_remote_runtime_session(RemoteRuntimeSessionCreateRequest {
            workspace_id: "workspace-runtime-backspace".into(),
            target: "remote-runtime".into(),
            authority: "runtime://edge-node-backspace".into(),
            command: interactive_command(),
            working_directory: None,
            cols: Some(132),
            rows: Some(36),
            mode_tags: vec!["cli-native".into()],
            tags: vec!["resource:remote-runtime".into()],
        })
        .unwrap();
    let receiver = host.subscribe_session_events(&created.session_id).unwrap();

    let _ = recv_until(&receiver, Duration::from_secs(8), shell_ready);
    host.write_session_input(&created.session_id, command).unwrap();
    host.write_session_input(&created.session_id, correction).unwrap();

    let output_events = recv_until(&receiver, Duration::from_secs(10), |events| {
        events.iter().any(|event| match event {
            RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(token),
            _ => false,
        })
    });
    assert!(output_events.iter().any(|event| match event {
        RuntimeNodeStreamEvent::Output { entry, .. } => entry.payload.contains(token),
        _ => false,
    }));

    let _ = host.terminate_session(&created.session_id).unwrap();
}
