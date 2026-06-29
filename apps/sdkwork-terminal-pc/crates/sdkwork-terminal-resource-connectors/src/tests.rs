use super::*;
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

#[test]
fn exposes_crate_id() {
    assert_eq!(crate_id(), CRATE_ID);
}

#[test]
fn exposes_connector_catalog_for_step07_targets() {
    let catalog = connector_catalog();

    assert_eq!(catalog.len(), 4);
    assert_eq!(catalog[0].target_kind, "ssh");
    assert_eq!(catalog[1].target_kind, "docker-exec");
    assert_eq!(catalog[2].target_kind, "kubernetes-exec");
    assert_eq!(catalog[3].target_kind, "remote-runtime");
    assert!(catalog[0].session_launchable);
    assert!(!catalog[3].session_launchable);
}

#[test]
fn summarizes_ready_attention_and_blocked_connectors() {
    let summary = connector_summary();

    assert_eq!(summary.total, 4);
    assert_eq!(summary.ready, 2);
    assert_eq!(summary.attention, 1);
    assert_eq!(summary.blocked, 1);
    assert_eq!(summary.session_ready, 3);
}

#[test]
fn resolves_catalog_items_by_target_kind() {
    let ssh = find_connector("ssh").unwrap();
    let remote = find_connector("remote-runtime").unwrap();

    assert_eq!(ssh.display_name, "SSH");
    assert!(ssh.session_launchable);
    assert_eq!(remote.transport, ConnectorTransport::RemoteApi);
    assert!(!remote.session_launchable);
    assert!(find_connector("local-shell").is_none());
}

#[test]
fn builds_cli_launch_plans_for_ssh_docker_and_kubernetes() {
    let ssh = build_cli_launch_plan("ssh", "ops@prod-bastion", &["bash", "-l"]).unwrap();
    let docker = build_cli_launch_plan(
        "docker-exec",
        "docker://workspace-dev",
        &["/bin/sh", "-lc", "pwd"],
    )
    .unwrap();
    let kubernetes = build_cli_launch_plan(
        "kubernetes-exec",
        "k8s://prod/web-0",
        &["/bin/sh", "-lc", "pwd"],
    )
    .unwrap();

    assert_eq!(ssh.connect.program, "ssh");
    assert_eq!(
        ssh.exec.args,
        vec![
            "-tt".to_string(),
            "ops@prod-bastion".to_string(),
            "--".to_string(),
            "bash".to_string(),
            "-l".to_string()
        ]
    );
    assert_eq!(ssh.diag.args, vec!["-V".to_string()]);
    assert_eq!(ssh.close, ConnectorCloseAction::TerminateSessionProcess);

    assert_eq!(docker.connect.program, "docker");
    assert_eq!(
        docker.connect.args,
        vec![
            "inspect".to_string(),
            "--format".to_string(),
            "{{.State.Running}}".to_string(),
            "workspace-dev".to_string()
        ]
    );
    assert_eq!(
        docker.exec.args,
        vec![
            "exec".to_string(),
            "-it".to_string(),
            "workspace-dev".to_string(),
            "/bin/sh".to_string(),
            "-lc".to_string(),
            "pwd".to_string()
        ]
    );
    assert_eq!(docker.close, ConnectorCloseAction::TerminateSessionProcess);

    assert_eq!(kubernetes.connect.program, "kubectl");
    assert_eq!(
        kubernetes.connect.args,
        vec![
            "get".to_string(),
            "pod".to_string(),
            "web-0".to_string(),
            "-n".to_string(),
            "prod".to_string()
        ]
    );
    assert_eq!(
        kubernetes.exec.args,
        vec![
            "exec".to_string(),
            "-it".to_string(),
            "web-0".to_string(),
            "-n".to_string(),
            "prod".to_string(),
            "--".to_string(),
            "/bin/sh".to_string(),
            "-lc".to_string(),
            "pwd".to_string()
        ]
    );
    assert_eq!(
        kubernetes.diag.args,
        vec![
            "describe".to_string(),
            "pod".to_string(),
            "web-0".to_string(),
            "-n".to_string(),
            "prod".to_string()
        ]
    );
}

