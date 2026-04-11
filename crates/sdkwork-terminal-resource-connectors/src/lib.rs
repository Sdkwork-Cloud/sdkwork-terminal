use std::{
    env, fs,
    path::{Path, PathBuf},
};

pub const CRATE_ID: &str = "sdkwork-terminal-resource-connectors";
const DEFAULT_DISCOVERY_WORKSPACE_ID: &str = "workspace-demo";
const SSH_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_SSH_AUTHORITY";
const DOCKER_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_DOCKER_AUTHORITY";
const KUBERNETES_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_KUBERNETES_AUTHORITY";
const REMOTE_RUNTIME_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_REMOTE_RUNTIME_AUTHORITY";

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
pub enum CommandRunnerError {
    Spawn(String),
    Exit { status: i32, stderr: String },
}

pub trait CommandRunner {
    fn run(&self, command: &ConnectorCommand) -> Result<CommandOutput, CommandRunnerError>;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct SystemCommandRunner;

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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConnectorDiscoveryEnvironment {
    pub workspace_id: String,
    pub home_dir: Option<PathBuf>,
    pub ssh_authority: Option<String>,
    pub docker_authority: Option<String>,
    pub kubernetes_authority: Option<String>,
    pub remote_runtime_authority: Option<String>,
}

impl Default for ConnectorDiscoveryEnvironment {
    fn default() -> Self {
        Self {
            workspace_id: DEFAULT_DISCOVERY_WORKSPACE_ID.to_string(),
            home_dir: None,
            ssh_authority: None,
            docker_authority: None,
            kubernetes_authority: None,
            remote_runtime_authority: None,
        }
    }
}

impl ConnectorDiscoveryEnvironment {
    pub fn from_process() -> Self {
        Self {
            workspace_id: DEFAULT_DISCOVERY_WORKSPACE_ID.to_string(),
            home_dir: resolve_home_dir_from_env(),
            ssh_authority: normalize_optional_string(env::var(SSH_AUTHORITY_ENV_VAR).ok()),
            docker_authority: normalize_optional_string(env::var(DOCKER_AUTHORITY_ENV_VAR).ok())
                .map(normalize_docker_authority),
            kubernetes_authority: normalize_optional_string(
                env::var(KUBERNETES_AUTHORITY_ENV_VAR).ok(),
            )
            .map(normalize_kubernetes_authority),
            remote_runtime_authority: normalize_optional_string(
                env::var(REMOTE_RUNTIME_AUTHORITY_ENV_VAR).ok(),
            )
            .map(normalize_remote_runtime_authority),
        }
    }
}

impl CommandRunner for SystemCommandRunner {
    fn run(&self, command: &ConnectorCommand) -> Result<CommandOutput, CommandRunnerError> {
        let output = std::process::Command::new(command.program)
            .args(&command.args)
            .output()
            .map_err(|cause| CommandRunnerError::Spawn(cause.to_string()))?;
        let status = output.status.code().unwrap_or(-1);
        let stdout = normalize_command_stream(output.stdout);
        let stderr = normalize_command_stream(output.stderr);

        if output.status.success() {
            Ok(CommandOutput {
                status,
                stdout,
                stderr,
            })
        } else {
            Err(CommandRunnerError::Exit { status, stderr })
        }
    }
}

pub fn crate_id() -> &'static str {
    CRATE_ID
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

pub fn build_cli_launch_plan(
    target_kind: &str,
    authority: &str,
    command: &[&str],
) -> Result<ConnectorLaunchPlan, ConnectorPlanError> {
    let connector = find_connector(target_kind)
        .ok_or_else(|| ConnectorPlanError::UnsupportedTarget(target_kind.to_string()))?;

    if !matches!(connector.transport, ConnectorTransport::SystemCli) {
        return Err(ConnectorPlanError::UnsupportedTarget(
            target_kind.to_string(),
        ));
    }

    let exec_command = if command.is_empty() {
        vec!["/bin/sh".to_string()]
    } else {
        command.iter().map(|item| (*item).to_string()).collect()
    };

    match target_kind {
        "ssh" => Ok(ConnectorLaunchPlan {
            connector,
            connect: command_spec(
                "ssh",
                [
                    "-o".to_string(),
                    "BatchMode=yes".to_string(),
                    "-o".to_string(),
                    "ConnectTimeout=5".to_string(),
                    authority.to_string(),
                    "--".to_string(),
                    "exit".to_string(),
                    "0".to_string(),
                ],
            ),
            exec: command_spec(
                "ssh",
                std::iter::once("-tt".to_string())
                    .chain(std::iter::once(authority.to_string()))
                    .chain(std::iter::once("--".to_string()))
                    .chain(exec_command),
            ),
            diag: command_spec("ssh", ["-V".to_string()]),
            close: ConnectorCloseAction::TerminateSessionProcess,
        }),
        "docker-exec" => {
            let container = parse_prefixed_authority(authority, "docker://")?;

            Ok(ConnectorLaunchPlan {
                connector,
                connect: command_spec(
                    "docker",
                    [
                        "inspect".to_string(),
                        "--format".to_string(),
                        "{{.State.Running}}".to_string(),
                        container.clone(),
                    ],
                ),
                exec: command_spec(
                    "docker",
                    std::iter::once("exec".to_string())
                        .chain(std::iter::once("-it".to_string()))
                        .chain(std::iter::once(container.clone()))
                        .chain(exec_command),
                ),
                diag: command_spec("docker", ["inspect".to_string(), container]),
                close: ConnectorCloseAction::TerminateSessionProcess,
            })
        }
        "kubernetes-exec" => {
            let (namespace, pod) = parse_kubernetes_authority(authority)?;

            Ok(ConnectorLaunchPlan {
                connector,
                connect: command_spec(
                    "kubectl",
                    [
                        "get".to_string(),
                        "pod".to_string(),
                        pod.clone(),
                        "-n".to_string(),
                        namespace.clone(),
                    ],
                ),
                exec: command_spec(
                    "kubectl",
                    std::iter::once("exec".to_string())
                        .chain(std::iter::once("-it".to_string()))
                        .chain(std::iter::once(pod.clone()))
                        .chain(std::iter::once("-n".to_string()))
                        .chain(std::iter::once(namespace.clone()))
                        .chain(std::iter::once("--".to_string()))
                        .chain(exec_command),
                ),
                diag: command_spec(
                    "kubectl",
                    [
                        "describe".to_string(),
                        "pod".to_string(),
                        pod,
                        "-n".to_string(),
                        namespace,
                    ],
                ),
                close: ConnectorCloseAction::TerminateSessionProcess,
            })
        }
        _ => Err(ConnectorPlanError::UnsupportedTarget(
            target_kind.to_string(),
        )),
    }
}

pub fn build_cli_launch_plan_for_request(
    request: &ConnectorSessionLaunchRequest,
) -> Result<ConnectorLaunchPlan, ConnectorPlanError> {
    let command = request
        .command
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>();

    build_cli_launch_plan(&request.target, &request.authority, &command)
}

pub fn execute_plan_phase(
    plan: &ConnectorLaunchPlan,
    phase: ConnectorPhase,
    runner: &impl CommandRunner,
) -> Result<CommandOutput, ConnectorExecutionError> {
    let command = command_for_phase(plan, phase);

    runner
        .run(command)
        .map_err(|error| classify_runner_error(command.program, phase, error))
}

pub fn build_toolchain_smoke_command(
    target_kind: &str,
) -> Result<ConnectorCommand, ConnectorPlanError> {
    match target_kind {
        "ssh" => Ok(command_spec("ssh", ["-V".to_string()])),
        "docker-exec" => Ok(command_spec("docker", ["-v".to_string()])),
        "kubernetes-exec" => Ok(command_spec(
            "kubectl",
            [
                "version".to_string(),
                "--client".to_string(),
                "--output=json".to_string(),
            ],
        )),
        _ => Err(ConnectorPlanError::UnsupportedTarget(
            target_kind.to_string(),
        )),
    }
}

pub fn run_toolchain_smoke(
    target_kind: &str,
    runner: &impl CommandRunner,
) -> Result<ConnectorSmokeReport, ConnectorPlanError> {
    let command = build_toolchain_smoke_command(target_kind)?;

    let (status, details) = match runner.run(&command) {
        Ok(output) => (
            ConnectorSmokeStatus::Passed,
            format_smoke_details(output.stdout, output.stderr, output.status),
        ),
        Err(CommandRunnerError::Spawn(message)) => (ConnectorSmokeStatus::Skipped, message),
        Err(CommandRunnerError::Exit { status, stderr }) => (
            ConnectorSmokeStatus::Failed,
            format_smoke_details(String::new(), stderr, status),
        ),
    };

    Ok(ConnectorSmokeReport {
        target_kind: target_kind.to_string(),
        command,
        status,
        details,
    })
}

pub fn discover_connector_execution_targets(
    runner: &impl CommandRunner,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> Vec<ConnectorExecutionTarget> {
    let mut targets = Vec::new();
    targets.extend(discover_ssh_execution_targets(
        runner,
        environment,
        occurred_at,
    ));
    targets.extend(discover_docker_execution_targets(
        runner,
        environment,
        occurred_at,
    ));
    targets.extend(discover_kubernetes_execution_targets(
        runner,
        environment,
        occurred_at,
    ));
    targets.push(discover_remote_runtime_execution_target(
        environment,
        occurred_at,
    ));
    targets
}

fn discover_ssh_execution_targets(
    runner: &impl CommandRunner,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> Vec<ConnectorExecutionTarget> {
    let connector = find_connector("ssh").expect("ssh connector descriptor must exist");
    let report = run_toolchain_smoke("ssh", runner).expect("ssh smoke command must be supported");
    let authorities = merge_authority_inventory(
        environment.ssh_authority.clone(),
        discover_ssh_authorities_from_home(environment.home_dir.as_deref()),
    );
    let has_known_hosts = environment
        .home_dir
        .as_ref()
        .map(|home_dir| home_dir.join(".ssh").join("known_hosts").is_file())
        .unwrap_or(false);

    match report.status {
        ConnectorSmokeStatus::Passed if !authorities.is_empty() => authorities
            .into_iter()
            .map(|authority| {
                let (health, health_summary) = if has_known_hosts {
                    (
                        ConnectorHealth::Ready,
                        format!("{} detected. SSH target {} is ready.", report.details, authority),
                    )
                } else {
                    (
                        ConnectorHealth::Degraded,
                        format!(
                            "{} detected. SSH target {} was discovered; first launch may require host-key confirmation.",
                            report.details, authority
                        ),
                    )
                };

                connector_execution_target(
                    connector,
                    environment,
                    occurred_at,
                    authority,
                    health,
                    true,
                    health_summary,
                )
            })
            .collect(),
        ConnectorSmokeStatus::Passed => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            "ssh://unconfigured".to_string(),
            ConnectorHealth::Degraded,
            false,
            format!(
                "{} detected, but no SSH target was discovered. Set {} or add a Host entry to ~/.ssh/config.",
                report.details, SSH_AUTHORITY_ENV_VAR
            ),
        )],
        ConnectorSmokeStatus::Failed => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            authorities
                .first()
                .cloned()
                .unwrap_or_else(|| "ssh://unconfigured".to_string()),
            ConnectorHealth::Degraded,
            false,
            format!("SSH probe failed: {}.", report.details),
        )],
        ConnectorSmokeStatus::Skipped => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            authorities
                .first()
                .cloned()
                .unwrap_or_else(|| "ssh://unconfigured".to_string()),
            ConnectorHealth::Unavailable,
            false,
            format!("SSH CLI unavailable: {}.", report.details),
        )],
    }
}

