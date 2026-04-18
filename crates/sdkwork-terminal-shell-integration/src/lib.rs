pub const CRATE_ID: &str = "sdkwork-terminal-shell-integration";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

use serde::Serialize;
use std::{
    env,
    error::Error,
    fmt,
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalShellExecCommand {
    pub profile: String,
    pub program: String,
    pub args: Vec<String>,
    pub command_text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalShellLaunchCommand {
    pub profile: String,
    pub program: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LocalShellIntegrationError {
    UnsupportedProfile(String),
    ProgramUnavailable { profile: String, program: String },
    EmptyCommand,
}

impl fmt::Display for LocalShellIntegrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedProfile(profile) => {
                write!(formatter, "unsupported local shell profile: {profile}")
            }
            Self::ProgramUnavailable { profile, program } => {
                write!(
                    formatter,
                    "local shell profile '{profile}' is unavailable because '{program}' was not found in PATH"
                )
            }
            Self::EmptyCommand => formatter.write_str("local shell command cannot be empty"),
        }
    }
}

impl Error for LocalShellIntegrationError {}

pub fn build_local_shell_exec_command(
    profile: &str,
    command_text: &str,
) -> Result<LocalShellExecCommand, LocalShellIntegrationError> {
    let normalized_profile = profile.trim().to_lowercase();
    let normalized_command = command_text.trim();

    if normalized_command.is_empty() {
        return Err(LocalShellIntegrationError::EmptyCommand);
    }

    let (program, args) = match normalized_profile.as_str() {
        "powershell" => (
            require_powershell_program("powershell")?,
            powershell_args(normalized_command),
        ),
        "bash" => (
            require_command("bash", "bash")?,
            posix_shell_args(normalized_command),
        ),
        "shell" => default_shell_command(normalized_command)?,
        other => {
            return Err(LocalShellIntegrationError::UnsupportedProfile(
                other.to_string(),
            ))
        }
    };

    Ok(LocalShellExecCommand {
        profile: normalized_profile,
        program,
        args,
        command_text: normalized_command.to_string(),
    })
}

pub fn build_local_shell_launch_command(
    profile: &str,
) -> Result<LocalShellLaunchCommand, LocalShellIntegrationError> {
    let normalized_profile = profile.trim().to_lowercase();

    let (program, args) = match normalized_profile.as_str() {
        "powershell" => (
            require_powershell_program("powershell")?,
            powershell_launch_args(),
        ),
        "bash" => (require_command("bash", "bash")?, bash_launch_args()),
        "shell" => default_shell_launch_command()?,
        other => {
            return Err(LocalShellIntegrationError::UnsupportedProfile(
                other.to_string(),
            ))
        }
    };

    Ok(LocalShellLaunchCommand {
        profile: normalized_profile,
        program,
        args,
    })
}

fn default_shell_command(
    command_text: &str,
) -> Result<(String, Vec<String>), LocalShellIntegrationError> {
    if cfg!(windows) {
        Ok((
            require_powershell_program("shell")?,
            powershell_args(command_text),
        ))
    } else {
        let program = require_default_posix_shell_program("shell")?;

        Ok((program, posix_shell_args(command_text)))
    }
}

fn default_shell_launch_command() -> Result<(String, Vec<String>), LocalShellIntegrationError> {
    if cfg!(windows) {
        Ok((require_powershell_program("shell")?, powershell_launch_args()))
    } else {
        let program = require_default_posix_shell_program("shell")?;
        let args = if program == "bash" {
            bash_launch_args()
        } else {
            Vec::new()
        };
        Ok((program, args))
    }
}

fn resolve_preferred_powershell_program() -> Option<String> {
    if command_exists("pwsh") {
        Some("pwsh".to_string())
    } else if command_exists("powershell") {
        Some("powershell".to_string())
    } else {
        None
    }
}

fn require_powershell_program(profile: &str) -> Result<String, LocalShellIntegrationError> {
    resolve_preferred_powershell_program().ok_or_else(|| {
        LocalShellIntegrationError::ProgramUnavailable {
            profile: profile.to_string(),
            program: "pwsh or powershell".to_string(),
        }
    })
}

fn require_command(
    program: &str,
    profile: &str,
) -> Result<String, LocalShellIntegrationError> {
    if command_exists(program) {
        return Ok(program.to_string());
    }

    Err(LocalShellIntegrationError::ProgramUnavailable {
        profile: profile.to_string(),
        program: program.to_string(),
    })
}

fn require_default_posix_shell_program(
    profile: &str,
) -> Result<String, LocalShellIntegrationError> {
    if command_exists("bash") {
        return Ok("bash".to_string());
    }

    if command_exists("sh") {
        return Ok("sh".to_string());
    }

    Err(LocalShellIntegrationError::ProgramUnavailable {
        profile: profile.to_string(),
        program: "bash or sh".to_string(),
    })
}

fn powershell_prompt_init_command() -> String {
    r#"if (Get-Variable PSStyle -ErrorAction SilentlyContinue) { try { $PSStyle.OutputRendering = 'Ansi' } catch {} }; $global:__sdkworkNormalizePromptPath = { param([string]$path) if ([string]::IsNullOrWhiteSpace($path)) { '' } else { $normalized = ($path.Trim() -replace '^.+::', ''); if ($normalized.StartsWith('\\?\UNC\')) { '\\' + $normalized.Substring(8) } elseif ($normalized.StartsWith('\\?\') -or $normalized.StartsWith('\\.\')) { $normalized.Substring(4) } else { $normalized } } }; $global:__sdkworkResolvePromptPath = { $location = Get-Location; if ($null -eq $location) { '' } elseif (-not [string]::IsNullOrWhiteSpace($location.ProviderPath)) { & $global:__sdkworkNormalizePromptPath $location.ProviderPath } else { & $global:__sdkworkNormalizePromptPath $location.Path } }; function global:prompt { $location = & $global:__sdkworkResolvePromptPath; if ([string]::IsNullOrWhiteSpace($location)) { 'PS > ' } else { 'PS ' + $location + '> ' } }"#
        .to_string()
}

