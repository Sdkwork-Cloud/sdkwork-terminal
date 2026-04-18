use sdkwork_terminal_pty_runtime::{
    LocalShellSessionCreateRequest, LocalShellSessionEvent, LocalShellSessionRuntime,
};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

fn test_profile() -> String {
    if cfg!(windows) {
        "powershell".to_string()
    } else {
        "shell".to_string()
    }
}

fn test_input() -> &'static str {
    if cfg!(windows) {
        "echo sdkwork-terminal-pty-test\r\n"
    } else {
        "echo sdkwork-terminal-pty-test\r\n"
    }
}

fn split_enter_command() -> (&'static str, &'static str) {
    if cfg!(windows) {
        (
            "Write-Output ('sdk'+'work'+'-pty-split-enter')",
            "sdkwork-pty-split-enter",
        )
    } else {
        (
            "printf '%s%s%s\\n' sdk work -pty-split-enter",
            "sdkwork-pty-split-enter",
        )
    }
}

fn backspace_edit_command() -> (&'static str, &'static str, &'static str) {
    (
        "echo sdkwork-backspace-FAIL",
        "\u{7f}\u{7f}\u{7f}\u{7f}PASS\r",
        "sdkwork-backspace-PASS",
    )
}

fn shell_ready(events: &[LocalShellSessionEvent]) -> bool {
    if cfg!(windows) {
        events.iter().any(|event| match event {
            LocalShellSessionEvent::Output { payload, .. } => {
                payload.contains("PowerShell") || payload.contains("PS ")
            }
            _ => false,
        })
    } else {
        true
    }
}

