use crate::catalog::build_desktop_host_snapshot;
use crate::snapshots::DesktopHostSnapshot;
use crate::state::DesktopRuntimeState;
use sdkwork_terminal_session_runtime::LocalDaemonHealthSnapshot;
use tauri::State;

#[tauri::command]
pub fn desktop_host_status() -> DesktopHostSnapshot {
    build_desktop_host_snapshot()
}

#[tauri::command]
pub fn desktop_daemon_health(
    state: State<'_, DesktopRuntimeState>,
) -> Result<LocalDaemonHealthSnapshot, String> {
    state
        .daemon
        .lock()
        .map_err(|_| "daemon mutex poisoned".to_string())
        .map(|daemon| daemon.health_snapshot())
}

#[tauri::command]
pub fn desktop_daemon_start(
    state: State<'_, DesktopRuntimeState>,
) -> Result<LocalDaemonHealthSnapshot, String> {
    state
        .daemon
        .lock()
        .map_err(|_| "daemon mutex poisoned".to_string())
        .map(|mut daemon| daemon.start())
}

#[tauri::command]
pub fn desktop_daemon_stop(
    state: State<'_, DesktopRuntimeState>,
) -> Result<LocalDaemonHealthSnapshot, String> {
    state
        .daemon
        .lock()
        .map_err(|_| "daemon mutex poisoned".to_string())
        .map(|mut daemon| daemon.stop())
}

#[tauri::command]
pub fn desktop_daemon_reconnect(
    state: State<'_, DesktopRuntimeState>,
) -> Result<LocalDaemonHealthSnapshot, String> {
    state
        .daemon
        .lock()
        .map_err(|_| "daemon mutex poisoned".to_string())
        .map(|mut daemon| daemon.reconnect())
}
