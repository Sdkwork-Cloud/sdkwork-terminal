pub const CRATE_ID: &str = "sdkwork-terminal-pty-runtime";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use sdkwork_terminal_shell_integration::{
    build_local_shell_exec_command, build_local_shell_launch_command, LocalShellIntegrationError,
};
use serde::{Deserialize, Serialize};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    collections::HashMap,
    env,
    error::Error,
    fmt,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::{mpsc::Sender, Arc, Mutex},
    thread,
};

const MANAGED_TERMINAL_PROGRAM: &str = "sdkwork-terminal";
const MANAGED_TERMINAL_TYPE: &str = "xterm-256color";
const MANAGED_TERMINAL_COLOR_CAPABILITY: &str = "truecolor";
const MANAGED_TERMINAL_PROGRAM_VERSION: &str = env!("CARGO_PKG_VERSION");
const MANAGED_TERMINAL_FORCE_COLOR_LEVEL: &str = "3";
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct LocalShellExecutionRequest {
    pub profile: String,
    pub command: String,
    pub working_directory: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalShellExecutionResult {
    pub profile: String,
    pub command: String,
    pub working_directory: String,
    pub invoked_program: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalShellSessionCreateRequest {
    pub session_id: String,
    pub profile: String,
    pub working_directory: Option<String>,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalShellSessionBootstrap {
    pub session_id: String,
    pub profile: String,
    pub working_directory: String,
    pub invoked_program: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyProcessLaunchCommand {
    pub program: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyProcessSessionCreateRequest {
    pub session_id: String,
    pub command: PtyProcessLaunchCommand,
    pub working_directory: Option<String>,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyProcessSessionBootstrap {
    pub session_id: String,
    pub working_directory: String,
    pub invoked_program: String,
    pub invoked_args: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LocalShellSessionEvent {
    Output {
        session_id: String,
        payload: String,
    },
    Warning {
        session_id: String,
        message: String,
    },
    Exit {
        session_id: String,
        exit_code: Option<i32>,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TerminalProbeResponseMode {
    Transparent,
    SyntheticCursorResponse,
}

#[derive(Clone)]
pub struct LocalShellSessionRuntime {
    sessions: Arc<Mutex<HashMap<String, Arc<LocalShellSessionHandle>>>>,
    probe_response_mode: TerminalProbeResponseMode,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PreparedProcessLaunchCommand {
    program: String,
    args: Vec<String>,
}

struct LocalShellSessionHandle {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    killer: Arc<Mutex<Box<dyn ChildKiller + Send + Sync>>>,
    cursor_row: Arc<Mutex<u16>>,
    cursor_col: Arc<Mutex<u16>>,
    pty_rows: Arc<Mutex<u16>>,
    pty_cols: Arc<Mutex<u16>>,
}

#[derive(Debug)]
pub enum LocalShellExecutionError {
    Command(LocalShellIntegrationError),
    InvalidCommand(String),
    WorkingDirectory(String),
    Spawn(String),
    SessionNotFound(String),
    DuplicateSessionId(String),
    RuntimePoisoned,
    Write(String),
    Resize(String),
}

impl fmt::Display for LocalShellExecutionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Command(cause) => write!(formatter, "local shell command error: {cause}"),
            Self::InvalidCommand(message) => {
                write!(formatter, "local shell invalid command: {message}")
            }
            Self::WorkingDirectory(message) => {
                write!(formatter, "local shell working directory error: {message}")
            }
            Self::Spawn(message) => write!(formatter, "local shell spawn error: {message}"),
            Self::SessionNotFound(session_id) => {
                write!(formatter, "local shell session not found: {session_id}")
            }
            Self::DuplicateSessionId(session_id) => {
                write!(
                    formatter,
                    "local shell session already exists: {session_id}"
                )
            }
            Self::RuntimePoisoned => formatter.write_str("local shell runtime mutex poisoned"),
            Self::Write(message) => write!(formatter, "local shell write error: {message}"),
            Self::Resize(message) => write!(formatter, "local shell resize error: {message}"),
        }
    }
}

impl Error for LocalShellExecutionError {}

impl From<LocalShellIntegrationError> for LocalShellExecutionError {
    fn from(value: LocalShellIntegrationError) -> Self {
        Self::Command(value)
    }
}

impl Default for LocalShellSessionRuntime {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            probe_response_mode: TerminalProbeResponseMode::Transparent,
        }
    }
}

impl LocalShellSessionRuntime {
    pub fn with_synthetic_probe_responses() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            probe_response_mode: TerminalProbeResponseMode::SyntheticCursorResponse,
        }
    }

    pub fn create_session(
        &self,
        request: LocalShellSessionCreateRequest,
        event_sender: Sender<LocalShellSessionEvent>,
    ) -> Result<LocalShellSessionBootstrap, LocalShellExecutionError> {
        let command = build_local_shell_launch_command(&request.profile)?;
        let bootstrap = self.create_process_session(
            PtyProcessSessionCreateRequest {
                session_id: request.session_id,
                command: PtyProcessLaunchCommand {
                    program: command.program.clone(),
                    args: command.args,
                },
                working_directory: request.working_directory,
                cols: request.cols,
                rows: request.rows,
            },
            event_sender,
        )?;

        Ok(LocalShellSessionBootstrap {
            session_id: bootstrap.session_id,
            profile: command.profile,
            working_directory: bootstrap.working_directory,
            invoked_program: bootstrap.invoked_program,
        })
    }

    pub fn create_process_session(
        &self,
        request: PtyProcessSessionCreateRequest,
        event_sender: Sender<LocalShellSessionEvent>,
    ) -> Result<PtyProcessSessionBootstrap, LocalShellExecutionError> {
        let program = request.command.program.trim().to_string();
        let requested_args = request.command.args.clone();
        let spawn_command = prepare_process_launch_command(&request.command)?;
        let spawn_program = spawn_command.program;
        let spawn_args = spawn_command.args;

        let working_directory = resolve_working_directory(request.working_directory.as_deref())?;
        let pty_system = native_pty_system();
        let safe_rows = request.rows.max(1);
        let safe_cols = request.cols.max(1);
        let pair = pty_system
            .openpty(PtySize {
                rows: safe_rows,
                cols: safe_cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|cause| LocalShellExecutionError::Spawn(cause.to_string()))?;
        let mut builder = CommandBuilder::new(&spawn_program);

        for argument in &spawn_args {
            builder.arg(argument);
        }
        builder.cwd(&working_directory);
        apply_managed_terminal_environment_to_builder(&mut builder);

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|cause| LocalShellExecutionError::Spawn(cause.to_string()))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|cause| LocalShellExecutionError::Spawn(cause.to_string()))?;
        let child = pair
            .slave
            .spawn_command(builder)
            .map_err(|cause| LocalShellExecutionError::Spawn(cause.to_string()))?;
        let killer = child.clone_killer();
        let session_id = request.session_id;
        let session_handle = Arc::new(LocalShellSessionHandle {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(pair.master)),
            killer: Arc::new(Mutex::new(killer)),
            cursor_row: Arc::new(Mutex::new(1)),
            cursor_col: Arc::new(Mutex::new(1)),
            pty_rows: Arc::new(Mutex::new(safe_rows)),
            pty_cols: Arc::new(Mutex::new(safe_cols)),
        });

        {
            let mut sessions = self
                .sessions
                .lock()
                .map_err(|_| LocalShellExecutionError::RuntimePoisoned)?;
            if sessions.contains_key(&session_id) {
                return Err(LocalShellExecutionError::DuplicateSessionId(session_id));
            }
            sessions.insert(session_id.clone(), Arc::clone(&session_handle));
        }

        spawn_session_event_pump(
            Arc::clone(&self.sessions),
            session_id.clone(),
            reader,
            child,
            event_sender,
            self.probe_response_mode,
        );

        Ok(PtyProcessSessionBootstrap {
            session_id,
            working_directory: working_directory.to_string_lossy().into_owned(),
            invoked_program: program,
            invoked_args: requested_args,
        })
    }

    pub fn write_input(
        &self,
        session_id: &str,
        input: &str,
    ) -> Result<usize, LocalShellExecutionError> {
        self.write_input_bytes(session_id, input.as_bytes())
    }

    pub fn write_input_bytes(
        &self,
        session_id: &str,
        input_bytes: &[u8],
    ) -> Result<usize, LocalShellExecutionError> {
        let handle = self.session_handle(session_id)?;
        let mut writer = handle
            .writer
            .lock()
            .map_err(|_| LocalShellExecutionError::RuntimePoisoned)?;
        writer
            .write_all(input_bytes)
            .map_err(|cause| LocalShellExecutionError::Write(cause.to_string()))?;
        writer
            .flush()
            .map_err(|cause| LocalShellExecutionError::Write(cause.to_string()))?;

        Ok(input_bytes.len())
    }

    pub fn resize_session(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), LocalShellExecutionError> {
        let handle = self.session_handle(session_id)?;
        let safe_cols = cols.max(1);
        let safe_rows = rows.max(1);
        {
            let master = handle
                .master
                .lock()
                .map_err(|_| LocalShellExecutionError::RuntimePoisoned)?;
            master
                .resize(PtySize {
                    rows: safe_rows,
                    cols: safe_cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|cause| LocalShellExecutionError::Resize(cause.to_string()))?;
        }
        if let Ok(mut tracked_cols) = handle.pty_cols.lock() {
            *tracked_cols = safe_cols;
        }
        if let Ok(mut tracked_rows) = handle.pty_rows.lock() {
            *tracked_rows = safe_rows;
        }

        Ok(())
    }

    pub fn terminate_session(&self, session_id: &str) -> Result<(), LocalShellExecutionError> {
        let handle = {
            let mut sessions = self
                .sessions
                .lock()
                .map_err(|_| LocalShellExecutionError::RuntimePoisoned)?;
            match sessions.remove(session_id) {
                Some(handle) => handle,
                None => return Ok(()),
            }
        };
        let mut killer = handle
            .killer
            .lock()
            .map_err(|_| LocalShellExecutionError::RuntimePoisoned)?;
        match killer.kill() {
            Ok(()) => Ok(()),
            Err(cause) if is_best_effort_terminate_error(&cause.to_string()) => Ok(()),
            Err(cause) => Err(LocalShellExecutionError::Spawn(cause.to_string())),
        }
    }

    fn session_handle(
        &self,
        session_id: &str,
    ) -> Result<Arc<LocalShellSessionHandle>, LocalShellExecutionError> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| LocalShellExecutionError::RuntimePoisoned)?;

        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| LocalShellExecutionError::SessionNotFound(session_id.to_string()))
    }
}