#[test]
fn builds_cli_launch_plan_from_connector_session_launch_request() {
    let request = ConnectorSessionLaunchRequest {
        workspace_id: "workspace-demo".to_string(),
        target: "docker-exec".to_string(),
        authority: "docker://workspace-dev".to_string(),
        command: vec!["/bin/sh".to_string(), "-lc".to_string(), "pwd".to_string()],
        mode_tags: vec!["cli-native".to_string()],
        tags: vec!["resource:docker-exec".to_string()],
    };

    let plan = build_cli_launch_plan_for_request(&request).unwrap();

    assert_eq!(plan.connector.target_kind, "docker-exec");
    assert_eq!(plan.connect.program, "docker");
    assert_eq!(
        plan.exec.args,
        vec![
            "exec".to_string(),
            "-it".to_string(),
            "workspace-dev".to_string(),
            "/bin/sh".to_string(),
            "-lc".to_string(),
            "pwd".to_string()
        ]
    );
}

#[test]
fn rejects_non_cli_targets_for_launch_plans() {
    let error =
        build_cli_launch_plan("remote-runtime", "runtime://edge-node-a", &["bash"]).unwrap_err();

    assert_eq!(
        error,
        ConnectorPlanError::UnsupportedTarget("remote-runtime".to_string())
    );
}

#[test]
fn executes_connect_phase_with_runner_and_records_command() {
    let plan = build_cli_launch_plan("ssh", "ops@prod-bastion", &["bash", "-l"]).unwrap();
    let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
        status: 0,
        stdout: "connected".to_string(),
        stderr: String::new(),
    })]);

    let output = execute_plan_phase(&plan, ConnectorPhase::Connect, &runner).unwrap();

    assert_eq!(output.status, 0);
    assert_eq!(output.stdout, "connected");
    assert_eq!(runner.commands.borrow().len(), 1);
    assert_eq!(runner.commands.borrow()[0].program, "ssh");
}

#[test]
fn classifies_exec_phase_failures_with_phase_and_retryability() {
    let plan = build_cli_launch_plan(
        "docker-exec",
        "docker://workspace-dev",
        &["/bin/sh", "-lc", "pwd"],
    )
    .unwrap();
    let runner = StubRunner::with_outcomes(vec![StubOutcome::Err(CommandRunnerError::Exit {
        status: 126,
        stderr: "permission denied".to_string(),
    })]);

    let error = execute_plan_phase(&plan, ConnectorPhase::Exec, &runner).unwrap_err();

    assert_eq!(error.phase, ConnectorPhase::Exec);
    assert_eq!(error.code, "connector_exec_failed");
    assert!(!error.retryable);
    assert_eq!(error.program, "docker");
    assert_eq!(error.status, Some(126));
    assert!(error.message.contains("permission denied"));
}

#[test]
fn classifies_connect_spawn_failures_as_retryable_connector_errors() {
    let plan = build_cli_launch_plan("kubernetes-exec", "k8s://prod/web-0", &["bash"]).unwrap();
    let runner = StubRunner::with_outcomes(vec![StubOutcome::Err(CommandRunnerError::Spawn(
        "kubectl not found".to_string(),
    ))]);

    let error = execute_plan_phase(&plan, ConnectorPhase::Connect, &runner).unwrap_err();

    assert_eq!(error.phase, ConnectorPhase::Connect);
    assert_eq!(error.code, "connector_connect_failed");
    assert!(error.retryable);
    assert_eq!(error.program, "kubectl");
    assert_eq!(error.status, None);
    assert!(error.message.contains("kubectl not found"));
}

#[test]
fn system_command_runner_executes_local_success_commands() {
    let runner = SystemCommandRunner;
    let output = runner.run(&success_probe_command()).unwrap();

    assert_eq!(output.status, 0);
}

