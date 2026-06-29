use crate::mapper::run_local_shell_exec;
use crate::snapshots::{
    DesktopAttachmentDescriptorSnapshot, DesktopLocalProcessSessionCreateRequest,
    DesktopLocalProcessSessionCreateSnapshot, DesktopLocalShellExecRequest,
    DesktopLocalShellExecSnapshot, DesktopLocalShellSessionCreateRequest,
    DesktopLocalShellSessionCreateSnapshot, DesktopLocalShellSessionInputBytesRequest,
    DesktopLocalShellSessionInputRequest, DesktopLocalShellSessionInputSnapshot,
    DesktopLocalShellSessionResizeRequest, DesktopLocalShellSessionResizeSnapshot,
    DesktopLocalShellSessionTerminateSnapshot, DesktopSessionAttachRequest,
    DesktopSessionAttachmentAcknowledgeRequest, DesktopSessionAttachmentSnapshot,
    DesktopSessionDetachRequest, DesktopSessionDescriptorSnapshot, DesktopSessionIndexSnapshot,
    DesktopSessionReplaySnapshot,
};
use crate::state::DesktopRuntimeState;
use tauri::State;

#[tauri::command]
pub fn desktop_session_index(
    state: State<'_, DesktopRuntimeState>,
) -> Result<DesktopSessionIndexSnapshot, String> {
    state.session_index()
}

#[tauri::command]
pub fn desktop_session_replay_slice(
    state: State<'_, DesktopRuntimeState>,
    session_id: String,
    from_cursor: Option<String>,
    limit: Option<usize>,
) -> Result<DesktopSessionReplaySnapshot, String> {
    state.session_replay_slice(&session_id, from_cursor, limit.unwrap_or(32))
}

#[tauri::command]
pub fn desktop_session_attach(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopSessionAttachRequest,
) -> Result<DesktopSessionAttachmentSnapshot, String> {
    state.attach_session(request)
}

#[tauri::command]
pub fn desktop_session_detach(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopSessionDetachRequest,
) -> Result<DesktopSessionDescriptorSnapshot, String> {
    state.detach_session_attachment(request)
}

#[tauri::command]
pub fn desktop_session_reattach(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopSessionAttachRequest,
) -> Result<DesktopSessionAttachmentSnapshot, String> {
    state.reattach_session(request)
}

#[tauri::command]
pub fn desktop_local_shell_exec(
    request: DesktopLocalShellExecRequest,
) -> Result<DesktopLocalShellExecSnapshot, String> {
    run_local_shell_exec(request)
}

#[tauri::command]
pub fn desktop_local_shell_session_create(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionCreateRequest,
) -> Result<DesktopLocalShellSessionCreateSnapshot, String> {
    state.create_local_shell_session(request)
}

#[tauri::command]
pub fn desktop_local_process_session_create(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalProcessSessionCreateRequest,
) -> Result<DesktopLocalProcessSessionCreateSnapshot, String> {
    state.create_local_process_session(request)
}

#[tauri::command]
pub fn desktop_local_shell_session_input(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionInputRequest,
) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
    state.write_local_shell_input(request)
}

#[tauri::command]
pub fn desktop_session_input(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionInputRequest,
) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
    state.write_local_shell_input(request)
}

#[tauri::command]
pub fn desktop_local_shell_session_input_bytes(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionInputBytesRequest,
) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
    state.write_local_shell_input_bytes(request)
}

#[tauri::command]
pub fn desktop_session_input_bytes(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionInputBytesRequest,
) -> Result<DesktopLocalShellSessionInputSnapshot, String> {
    state.write_local_shell_input_bytes(request)
}

#[tauri::command]
pub fn desktop_session_attachment_acknowledge(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopSessionAttachmentAcknowledgeRequest,
) -> Result<DesktopAttachmentDescriptorSnapshot, String> {
    state.acknowledge_session_attachment(request)
}

#[tauri::command]
pub fn desktop_session_resize(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionResizeRequest,
) -> Result<DesktopLocalShellSessionResizeSnapshot, String> {
    state.resize_local_shell_session(request)
}

#[tauri::command]
pub fn desktop_local_shell_session_resize(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopLocalShellSessionResizeRequest,
) -> Result<DesktopLocalShellSessionResizeSnapshot, String> {
    state.resize_local_shell_session(request)
}

#[tauri::command]
pub fn desktop_session_terminate(
    state: State<'_, DesktopRuntimeState>,
    session_id: String,
) -> Result<DesktopLocalShellSessionTerminateSnapshot, String> {
    state.terminate_local_shell_session(&session_id)
}

#[tauri::command]
pub fn desktop_local_shell_session_terminate(
    state: State<'_, DesktopRuntimeState>,
    session_id: String,
) -> Result<DesktopLocalShellSessionTerminateSnapshot, String> {
    state.terminate_local_shell_session(&session_id)
}
