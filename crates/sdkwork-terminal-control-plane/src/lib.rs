use sdkwork_terminal_replay_store::ReplayEntry;
use sdkwork_terminal_resource_connectors::{
    build_cli_launch_plan_for_request, execute_plan_phase, CommandRunner, ConnectorExecutionError,
    ConnectorPhase, ConnectorSessionLaunchRequest as ResourceConnectorSessionLaunchRequest,
};
use sdkwork_terminal_session_runtime::{
    AttachmentRecord, ConnectorLaunchResolution, SessionCreateRequest, SessionRuntime,
    SessionRuntimeError,
};
use std::{fs, path::Path};

pub const CRATE_ID: &str = "sdkwork-terminal-control-plane";
pub const DESKTOP_SESSION_RUNTIME_DB_FILE_NAME: &str = "session-runtime.sqlite3";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

pub fn create_desktop_session_runtime(
    sqlite_path: Option<&Path>,
) -> Result<SessionRuntime, String> {
    match sqlite_path {
        Some(path) => {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|error| {
                    format!(
                        "failed to create desktop session runtime directory {}: {error}",
                        parent.display()
                    )
                })?;
            }

            SessionRuntime::with_sqlite(path).map_err(|error| {
                format!(
                    "failed to initialize desktop session runtime sqlite at {}: {error}",
                    path.display()
                )
            })
        }
        None => Ok(SessionRuntime::new()),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InteractiveConnectorSessionSpawnRequest {
    pub session_id: String,
    pub program: String,
    pub args: Vec<String>,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InteractiveConnectorSessionSpawnResult {
    pub invoked_program: String,
    pub invoked_args: Vec<String>,
    pub working_directory: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InteractiveConnectorSessionBootstrap {
    pub session_id: String,
    pub workspace_id: String,
    pub target: String,
    pub state: String,
    pub created_at: String,
    pub last_active_at: String,
    pub mode_tags: Vec<String>,
    pub tags: Vec<String>,
    pub attachment: AttachmentRecord,
    pub authority: String,
    pub invoked_program: String,
    pub invoked_args: Vec<String>,
    pub working_directory: String,
    pub connect_replay_entry: ReplayEntry,
}

pub trait InteractiveConnectorSessionSpawner {
    fn spawn_interactive_connector_session(
        &self,
        request: &InteractiveConnectorSessionSpawnRequest,
    ) -> Result<InteractiveConnectorSessionSpawnResult, String>;
}

#[derive(Debug)]
pub enum InteractiveConnectorSessionError {
    Plan(sdkwork_terminal_resource_connectors::ConnectorPlanError),
    Runtime(SessionRuntimeError),
    Connect(ConnectorExecutionError),
    Spawn(String),
    Serde(serde_json::Error),
}

impl std::fmt::Display for InteractiveConnectorSessionError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Plan(error) => write!(formatter, "connector launch plan error: {error:?}"),
            Self::Runtime(error) => {
                write!(formatter, "interactive connector runtime error: {error}")
            }
            Self::Connect(error) => write!(
                formatter,
                "interactive connector connect failed: {}",
                error.message
            ),
            Self::Spawn(message) => {
                write!(formatter, "interactive connector spawn failed: {message}")
            }
            Self::Serde(error) => write!(formatter, "interactive connector serde error: {error}"),
        }
    }
}

impl std::error::Error for InteractiveConnectorSessionError {}

impl From<sdkwork_terminal_resource_connectors::ConnectorPlanError>
    for InteractiveConnectorSessionError
{
    fn from(value: sdkwork_terminal_resource_connectors::ConnectorPlanError) -> Self {
        Self::Plan(value)
    }
}

impl From<SessionRuntimeError> for InteractiveConnectorSessionError {
    fn from(value: SessionRuntimeError) -> Self {
        Self::Runtime(value)
    }
}

impl From<serde_json::Error> for InteractiveConnectorSessionError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serde(value)
    }
}

