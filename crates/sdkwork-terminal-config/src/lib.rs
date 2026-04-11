use sdkwork_terminal_protocol::{LOCAL_RUNTIME_NAMESPACE, PUBLIC_API_PREFIX};

pub const CRATE_ID: &str = "sdkwork-terminal-config";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

pub fn default_local_runtime_endpoint() -> String {
    if cfg!(windows) {
        format!(r"\\.\pipe\{LOCAL_RUNTIME_NAMESPACE}")
    } else {
        format!("/tmp/{LOCAL_RUNTIME_NAMESPACE}.sock")
    }
}

pub fn default_public_api_prefix() -> &'static str {
    PUBLIC_API_PREFIX
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn uses_protocol_defaults_for_local_runtime_and_public_api() {
        let local_runtime = default_local_runtime_endpoint();

        assert!(local_runtime.contains("sdkwork-terminal.runtime.v1"));
        assert_eq!(default_public_api_prefix(), "/terminal/api/v1");
    }
}