#[test]
fn system_command_runner_maps_non_zero_exit_codes() {
    let runner = SystemCommandRunner;
    let error = runner.run(&failure_probe_command()).unwrap_err();

    assert_eq!(
        error,
        CommandRunnerError::Exit {
            status: failure_probe_status(),
            stderr: failure_probe_stderr(),
        }
    );
}

#[test]
fn builds_toolchain_smoke_commands_for_cli_connectors() {
    let ssh = build_toolchain_smoke_command("ssh").unwrap();
    let docker = build_toolchain_smoke_command("docker-exec").unwrap();
    let kubernetes = build_toolchain_smoke_command("kubernetes-exec").unwrap();

    assert_eq!(ssh.program, "ssh");
    assert_eq!(ssh.args, vec!["-V".to_string()]);
    assert_eq!(docker.program, "docker");
    assert_eq!(docker.args, vec!["-v".to_string()]);
    assert_eq!(kubernetes.program, "kubectl");
    assert_eq!(
        kubernetes.args,
        vec![
            "version".to_string(),
            "--client".to_string(),
            "--output=json".to_string()
        ]
    );
}

#[test]
fn toolchain_smoke_skips_when_binary_is_missing() {
    let runner = StubRunner::with_outcomes(vec![StubOutcome::Err(CommandRunnerError::Spawn(
        "program not found".to_string(),
    ))]);

    let report = run_toolchain_smoke("docker-exec", &runner).unwrap();

    assert_eq!(report.status, ConnectorSmokeStatus::Skipped);
    assert_eq!(report.target_kind, "docker-exec");
    assert!(report.details.contains("program not found"));
}

#[test]
fn toolchain_smoke_fails_when_binary_returns_non_zero_exit() {
    let runner = StubRunner::with_outcomes(vec![StubOutcome::Err(CommandRunnerError::Exit {
        status: 1,
        stderr: "broken cli".to_string(),
    })]);

    let report = run_toolchain_smoke("ssh", &runner).unwrap();

    assert_eq!(report.status, ConnectorSmokeStatus::Failed);
    assert_eq!(report.target_kind, "ssh");
    assert!(report.details.contains("broken cli"));
}

#[test]
fn toolchain_smoke_passes_on_successful_cli_probe() {
    let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
        status: 0,
        stdout: "OpenSSH_9.5".to_string(),
        stderr: String::new(),
    })]);

    let report = run_toolchain_smoke("ssh", &runner).unwrap();

    assert_eq!(report.status, ConnectorSmokeStatus::Passed);
    assert_eq!(report.command.program, "ssh");
    assert!(report.details.contains("OpenSSH_9.5"));
}

