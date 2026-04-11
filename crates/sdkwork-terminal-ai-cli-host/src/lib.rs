pub const CRATE_ID: &str = "sdkwork-terminal-ai-cli-host";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

pub fn supported_hosts() -> [&'static str; 4] {
    ["codex", "claude-code", "gemini", "opencode"]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_native_cli_hosts() {
        assert_eq!(supported_hosts()[0], "codex");
    }
}