fn discover_docker_execution_targets(
    runner: &impl CommandRunner,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> Vec<ConnectorExecutionTarget> {
    let connector =
        find_connector("docker-exec").expect("docker-exec connector descriptor must exist");
    let report = run_toolchain_smoke("docker-exec", runner)
        .expect("docker-exec smoke command must be supported");

    match report.status {
        ConnectorSmokeStatus::Passed => match runner.run(&build_docker_container_discovery_command()) {
            Ok(output) => {
                let authorities = merge_authority_inventory(
                    environment.docker_authority.clone(),
                    nonempty_lines(&output.stdout)
                        .into_iter()
                        .map(normalize_docker_authority)
                        .collect(),
                );

                if authorities.is_empty() {
                    return vec![connector_execution_target(
                        connector,
                        environment,
                        occurred_at,
                        "docker://unconfigured".to_string(),
                        ConnectorHealth::Degraded,
                        false,
                        format!(
                            "{} detected, but no running containers were discovered. Set {} or start a target container.",
                            report.details, DOCKER_AUTHORITY_ENV_VAR
                        ),
                    )];
                }

                authorities
                    .into_iter()
                    .map(|authority| {
                        connector_execution_target(
                            connector,
                            environment,
                            occurred_at,
                            authority.clone(),
                            ConnectorHealth::Ready,
                            true,
                            format!(
                                "{} detected. Docker target {} is ready for interactive exec.",
                                report.details, authority
                            ),
                        )
                    })
                    .collect()
            }
            Err(error) => match environment.docker_authority.clone() {
                Some(authority) => vec![connector_execution_target(
                    connector,
                    environment,
                    occurred_at,
                    authority.clone(),
                    ConnectorHealth::Ready,
                    true,
                    format!(
                        "{} detected. Configured Docker target {} remains available; additional container inventory failed: {}.",
                        report.details,
                        authority,
                        describe_runner_error(error)
                    ),
                )],
                None => vec![connector_execution_target(
                    connector,
                    environment,
                    occurred_at,
                    "docker://unconfigured".to_string(),
                    classify_discovery_error_health(&error),
                    false,
                    format!(
                        "{} detected, but container discovery failed: {}.",
                        report.details,
                        describe_runner_error(error)
                    ),
                )],
            },
        },
        ConnectorSmokeStatus::Failed => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            environment
                .docker_authority
                .clone()
                .unwrap_or_else(|| "docker://unconfigured".to_string()),
            ConnectorHealth::Degraded,
            false,
            format!("Docker CLI probe failed: {}.", report.details),
        )],
        ConnectorSmokeStatus::Skipped => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            environment
                .docker_authority
                .clone()
                .unwrap_or_else(|| "docker://unconfigured".to_string()),
            ConnectorHealth::Unavailable,
            false,
            format!("Docker CLI unavailable: {}.", report.details),
        )],
    }
}