#[test]
fn discovers_launchable_connector_targets_from_host_tooling_and_config() {
    let home_dir = temp_home_dir("connector-discovery-ready");
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
            stdout: "OpenSSH_9.8".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "Docker version 27.0.0".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "workspace-dev\nworkspace-api".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "{\"clientVersion\":{\"gitVersion\":\"v1.30.0\"}}".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "prod-cluster".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "prod/web-0\nprod/web-1".to_string(),
            stderr: String::new(),
        }),
    ]);

    let catalog = discover_connector_execution_targets(
        &runner,
        &ConnectorDiscoveryEnvironment {
            workspace_id: "workspace-desktop".to_string(),
            home_dir: Some(home_dir.clone()),
            ssh_authority: None,
            docker_authority: None,
            kubernetes_authority: None,
            remote_runtime_authority: Some("runtime://edge-node-a".to_string()),
        },
        "2026-04-10T15:00:00.000Z",
    );

    assert_eq!(catalog.len(), 7);
    assert_eq!(catalog[0].kind, "ssh");
    assert_eq!(catalog[0].authority, "prod-bastion");
    assert_eq!(catalog[0].health, ConnectorHealth::Ready);
    assert!(catalog[0].session_launchable);
    assert_eq!(catalog[1].kind, "ssh");
    assert_eq!(catalog[1].authority, "stage-bastion");
    assert_eq!(catalog[1].health, ConnectorHealth::Ready);
    assert!(catalog[1].session_launchable);
    assert_eq!(catalog[2].kind, "docker-exec");
    assert_eq!(catalog[2].authority, "docker://workspace-dev");
    assert_eq!(catalog[2].health, ConnectorHealth::Ready);
    assert!(catalog[2].session_launchable);
    assert_eq!(catalog[3].kind, "docker-exec");
    assert_eq!(catalog[3].authority, "docker://workspace-api");
    assert_eq!(catalog[3].health, ConnectorHealth::Ready);
    assert!(catalog[3].session_launchable);
    assert_eq!(catalog[4].kind, "kubernetes-exec");
    assert_eq!(catalog[4].authority, "k8s://prod/web-0");
    assert_eq!(catalog[4].health, ConnectorHealth::Ready);
    assert!(catalog[4].session_launchable);
    assert_eq!(catalog[5].kind, "kubernetes-exec");
    assert_eq!(catalog[5].authority, "k8s://prod/web-1");
    assert_eq!(catalog[5].health, ConnectorHealth::Ready);
    assert!(catalog[5].session_launchable);
    assert_eq!(catalog[6].kind, "remote-runtime");
    assert_eq!(catalog[6].authority, "runtime://edge-node-a");
    assert_eq!(catalog[6].health, ConnectorHealth::Degraded);
    assert!(!catalog[6].session_launchable);

    let ssh_targets = catalog
        .iter()
        .filter(|target| target.kind == "ssh")
        .map(|target| target.authority.as_str())
        .collect::<Vec<_>>();
    let docker_targets = catalog
        .iter()
        .filter(|target| target.kind == "docker-exec")
        .map(|target| target.authority.as_str())
        .collect::<Vec<_>>();
    let kubernetes_targets = catalog
        .iter()
        .filter(|target| target.kind == "kubernetes-exec")
        .map(|target| target.authority.as_str())
        .collect::<Vec<_>>();

    assert_eq!(ssh_targets, vec!["prod-bastion", "stage-bastion"]);
    assert_eq!(
        docker_targets,
        vec!["docker://workspace-dev", "docker://workspace-api"]
    );
    assert_eq!(
        kubernetes_targets,
        vec!["k8s://prod/web-0", "k8s://prod/web-1"]
    );

    let _ = fs::remove_dir_all(home_dir);
}

#[test]
fn preserves_configured_authority_priority_and_dedupes_discovered_inventory() {
    let home_dir = temp_home_dir("connector-discovery-priority");
    let ssh_dir = home_dir.join(".ssh");
    fs::create_dir_all(&ssh_dir).unwrap();
    fs::write(
        ssh_dir.join("config"),
        "Host stage-bastion prod-bastion\n  HostName 10.0.0.11\n",
    )
    .unwrap();
    fs::write(
        ssh_dir.join("known_hosts"),
        "stage-bastion ssh-ed25519 AAAA",
    )
    .unwrap();

    let runner = StubRunner::with_outcomes(vec![
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "OpenSSH_9.8".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "Docker version 27.0.0".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "workspace-api\nworkspace-dev\nworkspace-api".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "{\"clientVersion\":{\"gitVersion\":\"v1.30.0\"}}".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "prod-cluster".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "prod/web-1\nprod/web-0\nprod/web-1".to_string(),
            stderr: String::new(),
        }),
    ]);

    let catalog = discover_connector_execution_targets(
        &runner,
        &ConnectorDiscoveryEnvironment {
            workspace_id: "workspace-desktop".to_string(),
            home_dir: Some(home_dir.clone()),
            ssh_authority: Some("prod-bastion".to_string()),
            docker_authority: Some("docker://workspace-api".to_string()),
            kubernetes_authority: Some("k8s://prod/web-1".to_string()),
            remote_runtime_authority: None,
        },
        "2026-04-10T15:20:00.000Z",
    );

    let ssh_targets = catalog
        .iter()
        .filter(|target| target.kind == "ssh")
        .map(|target| target.authority.as_str())
        .collect::<Vec<_>>();
    let docker_targets = catalog
        .iter()
        .filter(|target| target.kind == "docker-exec")
        .map(|target| target.authority.as_str())
        .collect::<Vec<_>>();
    let kubernetes_targets = catalog
        .iter()
        .filter(|target| target.kind == "kubernetes-exec")
        .map(|target| target.authority.as_str())
        .collect::<Vec<_>>();

    assert_eq!(ssh_targets, vec!["prod-bastion", "stage-bastion"]);
    assert_eq!(
        docker_targets,
        vec!["docker://workspace-api", "docker://workspace-dev"]
    );
    assert_eq!(
        kubernetes_targets,
        vec!["k8s://prod/web-1", "k8s://prod/web-0"]
    );

    let _ = fs::remove_dir_all(home_dir);
}

