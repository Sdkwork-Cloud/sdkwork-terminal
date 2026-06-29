use crate::catalog::build_desktop_execution_target_catalog;
use crate::mapper::current_occurred_at;
use crate::snapshots::{
    DesktopConnectorExecSnapshot, DesktopConnectorInteractiveSessionCreateRequest,
    DesktopConnectorInteractiveSessionCreateSnapshot, DesktopConnectorLaunchSnapshot,
    DesktopExecutionTargetDescriptorSnapshot,
};
use crate::state::DesktopRuntimeState;
use sdkwork_terminal_protocol::ConnectorSessionLaunchRequest;
use sdkwork_terminal_resource_connectors::SystemCommandRunner;
use tauri::State;

#[tauri::command]
pub async fn desktop_execution_target_catalog(
) -> Result<Vec<DesktopExecutionTargetDescriptorSnapshot>, String> {
    tauri::async_runtime::spawn_blocking(build_desktop_execution_target_catalog)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn desktop_connector_launch(
    state: State<'_, DesktopRuntimeState>,
    request: ConnectorSessionLaunchRequest,
) -> Result<DesktopConnectorLaunchSnapshot, String> {
    let runner = SystemCommandRunner;

    state
        .launch_connector_session(&request, &runner, &current_occurred_at())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn desktop_connector_session_create(
    state: State<'_, DesktopRuntimeState>,
    request: DesktopConnectorInteractiveSessionCreateRequest,
) -> Result<DesktopConnectorInteractiveSessionCreateSnapshot, String> {
    let runner = SystemCommandRunner;

    state.create_connector_interactive_session(request, &runner, &current_occurred_at())
}

#[tauri::command]
pub fn desktop_connector_exec_probe(
    state: State<'_, DesktopRuntimeState>,
    request: ConnectorSessionLaunchRequest,
) -> Result<DesktopConnectorExecSnapshot, String> {
    let runner = SystemCommandRunner;

    state
        .probe_connector_exec_session(&request, &runner, &current_occurred_at())
        .map_err(|error| error.to_string())
}