fn discover_kubernetes_execution_targets(
    runner: &impl CommandRunner,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> Vec<ConnectorExecutionTarget> {
    let connector =
        find_connector("kubernetes-exec").expect("kubernetes-exec connector descriptor must exist");
    let report = run_toolchain_smoke("kubernetes-exec", runner)
        .expect("kubernetes-exec smoke command must be supported");

    match report.status {
        ConnectorSmokeStatus::Passed => {
            let context = match runner.run(&build_kubernetes_context_discovery_command()) {
                Ok(output) => match first_nonempty_line(&output.stdout) {
                    Some(context) => context,
                    None => return vec![connector_execution_target(
                        connector,
                        environment,
                        occurred_at,
                        environment
                            .kubernetes_authority
                            .clone()
                            .unwrap_or_else(|| "k8s://unconfigured".to_string()),
                        ConnectorHealth::Degraded,
                        false,
                        format!(
                            "{} detected, but kubectl current-context returned no active context.",
                            report.details
                        ),
                    )],
                },
                Err(error) => {
                    return vec![connector_execution_target(
                        connector,
                        environment,
                        occurred_at,
                        environment
                            .kubernetes_authority
                            .clone()
                            .unwrap_or_else(|| "k8s://unconfigured".to_string()),
                        classify_discovery_error_health(&error),
                        false,
                        format!(
                            "{} detected, but kubectl current-context failed: {}.",
                            report.details,
                            describe_runner_error(error)
                        ),
                    )]
                }
            };

            match runner.run(&build_kubernetes_pod_discovery_command()) {
                Ok(output) => {
                    let authorities = merge_authority_inventory(
                        environment.kubernetes_authority.clone(),
                        nonempty_lines(&output.stdout)
                            .into_iter()
                            .map(normalize_kubernetes_authority)
                            .collect(),
                    );

                    if authorities.is_empty() {
                        return vec![connector_execution_target(
                            connector,
                            environment,
                            occurred_at,
                            "k8s://unconfigured".to_string(),
                            ConnectorHealth::Degraded,
                            false,
                            format!(
                                "{} detected. Context {} is active, but no pod target was discovered. Set {} or choose a running pod.",
                                report.details, context, KUBERNETES_AUTHORITY_ENV_VAR
                            ),
                        )];
                    }

                    authorities
                        .into_iter()
                        .map(|authority| {
                            connector_execution_target(
                                connector,
                                environment,
                                occurred_at,
                                authority.clone(),
                                ConnectorHealth::Ready,
                                true,
                                format!(
                                    "{} detected. kubectl context {} is ready for target {}.",
                                    report.details, context, authority
                                ),
                            )
                        })
                        .collect()
                }
                Err(error) => match environment.kubernetes_authority.clone() {
                    Some(authority) => vec![connector_execution_target(
                        connector,
                        environment,
                        occurred_at,
                        authority.clone(),
                        ConnectorHealth::Ready,
                        true,
                        format!(
                            "{} detected. Context {} is active and configured target {} remains available; additional pod inventory failed: {}.",
                            report.details,
                            context,
                            authority,
                            describe_runner_error(error)
                        ),
                    )],
                    None => vec![connector_execution_target(
                        connector,
                        environment,
                        occurred_at,
                        "k8s://unconfigured".to_string(),
                        classify_discovery_error_health(&error),
                        false,
                        format!(
                            "{} detected. Context {} is active, but pod discovery failed: {}.",
                            report.details,
                            context,
                            describe_runner_error(error)
                        ),
                    )],
                },
            }
        }
        ConnectorSmokeStatus::Failed => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            environment
                .kubernetes_authority
                .clone()
                .unwrap_or_else(|| "k8s://unconfigured".to_string()),
            ConnectorHealth::Degraded,
            false,
            format!("kubectl probe failed: {}.", report.details),
        )],
        ConnectorSmokeStatus::Skipped => vec![connector_execution_target(
            connector,
            environment,
            occurred_at,
            environment
                .kubernetes_authority
                .clone()
                .unwrap_or_else(|| "k8s://unconfigured".to_string()),
            ConnectorHealth::Unavailable,
            false,
            format!("kubectl CLI unavailable: {}.", report.details),
        )],
    }
}

