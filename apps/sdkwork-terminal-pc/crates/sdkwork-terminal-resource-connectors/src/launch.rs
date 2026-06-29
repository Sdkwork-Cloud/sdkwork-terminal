use crate::runner::{CommandRunner, CommandRunnerError};
use crate::types::{
    find_connector, CommandOutput, ConnectorCloseAction, ConnectorCommand, ConnectorExecutionError,
    ConnectorLaunchPlan, ConnectorPhase, ConnectorPlanError, ConnectorSessionLaunchRequest,
    ConnectorSmokeReport, ConnectorSmokeStatus, ConnectorTransport,
};

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

pub(crate) fn command_spec(
    program: &'static str,
    args: impl IntoIterator<Item = String>,
) -> ConnectorCommand {
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
