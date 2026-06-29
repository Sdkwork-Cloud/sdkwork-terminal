use crate::constants::{
    DEFAULT_DISCOVERY_WORKSPACE_ID, DOCKER_AUTHORITY_ENV_VAR, KUBERNETES_AUTHORITY_ENV_VAR,
    REMOTE_RUNTIME_AUTHORITY_ENV_VAR, SSH_AUTHORITY_ENV_VAR,
};
use crate::launch::{command_spec, run_toolchain_smoke};
use crate::runner::{CommandRunner, CommandRunnerError};
use crate::types::{
    find_connector, ConnectorCommand, ConnectorDescriptor, ConnectorExecutionTarget,
    ConnectorHealth, ConnectorSmokeStatus,
};
use sdkwork_utils_rust::is_blank;
use std::{
    env, fs,
    path::{Path, PathBuf},
};

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
                    None => {
                        return vec![connector_execution_target(
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
                        )]
                    }
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
                "Remote runtime authority {} is configured for web-shell launch via runtime-node API; desktop catalog remains read-only until interactive attach ships.",
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
        CommandRunnerError::Exit { status, stderr } if is_blank(Some(stderr.as_str())) => {
            format!("exit status {}", status)
        }
        CommandRunnerError::Exit { status, stderr } => format!("{stderr} (exit {status})"),
    }
}