pub fn create_interactive_connector_session(
    runtime: &mut SessionRuntime,
    request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
    cols: u16,
    rows: u16,
    runner: &impl CommandRunner,
    spawner: &impl InteractiveConnectorSessionSpawner,
    occurred_at: &str,
) -> Result<InteractiveConnectorSessionBootstrap, InteractiveConnectorSessionError> {
    let plan = build_cli_launch_plan_for_request(&map_connector_launch_request(request))?;
    let session =
        runtime.create_session(SessionCreateRequest::from_connector_launch_request(request));

    let connect_output = match execute_plan_phase(&plan, ConnectorPhase::Connect, runner) {
        Ok(output) => output,
        Err(error) => {
            let resolution = map_connector_execution_error(&error);
            let _ =
                runtime.resolve_connector_launch(&session.session_id, resolution, occurred_at)?;
            return Err(InteractiveConnectorSessionError::Connect(error));
        }
    };

    let attachment = runtime.attach(&session.session_id)?;
    let spawn_result = match spawner.spawn_interactive_connector_session(
        &InteractiveConnectorSessionSpawnRequest {
            session_id: session.session_id.clone(),
            program: plan.exec.program.to_string(),
            args: plan.exec.args.clone(),
            cols: cols.max(1),
            rows: rows.max(1),
        },
    ) {
        Ok(result) => result,
        Err(message) => {
            let payload = build_spawn_failure_payload(plan.exec.program, &message)?;
            let _ = runtime.record_replay_event(
                &session.session_id,
                sdkwork_terminal_replay_store::ReplayEventKind::Warning,
                &payload,
                occurred_at,
            )?;
            let _ = runtime.fail(&session.session_id, occurred_at)?;
            return Err(InteractiveConnectorSessionError::Spawn(message));
        }
    };

    let resolution = runtime.resolve_connector_launch(
        &session.session_id,
        ConnectorLaunchResolution::Running {
            phase: "connect".into(),
            detail: summarize_connect_output(&connect_output),
        },
        occurred_at,
    )?;

    Ok(InteractiveConnectorSessionBootstrap {
        session_id: resolution.session.session_id,
        workspace_id: resolution.session.workspace_id,
        target: resolution.session.target,
        state: "Running".into(),
        created_at: resolution.session.created_at,
        last_active_at: resolution.session.last_active_at,
        mode_tags: resolution.session.mode_tags,
        tags: resolution.session.tags,
        attachment,
        authority: request.authority.clone(),
        invoked_program: spawn_result.invoked_program,
        invoked_args: spawn_result.invoked_args,
        working_directory: spawn_result.working_directory,
        connect_replay_entry: resolution.replay_entry,
    })
}

fn map_connector_launch_request(
    request: &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest,
) -> ResourceConnectorSessionLaunchRequest {
    ResourceConnectorSessionLaunchRequest {
        workspace_id: request.workspace_id.clone(),
        target: request.target.clone(),
        authority: request.authority.clone(),
        command: request.command.clone(),
        mode_tags: request.mode_tags.clone(),
        tags: request.tags.clone(),
    }
}

fn summarize_connect_output(
    output: &sdkwork_terminal_resource_connectors::CommandOutput,
) -> String {
    if !output.stdout.is_empty() {
        output.stdout.clone()
    } else if !output.stderr.is_empty() {
        output.stderr.clone()
    } else {
        format!("connect phase exited with status {}", output.status)
    }
}

fn map_connector_execution_error(error: &ConnectorExecutionError) -> ConnectorLaunchResolution {
    ConnectorLaunchResolution::Failed {
        code: error.code.to_string(),
        phase: match error.phase {
            ConnectorPhase::Connect => "connect".into(),
            ConnectorPhase::Exec => "exec".into(),
            ConnectorPhase::Diag => "diag".into(),
        },
        retryable: error.retryable,
        program: error.program.to_string(),
        status: error.status,
        message: error.message.clone(),
    }
}