pub fn execute_local_shell_command(
    request: LocalShellExecutionRequest,
) -> Result<LocalShellExecutionResult, LocalShellExecutionError> {
    let command = build_local_shell_exec_command(&request.profile, &request.command)?;
    let working_directory = resolve_working_directory(request.working_directory.as_deref())?;
    let mut process = Command::new(&command.program);
    process.args(&command.args).current_dir(&working_directory);
    apply_managed_terminal_environment_to_command(&mut process);
    apply_background_command_spawn_config(&mut process);
    let output = process
        .output()
        .map_err(|cause| LocalShellExecutionError::Spawn(cause.to_string()))?;

    Ok(LocalShellExecutionResult {
        profile: command.profile,
        command: command.command_text,
        working_directory: working_directory.to_string_lossy().into_owned(),
        invoked_program: command.program,
        exit_code: output.status.code().unwrap_or(-1),
        stdout: normalize_command_stream(output.stdout),
        stderr: normalize_command_stream(output.stderr),
    })
}

fn resolve_working_directory(value: Option<&str>) -> Result<PathBuf, LocalShellExecutionError> {
    let path = match value
        .map(str::trim)
        .filter(|candidate| !candidate.is_empty())
    {
        Some(candidate) => PathBuf::from(candidate),
        None => env::current_dir()
            .map_err(|cause| LocalShellExecutionError::WorkingDirectory(cause.to_string()))?,
    };

    normalize_working_directory(&path)
}

