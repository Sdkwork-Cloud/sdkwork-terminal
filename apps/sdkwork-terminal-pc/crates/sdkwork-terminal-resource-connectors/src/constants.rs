pub const CRATE_ID: &str = "sdkwork-terminal-resource-connectors";
pub(crate) const DEFAULT_DISCOVERY_WORKSPACE_ID: &str = "workspace-demo";
pub(crate) const SSH_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_SSH_AUTHORITY";
pub(crate) const DOCKER_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_DOCKER_AUTHORITY";
pub(crate) const KUBERNETES_AUTHORITY_ENV_VAR: &str = "SDKWORK_TERMINAL_KUBERNETES_AUTHORITY";
pub(crate) const REMOTE_RUNTIME_AUTHORITY_ENV_VAR: &str =
    "SDKWORK_TERMINAL_REMOTE_RUNTIME_AUTHORITY";
#[cfg(windows)]
pub(crate) const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn crate_id() -> &'static str {
    CRATE_ID
}