fn discover_remote_runtime_execution_target(
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
) -> ConnectorExecutionTarget {
    let connector =
        find_connector("remote-runtime").expect("remote-runtime connector descriptor must exist");

    match environment.remote_runtime_authority.clone() {
        Some(authority) => connector_execution_target(
            connector,
            environment,
            occurred_at,
            authority.clone(),
            ConnectorHealth::Degraded,
            false,
            format!(
                "Remote runtime authority {} is configured, but desktop interactive attach is not enabled yet.",
                authority
            ),
        ),
        None => connector_execution_target(
            connector,
            environment,
            occurred_at,
            "runtime://unconfigured".to_string(),
            ConnectorHealth::Unavailable,
            false,
            format!(
                "Set {} after registering a healthy runtime node.",
                REMOTE_RUNTIME_AUTHORITY_ENV_VAR
            ),
        ),
    }
}

fn command_spec(program: &'static str, args: impl IntoIterator<Item = String>) -> ConnectorCommand {
    ConnectorCommand {
        program,
        args: args.into_iter().collect(),
    }
}

fn parse_prefixed_authority(authority: &str, prefix: &str) -> Result<String, ConnectorPlanError> {
    authority
        .strip_prefix(prefix)
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ConnectorPlanError::InvalidAuthority(authority.to_string()))
}