fn collect_until<F>(
    receiver: &mpsc::Receiver<LocalShellSessionEvent>,
    timeout: Duration,
    mut predicate: F,
) -> Vec<LocalShellSessionEvent>
where
    F: FnMut(&[LocalShellSessionEvent]) -> bool,
{
    let deadline = Instant::now() + timeout;
    let mut events = Vec::new();

    while Instant::now() < deadline {
        match receiver.recv_timeout(Duration::from_millis(250)) {
            Ok(event) => {
                events.push(event);
                if predicate(&events) {
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    events
}

fn output_contains(events: &[LocalShellSessionEvent], needle: &str) -> bool {
    events.iter().any(|event| match event {
        LocalShellSessionEvent::Output { payload, .. } => payload.contains(needle),
        _ => false,
    })
}

fn collect_output(events: &[LocalShellSessionEvent]) -> String {
    events
        .iter()
        .filter_map(|event| match event {
            LocalShellSessionEvent::Output { payload, .. } => Some(payload.as_str()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("")
}

#[test]
fn local_shell_session_runtime_streams_output_and_exit_for_interactive_session() {
    let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
    let (sender, receiver) = mpsc::channel();

    let session = runtime
        .create_session(
            LocalShellSessionCreateRequest {
                session_id: "session-0001".into(),
                profile: test_profile(),
                working_directory: None,
                cols: 120,
                rows: 32,
            },
            sender,
        )
        .expect("create interactive shell session");

    if cfg!(windows) {
        let ready_events = collect_until(&receiver, Duration::from_secs(8), shell_ready);
        assert!(
            shell_ready(&ready_events),
            "expected windows shell prompt before input, got: {ready_events:?}"
        );
    } else {
        thread::sleep(Duration::from_millis(300));
    }

    runtime
        .write_input(&session.session_id, test_input())
        .expect("write echo input");
    let output_events = collect_until(&receiver, Duration::from_secs(8), |items| {
        output_contains(items, "sdkwork-terminal-pty-test")
    });

    assert!(
        output_contains(&output_events, "sdkwork-terminal-pty-test"),
        "expected streamed output event, got: {output_events:?}"
    );

    runtime
        .terminate_session(&session.session_id)
        .expect("terminate interactive shell session");
    let exit_events = collect_until(&receiver, Duration::from_secs(8), |items| {
        items
            .iter()
            .any(|event| matches!(event, LocalShellSessionEvent::Exit { .. }))
    });
    assert!(
        exit_events
            .iter()
            .any(|event| matches!(event, LocalShellSessionEvent::Exit { .. })),
        "expected clean exit event, got: {exit_events:?}"
    );
}

#[test]
fn local_shell_session_runtime_normalizes_windows_powershell_prompt() {
    if !cfg!(windows) {
        return;
    }

    let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
    let (sender, receiver) = mpsc::channel();

    let session = runtime
        .create_session(
            LocalShellSessionCreateRequest {
                session_id: "session-prompt-0001".into(),
                profile: "powershell".into(),
                working_directory: None,
                cols: 120,
                rows: 32,
            },
            sender,
        )
        .expect("create interactive PowerShell session");

    let ready_events = collect_until(&receiver, Duration::from_secs(8), |items| {
        collect_output(items).contains("PS ")
    });
    let ready_output = collect_output(&ready_events);

    assert!(
        ready_output.contains("PS "),
        "expected PowerShell prompt output, got: {ready_events:?}"
    );
    assert!(
        !ready_output.contains("Microsoft.PowerShell.Core"),
        "prompt leaked provider prefix into interactive session output: {ready_events:?}"
    );
    assert!(
        !ready_output.contains("FileSystem::"),
        "prompt leaked provider namespace into interactive session output: {ready_events:?}"
    );

    runtime
        .terminate_session(&session.session_id)
        .expect("terminate interactive PowerShell session");
}

#[test]
fn local_shell_session_runtime_executes_command_when_enter_is_sent_separately() {
    let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
    let (sender, receiver) = mpsc::channel();
    let (command, token) = split_enter_command();

    let session = runtime
        .create_session(
            LocalShellSessionCreateRequest {
                session_id: "session-0002".into(),
                profile: test_profile(),
                working_directory: None,
                cols: 120,
                rows: 32,
            },
            sender,
        )
        .expect("create interactive shell session");

    if cfg!(windows) {
        let ready_events = collect_until(&receiver, Duration::from_secs(8), shell_ready);
        assert!(
            shell_ready(&ready_events),
            "expected windows shell prompt before split enter input, got: {ready_events:?}"
        );
    } else {
        thread::sleep(Duration::from_millis(300));
    }

    runtime
        .write_input(&session.session_id, command)
        .expect("write command before enter");
    runtime
        .write_input(&session.session_id, "\r")
        .expect("write enter separately");

    // Windows PowerShell can spend extra time repainting split-enter input before the
    // final command output arrives on the PTY stream.
    let output_events = collect_until(&receiver, Duration::from_secs(10), |items| {
        output_contains(items, token)
    });

    assert!(
        output_contains(&output_events, token),
        "expected split-enter output event, got: {output_events:?}"
    );

    runtime
        .terminate_session(&session.session_id)
        .expect("terminate interactive shell session after split enter");
}

#[test]
fn local_shell_session_runtime_applies_backspace_edits_before_enter() {
    let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
    let (sender, receiver) = mpsc::channel();
    let (command, correction, token) = backspace_edit_command();

    let session = runtime
        .create_session(
            LocalShellSessionCreateRequest {
                session_id: "session-0003".into(),
                profile: test_profile(),
                working_directory: None,
                cols: 120,
                rows: 32,
            },
            sender,
        )
        .expect("create interactive shell session");

    if cfg!(windows) {
        let ready_events = collect_until(&receiver, Duration::from_secs(8), shell_ready);
        assert!(
            shell_ready(&ready_events),
            "expected windows shell prompt before backspace edit input, got: {ready_events:?}"
        );
    } else {
        thread::sleep(Duration::from_millis(300));
    }

    runtime
        .write_input(&session.session_id, command)
        .expect("write command before backspace correction");
    runtime
        .write_input(&session.session_id, correction)
        .expect("write backspace correction and enter");

    let output_events = collect_until(&receiver, Duration::from_secs(8), |items| {
        output_contains(items, token)
    });

    assert!(
        output_contains(&output_events, token),
        "expected backspace-corrected output event, got: {output_events:?}"
    );

    runtime
        .terminate_session(&session.session_id)
        .expect("terminate interactive shell session after backspace edit");
}