fn normalize_working_directory(path: &Path) -> Result<PathBuf, LocalShellExecutionError> {
    if path.exists() {
        path.canonicalize()
            .map(normalize_user_facing_working_directory)
            .map_err(|cause| LocalShellExecutionError::WorkingDirectory(cause.to_string()))
    } else {
        Err(LocalShellExecutionError::WorkingDirectory(format!(
            "path does not exist: {}",
            path.display()
        )))
    }
}

fn normalize_user_facing_working_directory(path: PathBuf) -> PathBuf {
    #[cfg(windows)]
    {
        let display_path = path.to_string_lossy();

        if let Some(stripped) = display_path.strip_prefix(r"\\?\UNC\") {
            return PathBuf::from(format!(r"\\{stripped}"));
        }

        if let Some(stripped) = display_path
            .strip_prefix(r"\\?\")
            .or_else(|| display_path.strip_prefix(r"\\.\"))
        {
            return PathBuf::from(stripped);
        }
    }

    path
}

fn prepare_process_launch_command(
    command: &PtyProcessLaunchCommand,
) -> Result<PreparedProcessLaunchCommand, LocalShellExecutionError> {
    let program = command.program.trim();
    if program.is_empty() {
        return Err(LocalShellExecutionError::InvalidCommand(
            "process program cannot be empty".into(),
        ));
    }

    #[cfg(windows)]
    {
        return prepare_windows_process_launch_command(program, &command.args);
    }

    #[cfg(not(windows))]
    {
        Ok(PreparedProcessLaunchCommand {
            program: program.to_string(),
            args: command.args.clone(),
        })
    }
}

#[cfg(windows)]
fn prepare_windows_process_launch_command(
    program: &str,
    args: &[String],
) -> Result<PreparedProcessLaunchCommand, LocalShellExecutionError> {
    let resolved_program_path =
        resolve_windows_process_launch_path(program).unwrap_or_else(|| PathBuf::from(program));
    let resolved_extension = resolved_program_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase());

    match resolved_extension.as_deref() {
        Some("ps1") => {
            let launcher = resolve_windows_runtime_program(&["pwsh", "powershell"]).ok_or_else(
                || {
                    LocalShellExecutionError::InvalidCommand(format!(
                        "PowerShell is required to launch script: {}",
                        resolved_program_path.display()
                    ))
                },
            )?;
            let mut prepared_args = vec![
                "-NoLogo".to_string(),
                "-NoProfile".to_string(),
                "-File".to_string(),
                resolved_program_path.to_string_lossy().into_owned(),
            ];
            prepared_args.extend(args.iter().cloned());

            Ok(PreparedProcessLaunchCommand {
                program: launcher,
                args: prepared_args,
            })
        }
        Some("js") | Some("cjs") | Some("mjs") => {
            let launcher = resolve_windows_runtime_program(&["node"]).ok_or_else(|| {
                LocalShellExecutionError::InvalidCommand(format!(
                    "Node.js is required to launch script: {}",
                    resolved_program_path.display()
                ))
            })?;
            let mut prepared_args = vec![resolved_program_path.to_string_lossy().into_owned()];
            prepared_args.extend(args.iter().cloned());

            Ok(PreparedProcessLaunchCommand {
                program: launcher,
                args: prepared_args,
            })
        }
        _ => Ok(PreparedProcessLaunchCommand {
            program: resolved_program_path.to_string_lossy().into_owned(),
            args: args.to_vec(),
        }),
    }
}

#[cfg(windows)]
fn resolve_windows_runtime_program(programs: &[&str]) -> Option<String> {
    programs.iter().find_map(|program| {
        resolve_windows_process_launch_path(program)
            .map(|path| path.to_string_lossy().into_owned())
    })
}

#[cfg(windows)]
fn resolve_windows_process_launch_path(program: &str) -> Option<PathBuf> {
    let program_path = Path::new(program);
    if program_path.components().count() > 1 {
        return resolve_windows_explicit_process_launch_path(program_path);
    }

    let path = env::var_os("PATH")?;
    let candidates = windows_process_command_candidates(program);

    env::split_paths(&path).find_map(|directory| {
        candidates.iter().find_map(|candidate| {
            let candidate_path = directory.join(candidate);
            if candidate_path.is_file() {
                Some(candidate_path)
            } else {
                None
            }
        })
    })
}

#[cfg(windows)]
fn resolve_windows_explicit_process_launch_path(program_path: &Path) -> Option<PathBuf> {
    if program_path
        .extension()
        .and_then(|value| value.to_str())
        .is_none()
    {
        for extension in windows_process_extension_candidates() {
            let mut candidate_path = program_path.to_path_buf();
            candidate_path.set_extension(extension);
            if candidate_path.is_file() {
                return Some(candidate_path);
            }
        }
    }

    if program_path.is_file() {
        return Some(program_path.to_path_buf());
    }

    None
}

#[cfg(windows)]
fn windows_process_command_candidates(program: &str) -> Vec<String> {
    let mut candidates = Vec::new();
    let program_path = Path::new(program);
    let has_extension = program_path
        .extension()
        .and_then(|value| value.to_str())
        .is_some();

    if has_extension {
        candidates.push(program.to_string());
        return candidates;
    }

    for extension in windows_process_extension_candidates() {
        candidates.push(format!("{program}.{extension}"));
    }
    candidates.push(program.to_string());
    candidates
}

#[cfg(windows)]
fn windows_process_extension_candidates() -> &'static [&'static str] {
    &["com", "exe", "bat", "cmd", "ps1", "js", "cjs", "mjs"]
}

fn normalize_command_stream(bytes: Vec<u8>) -> String {
    String::from_utf8_lossy(&bytes).trim_end().to_string()
}

fn apply_managed_terminal_environment_to_builder(builder: &mut CommandBuilder) {
    remove_managed_terminal_environment_conflicts_from_builder(builder);
    for (key, value) in managed_terminal_environment_entries() {
        builder.env(key, value);
    }

    #[cfg(not(windows))]
    {
        if builder.get_env("LANG").is_none() {
            builder.env("LANG", "en_US.UTF-8");
        }
    }
}

fn apply_managed_terminal_environment_to_command(command: &mut Command) {
    remove_managed_terminal_environment_conflicts_from_command(command);
    command.envs(managed_terminal_environment_entries());

    #[cfg(not(windows))]
    {
        if env::var_os("LANG").is_none() {
            command.env("LANG", "en_US.UTF-8");
        }
    }
}

fn apply_background_command_spawn_config(command: &mut Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn remove_managed_terminal_environment_conflicts_from_builder(builder: &mut CommandBuilder) {
    for key in ["NO_COLOR", "NODE_DISABLE_COLORS"] {
        builder.env_remove(key);
    }
}

fn remove_managed_terminal_environment_conflicts_from_command(command: &mut Command) {
    for key in ["NO_COLOR", "NODE_DISABLE_COLORS"] {
        command.env_remove(key);
    }
}

fn managed_terminal_environment_entries() -> [(&'static str, &'static str); 7] {
    [
        ("TERM", MANAGED_TERMINAL_TYPE),
        ("COLORTERM", MANAGED_TERMINAL_COLOR_CAPABILITY),
        ("CLICOLOR", "1"),
        ("CLICOLOR_FORCE", "1"),
        ("FORCE_COLOR", MANAGED_TERMINAL_FORCE_COLOR_LEVEL),
        ("TERM_PROGRAM", MANAGED_TERMINAL_PROGRAM),
        ("TERM_PROGRAM_VERSION", MANAGED_TERMINAL_PROGRAM_VERSION),
    ]
}

fn spawn_session_event_pump(
    sessions: Arc<Mutex<HashMap<String, Arc<LocalShellSessionHandle>>>>,
    session_id: String,
    mut reader: Box<dyn Read + Send>,
    mut child: Box<dyn portable_pty::Child + Send + Sync>,
    event_sender: Sender<LocalShellSessionEvent>,
    probe_response_mode: TerminalProbeResponseMode,
) {
    thread::spawn(move || {
        let mut buffer = [0u8; 16384];

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(read_bytes) => {
                    let payload = String::from_utf8_lossy(&buffer[..read_bytes]).to_string();
                    let forwarded_payload = if matches!(
                        probe_response_mode,
                        TerminalProbeResponseMode::SyntheticCursorResponse
                    ) {
                        let sanitized_payload =
                            handle_terminal_probe_sequences(&sessions, &session_id, &payload);
                        update_cursor_from_output(&sessions, &session_id, &sanitized_payload);
                        sanitized_payload
                    } else {
                        payload
                    };
                    if forwarded_payload.is_empty() {
                        continue;
                    }
                    if event_sender
                        .send(LocalShellSessionEvent::Output {
                            session_id: session_id.clone(),
                            payload: forwarded_payload,
                        })
                        .is_err()
                    {
                        break;
                    }
                }
                Err(cause) => {
                    let _ = event_sender.send(LocalShellSessionEvent::Warning {
                        session_id: session_id.clone(),
                        message: cause.to_string(),
                    });
                    break;
                }
            }
        }

        let exit_code = child.wait().ok().map(|status| status.exit_code() as i32);
        let _ = event_sender.send(LocalShellSessionEvent::Exit {
            session_id: session_id.clone(),
            exit_code,
        });

        if let Ok(mut registry) = sessions.lock() {
            registry.remove(&session_id);
        }
    });
}