fn build_spawn_failure_payload(program: &str, message: &str) -> Result<String, serde_json::Error> {
    serde_json::to_string(&serde_json::json!({
        "state": "failed",
        "code": "connector_spawn_failed",
        "phase": "spawn",
        "retryable": false,
        "program": program,
        "status": serde_json::Value::Null,
        "message": message,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_terminal_resource_connectors::{
        CommandOutput, CommandRunner, CommandRunnerError, ConnectorCommand,
    };
    use sdkwork_terminal_session_runtime::{SessionCreateRequest, SessionState};
    use std::{
        cell::RefCell,
        collections::VecDeque,
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_db_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();

        std::env::temp_dir().join(format!("sdkwork-terminal-control-plane-{name}-{unique}.db"))
    }

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

    #[derive(Default)]
    struct StubSpawner {
        requests: RefCell<Vec<InteractiveConnectorSessionSpawnRequest>>,
        result: RefCell<Option<Result<InteractiveConnectorSessionSpawnResult, String>>>,
    }

    impl StubSpawner {
        fn with_result(result: Result<InteractiveConnectorSessionSpawnResult, String>) -> Self {
            Self {
                requests: RefCell::new(Vec::new()),
                result: RefCell::new(Some(result)),
            }
        }
    }

    impl InteractiveConnectorSessionSpawner for StubSpawner {
        fn spawn_interactive_connector_session(
            &self,
            request: &InteractiveConnectorSessionSpawnRequest,
        ) -> Result<InteractiveConnectorSessionSpawnResult, String> {
            self.requests.borrow_mut().push(request.clone());
            self.result
                .borrow_mut()
                .take()
                .unwrap_or_else(|| Err("missing stub spawn result".into()))
        }
    }

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn create_desktop_session_runtime_recovers_persisted_session_index_and_replay_from_sqlite() {
        let db_path = temp_db_path("desktop-session-runtime-recovery");

        {
            let mut runtime = create_desktop_session_runtime(Some(&db_path)).unwrap();
            let session = runtime.create_session(SessionCreateRequest {
                workspace_id: "workspace-recovery".into(),
                target: "local-shell".into(),
                mode_tags: vec!["cli-native".into()],
                tags: vec!["profile:powershell".into()],
                launch_intent: None,
            });
            runtime
                .record_output(
                    &session.session_id,
                    "Windows PowerShell ready",
                    "2026-04-10T10:00:00.000Z",
                )
                .unwrap();
        }

        let recovered = create_desktop_session_runtime(Some(&db_path)).unwrap();
        let sessions = recovered.list_sessions();

        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].state, sdkwork_terminal_session_runtime::SessionState::Exited);
        assert_eq!(sessions[0].workspace_id, "workspace-recovery");
        assert_eq!(sessions[0].target, "local-shell");
        assert_eq!(sessions[0].mode_tags, vec!["cli-native"]);
        assert_eq!(sessions[0].tags, vec!["profile:powershell"]);

        let replay = recovered.replay(&sessions[0].session_id, None, 8).unwrap();
        assert_eq!(replay.entries.len(), 1);
        assert_eq!(replay.entries[0].payload, "Windows PowerShell ready");

        let _ = fs::remove_file(&db_path);
    }

    #[test]
    fn create_interactive_connector_session_bootstraps_attached_running_session() {
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "ssh handshake complete".into(),
            stderr: String::new(),
        })]);
        let spawner = StubSpawner::with_result(Ok(InteractiveConnectorSessionSpawnResult {
            invoked_program: "ssh".into(),
            invoked_args: vec![
                "-tt".into(),
                "ops@prod-bastion".into(),
                "--".into(),
                "bash".into(),
                "-l".into(),
            ],
            working_directory:
                "D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-terminal".into(),
        }));

        let bootstrap = create_interactive_connector_session(
            &mut runtime,
            &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
                workspace_id: "workspace-remote".into(),
                target: "ssh".into(),
                authority: "ops@prod-bastion".into(),
                command: vec!["bash".into(), "-l".into()],
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:ssh".into()],
            },
            132,
            40,
            &runner,
            &spawner,
            "2026-04-10T12:00:00.000Z",
        )
        .unwrap();

        assert_eq!(bootstrap.session_id, "session-0001");
        assert_eq!(bootstrap.state, "Running");
        assert_eq!(bootstrap.attachment.session_id, "session-0001");
        assert_eq!(bootstrap.invoked_program, "ssh");
        assert_eq!(bootstrap.connect_replay_entry.kind.as_str(), "state");
        assert_eq!(runner.commands.borrow().len(), 1);
        assert_eq!(runner.commands.borrow()[0].program, "ssh");
        assert_eq!(spawner.requests.borrow().len(), 1);
        assert_eq!(spawner.requests.borrow()[0].program, "ssh");
        assert_eq!(spawner.requests.borrow()[0].cols, 132);
        assert_eq!(spawner.requests.borrow()[0].rows, 40);

        let sessions = runtime.list_sessions();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].state, SessionState::Running);
        assert_eq!(runtime.list_attachments().len(), 1);
    }

    #[test]
    fn create_interactive_connector_session_bootstraps_docker_exec_running_session() {
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "true".into(),
            stderr: String::new(),
        })]);
        let spawner = StubSpawner::with_result(Ok(InteractiveConnectorSessionSpawnResult {
            invoked_program: "docker".into(),
            invoked_args: vec![
                "exec".into(),
                "-it".into(),
                "workspace-dev".into(),
                "/bin/sh".into(),
            ],
            working_directory:
                "D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-terminal".into(),
        }));

        let bootstrap = create_interactive_connector_session(
            &mut runtime,
            &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
                workspace_id: "workspace-container".into(),
                target: "docker-exec".into(),
                authority: "docker://workspace-dev".into(),
                command: vec!["/bin/sh".into()],
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:docker-exec".into()],
            },
            120,
            32,
            &runner,
            &spawner,
            "2026-04-10T16:00:00.000Z",
        )
        .unwrap();

        assert_eq!(bootstrap.target, "docker-exec");
        assert_eq!(bootstrap.state, "Running");
        assert_eq!(bootstrap.authority, "docker://workspace-dev");
        assert_eq!(bootstrap.invoked_program, "docker");
        assert_eq!(
            bootstrap.invoked_args,
            vec![
                "exec".to_string(),
                "-it".to_string(),
                "workspace-dev".to_string(),
                "/bin/sh".to_string(),
            ],
        );
        assert_eq!(runner.commands.borrow().len(), 1);
        assert_eq!(runner.commands.borrow()[0].program, "docker");
        assert_eq!(
            runner.commands.borrow()[0].args,
            vec![
                "inspect".to_string(),
                "--format".to_string(),
                "{{.State.Running}}".to_string(),
                "workspace-dev".to_string(),
            ],
        );
        assert_eq!(spawner.requests.borrow().len(), 1);
        assert_eq!(spawner.requests.borrow()[0].program, "docker");
        assert_eq!(
            spawner.requests.borrow()[0].args,
            vec![
                "exec".to_string(),
                "-it".to_string(),
                "workspace-dev".to_string(),
                "/bin/sh".to_string(),
            ],
        );

        let sessions = runtime.list_sessions();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].target, "docker-exec");
        assert_eq!(sessions[0].state, SessionState::Running);
        assert_eq!(runtime.list_attachments().len(), 1);
    }

    #[test]
    fn create_interactive_connector_session_bootstraps_kubernetes_exec_running_session() {
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Ok(CommandOutput {
            status: 0,
            stdout: "NAME READY STATUS\nweb-0 1/1 Running".into(),
            stderr: String::new(),
        })]);
        let spawner = StubSpawner::with_result(Ok(InteractiveConnectorSessionSpawnResult {
            invoked_program: "kubectl".into(),
            invoked_args: vec![
                "exec".into(),
                "-it".into(),
                "web-0".into(),
                "-n".into(),
                "prod".into(),
                "--".into(),
                "/bin/sh".into(),
            ],
            working_directory:
                "D:/javasource/spring-ai-plus/spring-ai-plus-business/apps/sdkwork-terminal".into(),
        }));

        let bootstrap = create_interactive_connector_session(
            &mut runtime,
            &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
                workspace_id: "workspace-cluster".into(),
                target: "kubernetes-exec".into(),
                authority: "k8s://prod/web-0".into(),
                command: vec!["/bin/sh".into()],
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:kubernetes-exec".into()],
            },
            138,
            42,
            &runner,
            &spawner,
            "2026-04-10T16:05:00.000Z",
        )
        .unwrap();

        assert_eq!(bootstrap.target, "kubernetes-exec");
        assert_eq!(bootstrap.state, "Running");
        assert_eq!(bootstrap.authority, "k8s://prod/web-0");
        assert_eq!(bootstrap.invoked_program, "kubectl");
        assert_eq!(
            bootstrap.invoked_args,
            vec![
                "exec".to_string(),
                "-it".to_string(),
                "web-0".to_string(),
                "-n".to_string(),
                "prod".to_string(),
                "--".to_string(),
                "/bin/sh".to_string(),
            ],
        );
        assert_eq!(runner.commands.borrow().len(), 1);
        assert_eq!(runner.commands.borrow()[0].program, "kubectl");
        assert_eq!(
            runner.commands.borrow()[0].args,
            vec![
                "get".to_string(),
                "pod".to_string(),
                "web-0".to_string(),
                "-n".to_string(),
                "prod".to_string(),
            ],
        );
        assert_eq!(spawner.requests.borrow().len(), 1);
        assert_eq!(spawner.requests.borrow()[0].program, "kubectl");
        assert_eq!(spawner.requests.borrow()[0].cols, 138);
        assert_eq!(spawner.requests.borrow()[0].rows, 42);

        let sessions = runtime.list_sessions();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].target, "kubernetes-exec");
        assert_eq!(sessions[0].state, SessionState::Running);
        assert_eq!(runtime.list_attachments().len(), 1);
    }

    #[test]
    fn create_interactive_connector_session_records_failed_connect_without_spawning() {
        let mut runtime = SessionRuntime::new();
        let runner = StubRunner::with_outcomes(vec![StubOutcome::Err(CommandRunnerError::Exit {
            status: 255,
            stderr: "host key verification failed".into(),
        })]);
        let spawner = StubSpawner::with_result(Ok(InteractiveConnectorSessionSpawnResult {
            invoked_program: "ssh".into(),
            invoked_args: Vec::new(),
            working_directory: "unused".into(),
        }));

        let error = create_interactive_connector_session(
            &mut runtime,
            &sdkwork_terminal_protocol::ConnectorSessionLaunchRequest {
                workspace_id: "workspace-remote".into(),
                target: "ssh".into(),
                authority: "ops@prod-bastion".into(),
                command: vec!["bash".into(), "-l".into()],
                mode_tags: vec!["cli-native".into()],
                tags: vec!["resource:ssh".into()],
            },
            120,
            32,
            &runner,
            &spawner,
            "2026-04-10T12:01:00.000Z",
        )
        .unwrap_err();

        assert!(matches!(
            error,
            InteractiveConnectorSessionError::Connect(_)
        ));
        assert_eq!(spawner.requests.borrow().len(), 0);

        let sessions = runtime.list_sessions();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].state, SessionState::Failed);
        assert_eq!(runtime.list_attachments().len(), 0);
    }
}
