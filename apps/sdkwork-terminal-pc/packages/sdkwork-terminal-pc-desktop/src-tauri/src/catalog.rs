use crate::mapper::current_occurred_at;
use crate::snapshots::{
    DesktopExecutionTargetConnectorSnapshot, DesktopExecutionTargetDescriptorSnapshot,
    DesktopExecutionTargetHealthSnapshot, DesktopHostSnapshot,
};
use sdkwork_terminal_protocol::{CONTRACT_VERSION, DESKTOP_BRIDGE_NAMESPACE, LOCAL_RUNTIME_NAMESPACE};
use sdkwork_terminal_resource_connectors::{
    discover_connector_execution_targets, CommandRunner, ConnectorDiscoveryEnvironment,
    ConnectorExecutionTarget, ConnectorHealth, ConnectorTransport, SystemCommandRunner,
};

const DEFAULT_EXECUTION_TARGET_WORKSPACE_ID: &str = "workspace-demo";

fn connector_transport_label(transport: ConnectorTransport) -> &'static str {
    match transport {
        ConnectorTransport::SystemCli => "system-cli",
        ConnectorTransport::RemoteApi => "remote-api",
    }
}

fn connector_health_label(health: ConnectorHealth) -> &'static str {
    match health {
        ConnectorHealth::Ready => "ready",
        ConnectorHealth::Degraded => "degraded",
        ConnectorHealth::Unavailable => "unavailable",
    }
}

fn map_connector_execution_target_snapshot(
    target: ConnectorExecutionTarget,
) -> DesktopExecutionTargetDescriptorSnapshot {
    DesktopExecutionTargetDescriptorSnapshot {
        target_id: target.target_id,
        workspace_id: target.workspace_id,
        kind: target.kind,
        label: target.label,
        authority: target.authority,
        connector: DesktopExecutionTargetConnectorSnapshot {
            connector_id: target.connector_id,
            label: target.connector_label,
            transport: connector_transport_label(target.transport).to_string(),
            diagnostics_hint: target.diagnostics_hint,
        },
        health: DesktopExecutionTargetHealthSnapshot {
            status: connector_health_label(target.health).to_string(),
            summary: target.health_summary,
            last_checked_at: target.last_checked_at,
        },
        session_launchable: target.session_launchable,
        tags: target.tags,
    }
}

pub(crate) fn build_desktop_execution_target_catalog_with(
    runner: &impl CommandRunner,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> Vec<DesktopExecutionTargetDescriptorSnapshot> {
    let mut targets = vec![DesktopExecutionTargetDescriptorSnapshot {
        target_id: "target-local-shell".to_string(),
        workspace_id: DEFAULT_EXECUTION_TARGET_WORKSPACE_ID.to_string(),
        kind: "local-shell".to_string(),
        label: "Local Shell".to_string(),
        authority: "localhost".to_string(),
        connector: DesktopExecutionTargetConnectorSnapshot {
            connector_id: "builtin-local-shell".to_string(),
            label: "Builtin PTY".to_string(),
            transport: "builtin".to_string(),
            diagnostics_hint: "Verify local shell profile and PTY permissions.".to_string(),
        },
        health: DesktopExecutionTargetHealthSnapshot {
            status: "ready".to_string(),
            summary: "Local PTY runtime ready.".to_string(),
            last_checked_at: occurred_at.to_string(),
        },
        session_launchable: true,
        tags: vec!["desktop".to_string(), "default".to_string()],
    }];

    targets.extend(
        discover_connector_execution_targets(runner, environment, occurred_at)
            .into_iter()
            .map(map_connector_execution_target_snapshot),
    );

    targets
}

pub fn build_desktop_execution_target_catalog() -> Vec<DesktopExecutionTargetDescriptorSnapshot> {
    let occurred_at = current_occurred_at();
    build_desktop_execution_target_catalog_with(
        &SystemCommandRunner,
        &ConnectorDiscoveryEnvironment::from_process(),
        &occurred_at,
    )
}

pub fn build_desktop_host_snapshot() -> DesktopHostSnapshot {
    DesktopHostSnapshot {
        host_label: "sdkwork-terminal thin host ready".to_string(),
        contract_version: CONTRACT_VERSION,
        control_plane_kind: "tauri-ipc",
        control_plane_namespace: DESKTOP_BRIDGE_NAMESPACE,
        data_plane_kind: "local-runtime-channel",
        data_plane_namespace: LOCAL_RUNTIME_NAMESPACE,
    }
}
