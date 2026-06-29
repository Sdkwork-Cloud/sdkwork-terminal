#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectorTransport {
    SystemCli,
    RemoteApi,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectorHealth {
    Ready,
    Degraded,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConnectorDescriptor {
    pub id: &'static str,
    pub target_kind: &'static str,
    pub display_name: &'static str,
    pub transport: ConnectorTransport,
    pub health: ConnectorHealth,
    pub session_launchable: bool,
    pub diagnostics_hint: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConnectorSummary {
    pub total: usize,
    pub ready: usize,
    pub attention: usize,
    pub blocked: usize,
    pub session_ready: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorCommand {
    pub program: &'static str,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectorCloseAction {
    TerminateSessionProcess,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorLaunchPlan {
    pub connector: ConnectorDescriptor,
    pub connect: ConnectorCommand,
    pub exec: ConnectorCommand,
    pub diag: ConnectorCommand,
    pub close: ConnectorCloseAction,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorSessionLaunchRequest {
    pub workspace_id: String,
    pub target: String,
    pub authority: String,
    pub command: Vec<String>,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectorPhase {
    Connect,
    Exec,
    Diag,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandOutput {
    pub status: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorExecutionError {
    pub code: &'static str,
    pub phase: ConnectorPhase,
    pub retryable: bool,
    pub program: &'static str,
    pub status: Option<i32>,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectorSmokeStatus {
    Passed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorSmokeReport {
    pub target_kind: String,
    pub command: ConnectorCommand,
    pub status: ConnectorSmokeStatus,
    pub details: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConnectorPlanError {
    UnsupportedTarget(String),
    InvalidAuthority(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorExecutionTarget {
    pub target_id: String,
    pub workspace_id: String,
    pub kind: String,
    pub label: String,
    pub authority: String,
    pub connector_id: String,
    pub connector_label: String,
    pub transport: ConnectorTransport,
    pub diagnostics_hint: String,
    pub health: ConnectorHealth,
    pub health_summary: String,
    pub last_checked_at: String,
    pub session_launchable: bool,
    pub tags: Vec<String>,
}

pub fn connector_catalog() -> [ConnectorDescriptor; 4] {
    [
        ConnectorDescriptor {
            id: "system-ssh",
            target_kind: "ssh",
            display_name: "SSH",
            transport: ConnectorTransport::SystemCli,
            health: ConnectorHealth::Degraded,
            session_launchable: true,
            diagnostics_hint: "Check ssh binary, config and host-key trust chain.",
        },
        ConnectorDescriptor {
            id: "system-docker",
            target_kind: "docker-exec",
            display_name: "Docker Exec",
            transport: ConnectorTransport::SystemCli,
            health: ConnectorHealth::Ready,
            session_launchable: true,
            diagnostics_hint: "Check docker context, socket access and exec permissions.",
        },
        ConnectorDescriptor {
            id: "system-kubectl",
            target_kind: "kubernetes-exec",
            display_name: "Kubernetes Exec",
            transport: ConnectorTransport::SystemCli,
            health: ConnectorHealth::Ready,
            session_launchable: true,
            diagnostics_hint: "Check kubeconfig, current context and exec RBAC.",
        },
        ConnectorDescriptor {
            id: "runtime-node-api",
            target_kind: "remote-runtime",
            display_name: "Remote Runtime",
            transport: ConnectorTransport::RemoteApi,
            health: ConnectorHealth::Unavailable,
            session_launchable: false,
            diagnostics_hint: "Register a healthy runtime node before creating sessions.",
        },
    ]
}

pub fn connector_summary() -> ConnectorSummary {
    let catalog = connector_catalog();
    let mut ready = 0;
    let mut attention = 0;
    let mut blocked = 0;
    let mut session_ready = 0;

    for connector in catalog {
        match connector.health {
            ConnectorHealth::Ready => ready += 1,
            ConnectorHealth::Degraded => attention += 1,
            ConnectorHealth::Unavailable => blocked += 1,
        }

        if connector.session_launchable {
            session_ready += 1;
        }
    }

    ConnectorSummary {
        total: catalog.len(),
        ready,
        attention,
        blocked,
        session_ready,
    }
}

pub fn find_connector(target_kind: &str) -> Option<ConnectorDescriptor> {
    connector_catalog()
        .into_iter()
        .find(|connector| connector.target_kind == target_kind)
}
