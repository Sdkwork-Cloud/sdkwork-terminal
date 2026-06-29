use super::*;
use sdkwork_terminal_resource_connectors::{
    CommandOutput, CommandRunner, CommandRunnerError, ConnectorCommand,
};
use sdkwork_terminal_session_runtime::{SessionRuntime, SessionState};
use std::{
    cell::RefCell,
    collections::VecDeque,
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Clone)]
enum StubOutcome {
    Ok(CommandOutput),
    Err(CommandRunnerError),
}

#[derive(Default)]
struct StubRunner {
    commands: RefCell<Vec<ConnectorCommand>>,
    outcomes: RefCell<VecDeque<StubOutcome>>,
}

impl StubRunner {
    fn with_outcomes(outcomes: Vec<StubOutcome>) -> Self {
        Self {
            commands: RefCell::new(Vec::new()),
            outcomes: RefCell::new(VecDeque::from(outcomes)),
        }
    }
}

impl CommandRunner for StubRunner {
    fn run(&self, command: &ConnectorCommand) -> Result<CommandOutput, CommandRunnerError> {
        self.commands.borrow_mut().push(command.clone());
        match self.outcomes.borrow_mut().pop_front() {
            Some(StubOutcome::Ok(output)) => Ok(output),
            Some(StubOutcome::Err(error)) => Err(error),
            None => Ok(CommandOutput {
                status: 0,
                stdout: String::new(),
                stderr: String::new(),
            }),
        }
    }
}

fn temp_db_path(name: &str) -> PathBuf {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();

    std::env::temp_dir().join(format!("sdkwork-terminal-desktop-{name}-{unique}.db"))
}

#[test]
fn desktop_host_snapshot_matches_contract_namespaces() {
    let snapshot = build_desktop_host_snapshot();

    assert_eq!(snapshot.contract_version, CONTRACT_VERSION);
    assert_eq!(snapshot.control_plane_namespace, DESKTOP_BRIDGE_NAMESPACE);
    assert_eq!(snapshot.data_plane_namespace, LOCAL_RUNTIME_NAMESPACE);
}

#[test]
fn desktop_execution_target_catalog_uses_discovered_connector_targets() {
    let home_dir = std::env::temp_dir().join(format!(
        "sdkwork-terminal-target-catalog-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let ssh_dir = home_dir.join(".ssh");
    fs::create_dir_all(&ssh_dir).unwrap();
    fs::write(
        ssh_dir.join("config"),
        "Host prod-bastion stage-bastion\n  HostName 10.0.0.10\n",
    )
    .unwrap();
    fs::write(ssh_dir.join("known_hosts"), "prod-bastion ssh-ed25519 AAAA").unwrap();

    let runner = StubRunner::with_outcomes(vec![
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "OpenSSH_9.8".into(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "Docker version 27.0.0".into(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "workspace-dev\nworkspace-api".into(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "{\"clientVersion\":{\"gitVersion\":\"v1.30.0\"}}".into(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "prod-cluster".into(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "prod/web-0\nprod/web-1".into(),
            stderr: String::new(),
        }),
    ]);

    let catalog = build_desktop_execution_target_catalog_with(
        &runner,
        &ConnectorDiscoveryEnvironment {
            workspace_id: "workspace-desktop".into(),
            home_dir: Some(home_dir.clone()),
            ssh_authority: None,
            docker_authority: None,
            kubernetes_authority: None,
            remote_runtime_authority: Some("runtime://edge-node-a".into()),
        },
        "2026-04-10T15:10:00.000Z",
    );

    assert_eq!(catalog.len(), 8);
    assert_eq!(catalog[0].kind, "local-shell");
    assert_eq!(catalog[1].kind, "ssh");
    assert_eq!(catalog[1].authority, "prod-bastion");
    assert_eq!(catalog[1].health.status, "ready");
    assert_eq!(catalog[2].kind, "ssh");
    assert_eq!(catalog[2].authority, "stage-bastion");
    assert_eq!(catalog[2].health.status, "ready");
    assert_eq!(catalog[3].kind, "docker-exec");
    assert_eq!(catalog[3].authority, "docker://workspace-dev");
    assert_eq!(catalog[3].health.status, "ready");
    assert_eq!(catalog[4].kind, "docker-exec");
    assert_eq!(catalog[4].authority, "docker://workspace-api");
    assert_eq!(catalog[4].health.status, "ready");
    assert_eq!(catalog[5].kind, "kubernetes-exec");
    assert_eq!(catalog[5].authority, "k8s://prod/web-0");
    assert_eq!(catalog[5].health.status, "ready");
    assert_eq!(catalog[6].kind, "kubernetes-exec");
    assert_eq!(catalog[6].authority, "k8s://prod/web-1");
    assert_eq!(catalog[6].health.status, "ready");
    assert_eq!(catalog[7].kind, "remote-runtime");
    assert_eq!(catalog[7].authority, "runtime://edge-node-a");
    assert_eq!(catalog[7].health.status, "degraded");
    assert!(!catalog[7].session_launchable);

    let _ = fs::remove_dir_all(home_dir);
}

#[test]
fn local_shell_runtime_event_names_follow_protocol_runtime_namespace() {
    assert_eq!(
        build_local_shell_runtime_event_name("session.output"),
        format!(
            "{}:{}",
            LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
            "session.output".replace('.', ":")
        )
    );
    assert_eq!(
        build_local_shell_runtime_event_name("session.warning"),
        format!(
            "{}:{}",
            LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
            "session.warning".replace('.', ":")
        )
    );
    assert_eq!(
        build_local_shell_runtime_event_name("session.exit"),
        format!(
            "{}:{}",
            LOCAL_RUNTIME_NAMESPACE.replace('.', ":"),
            "session.exit".replace('.', ":")
        )
    );
}

#[test]
fn launch_connector_session_from_request_marks_session_running_after_successful_connect_phase() {
    let request = sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
        workspace_id: "workspace-remote".into(),