fn parse_kubernetes_authority(authority: &str) -> Result<(String, String), ConnectorPlanError> {
    let value = parse_prefixed_authority(authority, "k8s://")?;
    let (namespace, pod) = value
        .split_once('/')
        .ok_or_else(|| ConnectorPlanError::InvalidAuthority(authority.to_string()))?;

    if namespace.is_empty() || pod.is_empty() {
        return Err(ConnectorPlanError::InvalidAuthority(authority.to_string()));
    }

    Ok((namespace.to_string(), pod.to_string()))
}

fn command_for_phase(plan: &ConnectorLaunchPlan, phase: ConnectorPhase) -> &ConnectorCommand {
    match phase {
        ConnectorPhase::Connect => &plan.connect,
        ConnectorPhase::Exec => &plan.exec,
        ConnectorPhase::Diag => &plan.diag,
    }
}

fn classify_runner_error(
    program: &'static str,
    phase: ConnectorPhase,
    error: CommandRunnerError,
) -> ConnectorExecutionError {
    let code = match phase {
        ConnectorPhase::Connect => "connector_connect_failed",
        ConnectorPhase::Exec => "connector_exec_failed",
        ConnectorPhase::Diag => "connector_diag_failed",
    };
    let retryable = matches!(phase, ConnectorPhase::Connect);

    match error {
        CommandRunnerError::Spawn(message) => ConnectorExecutionError {
            code,
            phase,
            retryable,
            program,
            status: None,
            message,
        },
        CommandRunnerError::Exit { status, stderr } => ConnectorExecutionError {
            code,
            phase,
            retryable,
            program,
            status: Some(status),
            message: stderr,
        },
    }
}

