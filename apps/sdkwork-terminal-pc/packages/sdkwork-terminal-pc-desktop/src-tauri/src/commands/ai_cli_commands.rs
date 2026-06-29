use crate::mapper::current_occurred_at;
use crate::snapshots::{DesktopAiCliLaunchRequest, DesktopAiCliLaunchSnapshot};
use crate::state::DesktopRuntimeState;
use sdkwork_terminal_ai_cli_host::{AiCliDiscoverySnapshot, AiCliHost};
use sdkwork_terminal_pty_runtime::{PtyProcessLaunchCommand, PtyProcessSessionCreateRequest};
use sdkwork_terminal_session_runtime::SessionCreateRequest;
use tauri::State;

#[tauri::command]
pub fn desktop_ai_cli_discovery() -> AiCliDiscoverySnapshot {
    let host = AiCliHost::new_default();
    host.discover_all()
}

#[tauri::command]
pub fn desktop_ai_cli_launch(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopAiCliLaunchRequest,
) -> Result<DesktopAiCliLaunchSnapshot, String> {
    let host = AiCliHost::new_default();
    let discovery = host.discover_single(&request.cli_kind);
    if !discovery.found {
        return Err(format!(
            "AI CLI binary not found: {}",
            request.cli_kind.binary_names().join("/")
        ));
    }

    let binary_path = discovery.binary_path.ok_or_else(|| {
        format!(
            "AI CLI binary path unavailable: {}",
            request.cli_kind.binary_names().join("/")
        )
    })?;

    let args = request.extra_args.clone();
    let occurred_at = current_occurred_at();

    // Register session in sessionRuntime first to get the canonical session_id
    let session_tags = request.cli_kind.session_tags();
    let (session_record, _attachment) = {
        let mut runtime = state
            .session_runtime
            .lock()
            .map_err(|_| "session runtime mutex poisoned".to_string())?;
        let session = runtime.create_session(SessionCreateRequest {
            workspace_id: "workspace-local".into(),
            target: format!("ai-cli:{}", request.cli_kind.as_str()),
            mode_tags: vec!["cli-native".into()],
            tags: session_tags,
            launch_intent: None,
        });
        let attachment = runtime
            .attach(&session.session_id)
            .map_err(|error| error.to_string())?;
        (session, attachment)
    };

    let session_request = PtyProcessSessionCreateRequest {
        session_id: session_record.session_id.clone(),
        command: PtyProcessLaunchCommand {
            program: binary_path,
            args: args.clone(),
        },
        working_directory: request.working_directory.clone(),
        cols: request.cols.unwrap_or(120).max(1),
        rows: request.rows.unwrap_or(32).max(1),
    };

    let bootstrap = state
        .local_shell_runtime
        .create_process_session(session_request, state.local_shell_event_sender.clone())
        .map_err(|error| {
            let _ = state.session_runtime.lock().map(|mut runtime| {
                let _ = runtime.fail(&session_record.session_id, &occurred_at);
            });
            format!("AI CLI launch failed: {error}")
        })?;

    Ok(DesktopAiCliLaunchSnapshot {
        session_id: session_record.session_id,
        cli_kind: request.cli_kind.as_str().to_string(),
        binary_path: bootstrap.invoked_program,
        args: bootstrap.invoked_args,
        working_directory: bootstrap.working_directory,
        version: discovery.version,
        authenticated: discovery.auth_state.authenticated,
    })
}
