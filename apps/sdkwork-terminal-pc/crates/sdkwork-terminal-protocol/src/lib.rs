use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub const CRATE_ID: &str = "sdkwork-terminal-protocol";
pub const CONTRACT_VERSION: &str = "v1";
pub const DESKTOP_BRIDGE_NAMESPACE: &str = "sdkwork-terminal.desktop.v1";
pub const LOCAL_RUNTIME_NAMESPACE: &str = "sdkwork-terminal.runtime.v1";
pub const PUBLIC_API_PREFIX: &str = "/terminal/api/v1";
pub const MANAGE_API_PREFIX: &str = "/terminal/manage/v1";
pub const INTERNAL_API_PREFIX: &str = "/terminal/internal/v1";
pub const RUNTIME_STREAM_PREFIX: &str = "/terminal/stream/v1";

pub const ERROR_FIELDS: [&str; 5] = ["code", "message", "traceId", "retryable", "details"];
pub const RUNTIME_STREAM_EVENTS: [&str; 7] = [
    "session.state",
    "session.output",
    "session.marker",
    "session.warning",
    "session.exit",
    "session.replay.ready",
    "session.attach.lost",
];
pub const SESSION_STATES: [&str; 9] = [
    "Creating",
    "Starting",
    "Running",
    "Detached",
    "Reattaching",
    "Replaying",
    "Stopping",
    "Exited",
    "Failed",
];
pub const EXECUTION_TARGETS: [&str; 6] = [
    "local-shell",
    "ssh",
    "docker-exec",
    "kubernetes-exec",
    "remote-runtime",
    "server-runtime-node",
];
pub const EXECUTION_TARGET_DESCRIPTOR_FIELDS: [&str; 9] = [
    "targetId",
    "workspaceId",
    "kind",
    "label",
    "authority",
    "connector",
    "health",
    "sessionLaunchable",
    "tags",
];
pub const CONNECTOR_SESSION_LAUNCH_REQUEST_FIELDS: [&str; 6] = [
    "workspaceId",
    "target",
    "authority",
    "command",
    "modeTags",
    "tags",
];
pub const EXECUTION_MODE_TAGS: [&str; 1] = ["cli-native"];
pub const CONNECTOR_HEALTH_STATUSES: [&str; 3] = ["ready", "degraded", "unavailable"];
pub const CONNECTOR_TRANSPORTS: [&str; 3] = ["builtin", "system-cli", "remote-api"];
pub const CONTROL_ACTIONS: [&str; 7] = [
    "session.create",
    "session.attach",
    "session.detach",
    "session.input",
    "session.resize",
    "session.replay",
    "session.terminate",
];
pub const PUBLIC_RESOURCES: [&str; 8] = [
    "workspaces",
    "resources",
    "profiles",
    "sessions",
    "replays",
    "settings",
    "diagnostics",
    "cli",
];
pub const MANAGE_RESOURCES: [&str; 5] =
    ["runtime-nodes", "policies", "audits", "releases", "system"];
pub const INTERNAL_RESOURCES: [&str; 6] = [
    "nodes/hello",
    "nodes/heartbeat",
    "sessions/admit",
    "sessions/close",
    "desired-state/pull",
    "desired-state/ack",
];
pub const SESSION_DESCRIPTOR_FIELDS: [&str; 8] = [
    "sessionId",
    "workspaceId",
    "target",
    "state",
    "createdAt",
    "lastActiveAt",
    "modeTags",
    "tags",
];
pub const ATTACHMENT_FIELDS: [&str; 5] = [
    "attachmentId",
    "sessionId",
    "cursor",
    "lastAckSequence",
    "writable",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ConnectorSessionLaunchRequest {
    pub workspace_id: String,
    pub target: String,
    pub authority: String,
    pub command: Vec<String>,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
}

pub fn crate_id() -> &'static str {
    CRATE_ID
}

pub fn runtime_contract_snapshot() -> Value {
    json!({
        "version": CONTRACT_VERSION,
        "surfaces": {
            "desktopBridge": {
                "kind": "tauri-ipc",
                "namespace": DESKTOP_BRIDGE_NAMESPACE
            },
            "localRuntime": {
                "kind": "local-runtime-channel",
                "namespace": LOCAL_RUNTIME_NAMESPACE,
                "transports": ["named-pipe", "unix-domain-socket"],
                "controlEncoding": "json",
                "dataEncoding": "binary-frame"
            },
            "publicApi": {
                "kind": "http",
                "prefix": PUBLIC_API_PREFIX
            },
            "manageApi": {
                "kind": "http",
                "prefix": MANAGE_API_PREFIX
            },
            "internalApi": {
                "kind": "http",
                "prefix": INTERNAL_API_PREFIX
            },
            "runtimeStream": {
                "kind": "stream",
                "prefix": RUNTIME_STREAM_PREFIX
            }
        },
        "errorFields": ERROR_FIELDS,
        "runtimeStreamEvents": RUNTIME_STREAM_EVENTS,
        "sessionStates": SESSION_STATES,
        "executionTargets": EXECUTION_TARGETS,
        "executionTargetDescriptorFields": EXECUTION_TARGET_DESCRIPTOR_FIELDS,
        "connectorSessionLaunchRequestFields": CONNECTOR_SESSION_LAUNCH_REQUEST_FIELDS,
        "executionModeTags": EXECUTION_MODE_TAGS,
        "connectorHealthStatuses": CONNECTOR_HEALTH_STATUSES,
        "connectorTransports": CONNECTOR_TRANSPORTS,
        "controlActions": CONTROL_ACTIONS,
        "publicResources": PUBLIC_RESOURCES,
        "manageResources": MANAGE_RESOURCES,
        "internalResources": INTERNAL_RESOURCES,
        "sessionDescriptorFields": SESSION_DESCRIPTOR_FIELDS,
        "attachmentFields": ATTACHMENT_FIELDS
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn matches_frozen_runtime_contract_snapshot() {
        let expected = include_str!("../../../tests/fixtures/runtime-contract.snapshot.json");
        let expected_value: Value = serde_json::from_str(expected).unwrap();

        assert_eq!(runtime_contract_snapshot(), expected_value);
    }
}