fn format_smoke_details(stdout: String, stderr: String, status: i32) -> String {
    if !stdout.is_empty() {
        stdout
    } else if !stderr.is_empty() {
        stderr
    } else {
        format!("command exited with status {}", status)
    }
}

fn normalize_command_stream(bytes: Vec<u8>) -> String {
    String::from_utf8_lossy(&bytes).trim_end().to_string()
}

fn connector_execution_target(
    connector: ConnectorDescriptor,
    environment: &ConnectorDiscoveryEnvironment,
    occurred_at: &str,
    authority: String,
    health: ConnectorHealth,
    session_launchable: bool,
    health_summary: String,
) -> ConnectorExecutionTarget {
    ConnectorExecutionTarget {
        target_id: connector_execution_target_id(connector, &authority),
        workspace_id: discovery_workspace_id(environment),
        kind: connector.target_kind.to_string(),
        label: connector_target_label(connector).to_string(),
        authority,
        connector_id: connector.id.to_string(),
        connector_label: connector_target_connector_label(connector).to_string(),
        transport: connector.transport,
        diagnostics_hint: connector.diagnostics_hint.to_string(),
        health,
        health_summary,
        last_checked_at: occurred_at.to_string(),
        session_launchable,
        tags: connector_target_tags(connector),
    }
}

fn connector_target_label(connector: ConnectorDescriptor) -> &'static str {
    match connector.target_kind {
        "ssh" => "SSH",
        "docker-exec" => "Docker Exec",
        "kubernetes-exec" => "Kubernetes Exec",
        "remote-runtime" => "Remote Runtime",
        _ => connector.display_name,
    }
}

fn connector_target_connector_label(connector: ConnectorDescriptor) -> &'static str {
    match connector.target_kind {
        "ssh" => "System SSH",
        "docker-exec" => "Docker CLI",
        "kubernetes-exec" => "kubectl",
        "remote-runtime" => "Runtime Node API",
        _ => connector.display_name,
    }
}

fn connector_target_tags(connector: ConnectorDescriptor) -> Vec<String> {
    match connector.target_kind {
        "ssh" => vec!["remote".to_string(), "system-ssh".to_string()],
        "docker-exec" => vec!["container".to_string(), "docker".to_string()],
        "kubernetes-exec" => vec!["cluster".to_string(), "kubernetes".to_string()],
        "remote-runtime" => vec!["server".to_string(), "planned".to_string()],
        _ => vec!["desktop".to_string()],
    }
}

fn connector_execution_target_id(connector: ConnectorDescriptor, authority: &str) -> String {
    let kind_fragment = sanitize_target_fragment(connector.target_kind);
    let authority_fragment = sanitize_target_fragment(authority);

    if authority_fragment.is_empty() {
        format!("target-{kind_fragment}-default")
    } else {
        format!("target-{kind_fragment}-{authority_fragment}")
    }
}

fn sanitize_target_fragment(value: &str) -> String {
    let mut fragment = String::with_capacity(value.len());
    let mut last_was_dash = false;

    for character in value.chars() {
        let normalized = if character.is_ascii_alphanumeric() {
            Some(character.to_ascii_lowercase())
        } else {
            None
        };

        match normalized {
            Some(character) => {
                fragment.push(character);
                last_was_dash = false;
            }
            None if !last_was_dash => {
                fragment.push('-');
                last_was_dash = true;
            }
            None => {}
        }
    }

    fragment.trim_matches('-').to_string()
}

fn discovery_workspace_id(environment: &ConnectorDiscoveryEnvironment) -> String {
    normalize_optional_string(Some(environment.workspace_id.clone()))
        .unwrap_or_else(|| DEFAULT_DISCOVERY_WORKSPACE_ID.to_string())
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn resolve_home_dir_from_env() -> Option<PathBuf> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("USERPROFILE").map(PathBuf::from))
        .or_else(|| {
            let drive = env::var_os("HOMEDRIVE")?;
            let path = env::var_os("HOMEPATH")?;
            Some(PathBuf::from(format!(
                "{}{}",
                drive.to_string_lossy(),
                path.to_string_lossy()
            )))
        })
}