#[test]
fn marks_connectors_unlaunchable_when_host_tooling_or_targets_are_missing() {
    let home_dir = temp_home_dir("connector-discovery-missing");
    let runner = StubRunner::with_outcomes(vec![
        StubOutcome::Err(CommandRunnerError::Spawn("ssh not found".to_string())),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "Docker version 27.0.0".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: String::new(),
            stderr: String::new(),
        }),
        StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "{\"clientVersion\":{\"gitVersion\":\"v1.30.0\"}}".to_string(),
            stderr: String::new(),
        }),
        StubOutcome::Err(CommandRunnerError::Exit {
            status: 1,
            stderr: "current-context is not set".to_string(),
        }),
    ]);

    let catalog = discover_connector_execution_targets(
        &runner,
        &ConnectorDiscoveryEnvironment {
            workspace_id: "workspace-desktop".to_string(),
            home_dir: Some(home_dir.clone()),
            ssh_authority: None,
            docker_authority: None,
            kubernetes_authority: None,
            remote_runtime_authority: None,
        },
        "2026-04-10T15:05:00.000Z",
    );

    assert_eq!(catalog.len(), 4);
    assert_eq!(catalog[0].kind, "ssh");
    assert_eq!(catalog[0].health, ConnectorHealth::Unavailable);
    assert!(!catalog[0].session_launchable);
    assert_eq!(catalog[1].kind, "docker-exec");
    assert_eq!(catalog[1].health, ConnectorHealth::Degraded);
    assert!(!catalog[1].session_launchable);
    assert_eq!(catalog[2].kind, "kubernetes-exec");
    assert_eq!(catalog[2].health, ConnectorHealth::Degraded);
    assert!(!catalog[2].session_launchable);
    assert_eq!(catalog[3].kind, "remote-runtime");
    assert_eq!(catalog[3].health, ConnectorHealth::Unavailable);
    assert!(!catalog[3].session_launchable);

    let _ = fs::remove_dir_all(home_dir);
}

fn success_probe_command() -> ConnectorCommand {
    if cfg!(windows) {
        ConnectorCommand {
            program: "cmd",
            args: vec!["/C".to_string(), "exit 0".to_string()],
        }
    } else {
        ConnectorCommand {
            program: "sh",
            args: vec!["-lc".to_string(), "true".to_string()],
        }
    }
}

fn failure_probe_command() -> ConnectorCommand {
    if cfg!(windows) {
        ConnectorCommand {
            program: "cmd",
            args: vec![
                "/C".to_string(),
                format!(
                    "echo {} 1>&2 && exit {}",
                    failure_probe_stderr(),
                    failure_probe_status()
                ),
            ],
        }
    } else {
        ConnectorCommand {
            program: "sh",
            args: vec![
                "-lc".to_string(),
                format!(
                    "echo {} 1>&2; exit {}",
                    failure_probe_stderr(),
                    failure_probe_status()
                ),
            ],
        }
    }
}

fn failure_probe_status() -> i32 {
    7
}

fn failure_probe_stderr() -> String {
    "runner-smoke-failed".to_string()
}

fn temp_home_dir(name: &str) -> PathBuf {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();

    std::env::temp_dir().join(format!("sdkwork-terminal-{name}-{unique}"))
}
