#[cfg(windows)]
use crate::constants::CREATE_NO_WINDOW;
use crate::types::{CommandOutput, ConnectorCommand};
#[cfg(windows)]
use std::os::windows::process::CommandExt;

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

impl CommandRunner for SystemCommandRunner {
    fn run(&self, command: &ConnectorCommand) -> Result<CommandOutput, CommandRunnerError> {
        let mut process = std::process::Command::new(command.program);
        process.args(&command.args);
        apply_background_command_spawn_config(&mut process);
        let output = process
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

fn apply_background_command_spawn_config(command: &mut std::process::Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn normalize_command_stream(bytes: Vec<u8>) -> String {
    String::from_utf8_lossy(&bytes).trim_end().to_string()
}