fn discover_ssh_authorities_from_home(home_dir: Option<&Path>) -> Vec<String> {
    let config_path = match home_dir {
        Some(home_dir) => home_dir.join(".ssh").join("config"),
        None => return Vec::new(),
    };
    let contents = match fs::read_to_string(config_path) {
        Ok(contents) => contents,
        Err(_) => return Vec::new(),
    };
    let mut authorities = Vec::new();

    for line in contents.lines() {
        let trimmed = line.split('#').next().unwrap_or_default().trim();
        if trimmed.is_empty() {
            continue;
        }

        let mut parts = trimmed.split_whitespace();
        if !matches!(parts.next(), Some(keyword) if keyword.eq_ignore_ascii_case("host")) {
            continue;
        }

        for candidate in parts {
            if is_valid_ssh_host_alias(candidate) {
                authorities.push(candidate.to_string());
            }
        }
    }

    dedupe_strings(authorities)
}

fn is_valid_ssh_host_alias(candidate: &str) -> bool {
    !candidate.is_empty()
        && !candidate.starts_with('!')
        && !candidate.contains('*')
        && !candidate.contains('?')
}

fn normalize_docker_authority(authority: String) -> String {
    if authority.starts_with("docker://") {
        authority
    } else {
        format!("docker://{}", authority.trim())
    }
}

fn normalize_kubernetes_authority(authority: String) -> String {
    if authority.starts_with("k8s://") {
        authority
    } else {
        format!("k8s://{}", authority.trim())
    }
}

fn normalize_remote_runtime_authority(authority: String) -> String {
    if authority.starts_with("runtime://") {
        authority
    } else {
        format!("runtime://{}", authority.trim())
    }
}

fn build_docker_container_discovery_command() -> ConnectorCommand {
    command_spec(
        "docker",
        [
            "ps".to_string(),
            "--format".to_string(),
            "{{.Names}}".to_string(),
        ],
    )
}

fn build_kubernetes_context_discovery_command() -> ConnectorCommand {
    command_spec(
        "kubectl",
        ["config".to_string(), "current-context".to_string()],
    )
}

fn build_kubernetes_pod_discovery_command() -> ConnectorCommand {
    command_spec(
        "kubectl",
        [
            "get".to_string(),
            "pods".to_string(),
            "-A".to_string(),
            "-o".to_string(),
            "jsonpath={range .items[*]}{.metadata.namespace}/{.metadata.name}{\"\\n\"}{end}"
                .to_string(),
        ],
    )
}

fn first_nonempty_line(value: &str) -> Option<String> {
    value
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(ToString::to_string)
}

fn nonempty_lines(value: &str) -> Vec<String> {
    value
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn merge_authority_inventory(
    configured_authority: Option<String>,
    discovered_authorities: Vec<String>,
) -> Vec<String> {
    let mut authorities = Vec::new();

    if let Some(authority) = normalize_optional_string(configured_authority) {
        authorities.push(authority);
    }

    authorities.extend(
        discovered_authorities
            .into_iter()
            .filter_map(|authority| normalize_optional_string(Some(authority))),
    );

    dedupe_strings(authorities)
}

fn dedupe_strings(values: Vec<String>) -> Vec<String> {
    let mut deduped = Vec::with_capacity(values.len());

    for value in values {
        if deduped.iter().any(|existing| existing == &value) {
            continue;
        }

        deduped.push(value);
    }

    deduped
}

fn classify_discovery_error_health(error: &CommandRunnerError) -> ConnectorHealth {
    match error {
        CommandRunnerError::Spawn(_) => ConnectorHealth::Unavailable,
        CommandRunnerError::Exit { .. } => ConnectorHealth::Degraded,
    }
}

fn describe_runner_error(error: CommandRunnerError) -> String {
    match error {
        CommandRunnerError::Spawn(message) => message,
        CommandRunnerError::Exit { status, stderr } if stderr.trim().is_empty() => {
            format!("exit status {}", status)
        }
        CommandRunnerError::Exit { status, stderr } => format!("{stderr} (exit {status})"),
    }
}

#[cfg(test)]
mod tests {
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
        let error = build_cli_launch_plan("remote-runtime", "runtime://edge-node-a", &["bash"])
            .unwrap_err();

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
}