fn update_cursor_from_output(
    sessions: &Arc<Mutex<HashMap<String, Arc<LocalShellSessionHandle>>>>,
    session_id: &str,
    payload: &str,
) {
    let (cursor_row, cursor_col, max_rows, max_cols) = {
        let Ok(registry) = sessions.lock() else {
            return;
        };
        let Some(handle) = registry.get(session_id) else {
            return;
        };

        let row = handle.cursor_row.lock().ok().map(|g| *g).unwrap_or(1);
        let col = handle.cursor_col.lock().ok().map(|g| *g).unwrap_or(1);
        let rows = handle.pty_rows.lock().ok().map(|g| *g).unwrap_or(24);
        let cols = handle.pty_cols.lock().ok().map(|g| *g).unwrap_or(80);
        (row, col, rows, cols)
    };

    let mut row = cursor_row;
    let mut col = cursor_col;

    let mut chars = payload.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\x1b' {
            let next = chars.peek().copied();
            if next == Some('[') {
                chars.next();
                let mut params = String::new();
                while let Some(d) = chars.peek() {
                    if d.is_ascii_digit() || *d == ';' || *d == '?' {
                        params.push(chars.next().unwrap());
                    } else {
                        break;
                    }
                }
                let command = chars.next();
                match command {
                    Some('H') | Some('f') => {
                        let parts: Vec<u16> = params
                            .split(';')
                            .filter_map(|s| s.parse::<u16>().ok())
                            .collect();
                        row = parts.first().copied().unwrap_or(1).max(1);
                        col = parts.get(1).copied().unwrap_or(1).max(1);
                    }
                    Some('A') => {
                        let n: u16 = params.parse().unwrap_or(1);
                        row = row.saturating_sub(n).max(1);
                    }
                    Some('B') => {
                        let n: u16 = params.parse().unwrap_or(1);
                        row = (row + n).min(max_rows);
                    }
                    Some('C') => {
                        let n: u16 = params.parse().unwrap_or(1);
                        col = (col + n).min(max_cols);
                    }
                    Some('D') => {
                        let n: u16 = params.parse().unwrap_or(1);
                        col = col.saturating_sub(n).max(1);
                    }
                    Some('J') | Some('K') | Some('m') | Some('h') | Some('l') | Some('r') => {}
                    _ => {}
                }
            }
            continue;
        }

        match ch {
            '\r' => col = 1,
            '\n' => {
                row = row.saturating_add(1);
                if row > max_rows {
                    row = max_rows;
                }
            }
            '\t' => {
                let next_tab = ((col / 8) + 1) * 8 + 1;
                col = next_tab.min(max_cols);
            }
            '\x08' => {
                col = col.saturating_sub(1).max(1);
            }
            _ => {
                if !ch.is_control() {
                    col = col.saturating_add(1);
                    if col > max_cols {
                        col = 1;
                        row = row.saturating_add(1);
                        if row > max_rows {
                            row = max_rows;
                        }
                    }
                }
            }
        }
    }

    let Ok(registry) = sessions.lock() else {
        return;
    };
    let Some(handle) = registry.get(session_id) else {
        return;
    };
    if let Ok(mut tracked_row) = handle.cursor_row.lock() {
        *tracked_row = row;
    };
    if let Ok(mut tracked_col) = handle.cursor_col.lock() {
        *tracked_col = col;
    };
}

