#[cfg(windows)]
use crate::constants::CREATE_NO_WINDOW;
use crate::types::{CommandOutput, ConnectorCommand};
use sdkwork_utils_rust::process::{run_bounded, BoundedCommandError, BOUNDED_COMMAND_TIMEOUT};
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandRunnerError {
    Spawn(String),
    Timeout {
        program: String,
        timeout_seconds: u64,
    },
    Exit {
        status: i32,
        stderr: String,
    },
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
        let output = run_bounded(
            &mut process,
            BOUNDED_COMMAND_TIMEOUT,
            sdkwork_utils_rust::process::BOUNDED_COMMAND_MAX_OUTPUT_BYTES,
        )
        .map_err(map_bounded_error)?;
        let status = output.status.unwrap_or(-1);

        if output.timed_out {
            return Err(CommandRunnerError::Timeout {
                program: command.program.to_string(),
                timeout_seconds: BOUNDED_COMMAND_TIMEOUT.as_secs(),
            });
        }

        if output.success {
            Ok(CommandOutput {
                status,
                stdout: output.stdout,
                stderr: output.stderr,
            })
        } else {
            Err(CommandRunnerError::Exit {
                status,
                stderr: output.stderr,
            })
        }
    }
}

fn map_bounded_error(error: BoundedCommandError) -> CommandRunnerError {
    match error {
        BoundedCommandError::Spawn(message) => CommandRunnerError::Spawn(message),
        BoundedCommandError::Timeout {
            program,
            timeout_seconds,
        } => CommandRunnerError::Timeout {
            program,
            timeout_seconds,
        },
    }
}

fn apply_background_command_spawn_config(command: &mut std::process::Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}