fn powershell_args(command_text: &str) -> Vec<String> {
    vec![
        "-NoLogo".to_string(),
        "-NoProfile".to_string(),
        "-NonInteractive".to_string(),
        "-Command".to_string(),
        command_text.to_string(),
    ]
}

fn powershell_launch_args() -> Vec<String> {
    vec![
        "-NoLogo".to_string(),
        "-NoProfile".to_string(),
        "-NoExit".to_string(),
        "-Command".to_string(),
        powershell_prompt_init_command(),
    ]
}

fn bash_launch_args() -> Vec<String> {
    vec!["-l".to_string()]
}

fn posix_shell_args(command_text: &str) -> Vec<String> {
    vec!["-lc".to_string(), command_text.to_string()]
}

fn command_exists(program: &str) -> bool {
    resolve_command_path(program).is_some()
}

fn resolve_command_path(program: &str) -> Option<PathBuf> {
    let program_path = Path::new(program);
    if program_path.components().count() > 1 && program_path.exists() {
        return Some(program_path.to_path_buf());
    }

    let path = env::var_os("PATH")?;
    let candidates = command_candidates(program);

    env::split_paths(&path).find_map(|directory| {
        candidates
            .iter()
            .map(|candidate| directory.join(candidate))
            .find(|candidate_path| candidate_path.is_file())
    })
}

fn command_candidates(program: &str) -> Vec<String> {
    let mut candidates = vec![program.to_string()];

    if cfg!(windows) {
        let has_extension = Path::new(program)
            .extension()
            .and_then(|value| value.to_str())
            .is_some();

        if !has_extension {
            let path_ext = env::var_os("PATHEXT")
                .map(|value| value.to_string_lossy().into_owned())
                .unwrap_or_else(|| ".COM;.EXE;.BAT;.CMD".to_string());

            for extension in path_ext.split(';').filter(|value| !value.is_empty()) {
                candidates.push(format!("{program}{extension}"));
                candidates.push(format!("{program}{}", extension.to_ascii_lowercase()));
            }
        }
    }

    candidates
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn builds_local_shell_exec_command_for_default_platform_profile() {
        let command = build_local_shell_exec_command("shell", "echo sdkwork").unwrap();

        if cfg!(windows) {
            assert!(
                command.program == "pwsh" || command.program == "powershell",
                "unexpected windows shell program: {}",
                command.program
            );
            assert!(command.args.iter().any(|arg| arg == "-Command"));
        } else {
            assert!(command.program == "sh" || command.program == "bash");
            assert!(command.args.iter().any(|arg| arg == "-lc"));
        }
        assert_eq!(command.command_text, "echo sdkwork");
    }

    #[test]
    fn builds_local_shell_exec_command_for_bash_profile() {
        let command = build_local_shell_exec_command("bash", "pwd");

        if !command_exists("bash") {
            assert!(matches!(
                command,
                Err(LocalShellIntegrationError::ProgramUnavailable { profile, program })
                if profile == "bash" && program == "bash"
            ));
            return;
        }

        let command = command.unwrap();

        assert_eq!(command.program, "bash");
        assert!(command.args.iter().any(|arg| arg == "-lc"));
        assert_eq!(command.command_text, "pwd");
    }

    #[test]
    fn returns_explicit_error_when_bash_launch_profile_is_unavailable() {
        if command_exists("bash") {
            return;
        }

        let error = build_local_shell_launch_command("bash")
            .expect_err("expected bash launch profile to require bash in PATH");

        assert!(matches!(
            error,
            LocalShellIntegrationError::ProgramUnavailable { profile, program }
            if profile == "bash" && program == "bash"
        ));
    }

    #[test]
    fn builds_local_shell_launch_command_for_interactive_shell() {
        let command = build_local_shell_launch_command("shell").unwrap();

        if cfg!(windows) {
            assert!(
                command.program == "pwsh" || command.program == "powershell",
                "unexpected windows shell program: {}",
                command.program
            );
            assert!(!command.args.iter().any(|arg| arg == "-NonInteractive"));
            assert!(command.args.iter().any(|arg| arg == "-NoLogo"));
            assert!(command.args.iter().any(|arg| arg == "-NoProfile"));
            assert!(command.args.iter().any(|arg| arg == "-NoExit"));
            assert!(command.args.iter().any(|arg| arg == "-Command"));

            let init_command = command
                .args
                .windows(2)
                .find_map(|window| {
                    if window.first().is_some_and(|value| value == "-Command") {
                        window.get(1)
                    } else {
                        None
                    }
                })
                .expect("missing PowerShell init command");

            assert!(init_command.contains("$PSStyle.OutputRendering = 'Ansi'"));
            assert!(init_command.contains("function global:prompt"));
            assert!(init_command.contains("ProviderPath"));
            assert!(init_command.contains("__sdkworkNormalizePromptPath"));
            assert!(init_command.contains("-replace '^.+::', ''"));
            assert!(!init_command.contains("Microsoft.PowerShell.Core"));
        } else {
            assert!(command.program == "sh" || command.program == "bash");
        }
    }
}
