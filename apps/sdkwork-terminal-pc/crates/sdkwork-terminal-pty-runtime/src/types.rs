use serde::{Deserialize, Serialize};

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