fn handle_terminal_probe_sequences(
    sessions: &Arc<Mutex<HashMap<String, Arc<LocalShellSessionHandle>>>>,
    session_id: &str,
    payload: &str,
) -> String {
    if !payload.contains("\u{1b}[6n") {
        return payload.to_string();
    }

    if let Ok(registry) = sessions.lock() {
        if let Some(handle) = registry.get(session_id) {
            let row = handle.cursor_row.lock().ok().map(|g| *g).unwrap_or(1);
            let col = handle.cursor_col.lock().ok().map(|g| *g).unwrap_or(1);
            if let Ok(mut writer) = handle.writer.lock() {
                let response = format!("\x1b[{};{}R", row, col);
                let _ = writer.write_all(response.as_bytes());
                let _ = writer.flush();
            }
        }
    }

    payload.replace("\u{1b}[6n", "")
}

fn is_best_effort_terminate_error(message: &str) -> bool {
    cfg!(windows) && (message.contains("os error 1460") || message.contains("os error 6"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_terminal_shell_integration::build_local_shell_launch_command;
    use std::fs;
    use std::sync::mpsc;
    use std::thread;
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    fn interactive_test_input() -> &'static str {
        if cfg!(windows) {
            "Write-Output 'sdkwork-terminal-runtime'\r\n"
        } else {
            "echo sdkwork-terminal-runtime\r\n"
        }
    }

    fn shell_ready(events: &[LocalShellSessionEvent]) -> bool {
        if cfg!(windows) {
            events.iter().any(|event| match event {
                LocalShellSessionEvent::Output { payload, .. } => {
                    payload.contains("PowerShell") || payload.contains("PS ")
                }
                _ => false,
            })
        } else {
            true
        }
    }

    fn collect_until<F>(
        receiver: &mpsc::Receiver<LocalShellSessionEvent>,
        timeout: Duration,
        mut predicate: F,
    ) -> Vec<LocalShellSessionEvent>
    where
        F: FnMut(&[LocalShellSessionEvent]) -> bool,
    {
        let deadline = Instant::now() + timeout;
        let mut events = Vec::new();

        while Instant::now() < deadline {
            match receiver.recv_timeout(Duration::from_millis(250)) {
                Ok(event) => {
                    events.push(event);
                    if predicate(&events) {
                        break;
                    }
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }

        events
    }

    fn interactive_process_command() -> PtyProcessLaunchCommand {
        if cfg!(windows) {
            let command = build_local_shell_launch_command("powershell").unwrap();
            PtyProcessLaunchCommand {
                program: command.program,
                args: command.args,
            }
        } else if std::path::Path::new("/bin/sh").is_file() {
            PtyProcessLaunchCommand {
                program: "/bin/sh".into(),
                args: Vec::new(),
            }
        } else {
            PtyProcessLaunchCommand {
                program: "sh".into(),
                args: Vec::new(),
            }
        }
    }

    #[cfg(windows)]
    fn temp_command_resolution_dir(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = env::temp_dir().join(format!(
            "sdkwork-terminal-pty-runtime-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[cfg(windows)]
    fn with_path_override<T>(path: &Path, operation: impl FnOnce() -> T) -> T {
        let original = env::var_os("PATH");
        env::set_var("PATH", path.as_os_str());
        let result = operation();
        match original {
            Some(value) => env::set_var("PATH", value),
            None => env::remove_var("PATH"),
        }
        result
    }

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn managed_terminal_environment_sets_terminal_capabilities_on_command_builder() {
        let mut builder = CommandBuilder::new("dummy");
        builder.env("NO_COLOR", "1");
        builder.env("NODE_DISABLE_COLORS", "1");
        apply_managed_terminal_environment_to_builder(&mut builder);

        assert_eq!(builder.get_env("TERM"), Some(std::ffi::OsStr::new("xterm-256color")));
        assert_eq!(builder.get_env("COLORTERM"), Some(std::ffi::OsStr::new("truecolor")));
        assert_eq!(builder.get_env("CLICOLOR"), Some(std::ffi::OsStr::new("1")));
        assert_eq!(builder.get_env("CLICOLOR_FORCE"), Some(std::ffi::OsStr::new("1")));
        assert_eq!(builder.get_env("FORCE_COLOR"), Some(std::ffi::OsStr::new("3")));
        assert_eq!(
            builder.get_env("TERM_PROGRAM"),
            Some(std::ffi::OsStr::new("sdkwork-terminal"))
        );
        assert_eq!(
            builder.get_env("TERM_PROGRAM_VERSION"),
            Some(std::ffi::OsStr::new(env!("CARGO_PKG_VERSION")))
        );
        assert_eq!(builder.get_env("NO_COLOR"), None);
        assert_eq!(builder.get_env("NODE_DISABLE_COLORS"), None);
    }

    #[cfg(windows)]
    #[test]
    fn prepare_process_launch_command_prefers_cmd_sibling_for_extensionless_windows_path() {
        let temp_dir = temp_command_resolution_dir("explicit-command");
        let extensionless_program = temp_dir.join("codex");
        let cmd_program = temp_dir.join("codex.cmd");
        fs::write(&extensionless_program, "#!/bin/sh\n").unwrap();
        fs::write(&cmd_program, "@echo off\r\n").unwrap();

        let prepared = prepare_process_launch_command(&PtyProcessLaunchCommand {
            program: extensionless_program.to_string_lossy().into_owned(),
            args: vec!["--version".into()],
        })
        .unwrap();

        assert_eq!(prepared.program, cmd_program.to_string_lossy());
        assert_eq!(prepared.args, vec!["--version"]);

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[cfg(windows)]
    #[test]
    fn prepare_process_launch_command_prefers_cmd_from_windows_path_lookup() {
        let temp_dir = temp_command_resolution_dir("path-lookup");
        fs::write(temp_dir.join("codex"), "#!/bin/sh\n").unwrap();
        fs::write(temp_dir.join("codex.cmd"), "@echo off\r\n").unwrap();

        let prepared = with_path_override(&temp_dir, || {
            prepare_process_launch_command(&PtyProcessLaunchCommand {
                program: "codex".into(),
                args: vec!["--version".into()],
            })
            .unwrap()
        });

        assert_eq!(
            prepared.program,
            temp_dir.join("codex.cmd").to_string_lossy()
        );
        assert_eq!(prepared.args, vec!["--version"]);

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[cfg(windows)]
    #[test]
    fn prepare_process_launch_command_wraps_powershell_scripts_on_windows() {
        let temp_dir = temp_command_resolution_dir("powershell-script");
        let script_path = temp_dir.join("codex.ps1");
        fs::write(&script_path, "Write-Output 'sdkwork-terminal'\r\n").unwrap();

        let prepared = prepare_process_launch_command(&PtyProcessLaunchCommand {
            program: script_path.to_string_lossy().into_owned(),
            args: vec!["--version".into()],
        })
        .unwrap();

        let launcher = Path::new(&prepared.program)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or(&prepared.program)
            .to_ascii_lowercase();
        assert!(launcher == "pwsh.exe" || launcher == "powershell.exe");
        assert_eq!(
            prepared.args,
            vec![
                "-NoLogo".to_string(),
                "-NoProfile".to_string(),
                "-File".to_string(),
                script_path.to_string_lossy().into_owned(),
                "--version".to_string(),
            ]
        );

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn executes_local_shell_command_and_captures_stdout() {
        let result = execute_local_shell_command(LocalShellExecutionRequest {
            profile: "shell".to_string(),
            command: "echo sdkwork-terminal".to_string(),
            working_directory: None,
        })
        .unwrap();

        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.contains("sdkwork-terminal"));
        assert_eq!(result.stderr, "");
        assert!(!result.invoked_program.is_empty());
    }

    #[test]
    fn executes_local_shell_command_and_preserves_non_zero_exit() {
        let command = if cfg!(windows) {
            "Write-Error 'sdkwork-failure'; exit 7"
        } else {
            "echo sdkwork-failure 1>&2; exit 7"
        };

        let result = execute_local_shell_command(LocalShellExecutionRequest {
            profile: if cfg!(windows) {
                "powershell".to_string()
            } else {
                "shell".to_string()
            },
            command: command.to_string(),
            working_directory: None,
        })
        .unwrap();

        assert_eq!(result.exit_code, 7);
        assert!(result.stderr.contains("sdkwork-failure"));
    }

    #[test]
    fn session_runtime_creates_interactive_shell_and_streams_output() {
        let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
        let (sender, receiver) = mpsc::channel();

        let session = runtime
            .create_session(
                LocalShellSessionCreateRequest {
                    session_id: "session-0001".into(),
                    profile: if cfg!(windows) {
                        "powershell".into()
                    } else {
                        "shell".into()
                    },
                    working_directory: None,
                    cols: 120,
                    rows: 32,
                },
                sender,
            )
            .unwrap();

        if cfg!(windows) {
            let _ = collect_until(&receiver, Duration::from_secs(8), shell_ready);
            runtime
                .write_input(&session.session_id, interactive_test_input())
                .unwrap();
        } else {
            thread::sleep(Duration::from_millis(300));
            runtime
                .write_input(&session.session_id, interactive_test_input())
                .unwrap();
        }

        let output_events = collect_until(&receiver, Duration::from_secs(8), |items| {
            items.iter().any(|event| match event {
                LocalShellSessionEvent::Output { payload, .. } => {
                    payload.contains("sdkwork-terminal-runtime")
                }
                _ => false,
            })
        });

        assert!(
            output_events.iter().any(|event| match event {
                LocalShellSessionEvent::Output { payload, .. } => {
                    payload.contains("sdkwork-terminal-runtime")
                }
                _ => false,
            }),
            "expected output event, got: {output_events:?}"
        );

        runtime.terminate_session(&session.session_id).unwrap();

        let exit_events = collect_until(&receiver, Duration::from_secs(8), |items| {
            items
                .iter()
                .any(|event| matches!(event, LocalShellSessionEvent::Exit { .. }))
        });

        assert!(
            exit_events
                .iter()
                .any(|event| matches!(event, LocalShellSessionEvent::Exit { .. })),
            "expected exit event, got: {exit_events:?}"
        );
    }

    #[test]
    fn session_runtime_defaults_to_transparent_probe_handling() {
        assert_eq!(
            LocalShellSessionRuntime::default().probe_response_mode,
            TerminalProbeResponseMode::Transparent
        );
        assert_eq!(
            LocalShellSessionRuntime::with_synthetic_probe_responses().probe_response_mode,
            TerminalProbeResponseMode::SyntheticCursorResponse
        );
    }

    #[test]
    fn session_runtime_creates_interactive_process_from_explicit_command() {
        let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
        let (sender, receiver) = mpsc::channel();

        let command = interactive_process_command();

        let session = runtime
            .create_process_session(
                PtyProcessSessionCreateRequest {
                    session_id: "session-process-0001".into(),
                    command: command.clone(),
                    working_directory: None,
                    cols: 120,
                    rows: 32,
                },
                sender,
            )
            .unwrap();

        assert_eq!(session.session_id, "session-process-0001");
        assert_eq!(session.invoked_program, command.program);
        assert_eq!(session.invoked_args, command.args);

        if cfg!(windows) {
            let _ = collect_until(&receiver, Duration::from_secs(8), shell_ready);
            runtime
                .write_input(
                    &session.session_id,
                    "Write-Output 'sdkwork-process-runtime'\r\n",
                )
                .unwrap();
        } else {
            thread::sleep(Duration::from_millis(300));
            runtime
                .write_input(&session.session_id, "echo sdkwork-process-runtime\r\n")
                .unwrap();
        }

        let output_events = collect_until(&receiver, Duration::from_secs(8), |items| {
            items.iter().any(|event| match event {
                LocalShellSessionEvent::Output { payload, .. } => {
                    payload.contains("sdkwork-process-runtime")
                }
                _ => false,
            })
        });

        assert!(
            output_events.iter().any(|event| match event {
                LocalShellSessionEvent::Output { payload, .. } => {
                    payload.contains("sdkwork-process-runtime")
                }
                _ => false,
            }),
            "expected explicit command output event, got: {output_events:?}"
        );

        runtime.terminate_session(&session.session_id).unwrap();
    }

    #[test]
    fn terminate_session_emits_exit_event_for_explicit_process_session() {
        let runtime = LocalShellSessionRuntime::with_synthetic_probe_responses();
        let (sender, receiver) = mpsc::channel();

        let command = interactive_process_command();

        let session = runtime
            .create_process_session(
                PtyProcessSessionCreateRequest {
                    session_id: "session-process-terminate-0001".into(),
                    command,
                    working_directory: None,
                    cols: 120,
                    rows: 32,
                },
                sender,
            )
            .unwrap();

        if cfg!(windows) {
            let _ = collect_until(&receiver, Duration::from_secs(8), shell_ready);
        } else {
            thread::sleep(Duration::from_millis(300));
        }

        runtime.terminate_session(&session.session_id).unwrap();

        let exit_events = collect_until(&receiver, Duration::from_secs(8), |items| {
            items
                .iter()
                .any(|event| matches!(event, LocalShellSessionEvent::Exit { .. }))
        });

        assert!(
            exit_events
                .iter()
                .any(|event| matches!(event, LocalShellSessionEvent::Exit { .. })),
            "expected terminate to emit exit event, got: {exit_events:?}"
        );
    }
}
