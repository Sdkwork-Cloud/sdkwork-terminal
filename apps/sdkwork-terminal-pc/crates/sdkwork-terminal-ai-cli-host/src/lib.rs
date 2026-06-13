pub const CRATE_ID: &str = "sdkwork-terminal-ai-cli-host";

use serde::{Deserialize, Serialize};
use std::{collections::HashMap, env, error::Error, fmt, process::Command};

pub fn crate_id() -> &'static str {
    CRATE_ID
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AiCliKind {
    Codex,
    ClaudeCode,
    Gemini,
    OpenCode,
}

impl AiCliKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Codex => "codex",
            Self::ClaudeCode => "claude-code",
            Self::Gemini => "gemini",
            Self::OpenCode => "opencode",
        }
    }

    pub fn parse_kind(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "codex" => Some(Self::Codex),
            "claude-code" | "claude_code" | "claudecode" => Some(Self::ClaudeCode),
            "gemini" => Some(Self::Gemini),
            "opencode" | "open-code" | "open_code" => Some(Self::OpenCode),
            _ => None,
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Codex => "Codex",
            Self::ClaudeCode => "Claude Code",
            Self::Gemini => "Gemini",
            Self::OpenCode => "OpenCode",
        }
    }

    pub fn binary_names(&self) -> &[&str] {
        match self {
            Self::Codex => &["codex"],
            Self::ClaudeCode => &["claude"],
            Self::Gemini => &["gemini"],
            Self::OpenCode => &["opencode"],
        }
    }

    pub fn version_args(&self) -> &[&str] {
        match self {
            Self::Codex => &["--version"],
            Self::ClaudeCode => &["--version"],
            Self::Gemini => &["--version"],
            Self::OpenCode => &["--version"],
        }
    }

    pub fn session_tags(&self) -> Vec<String> {
        vec!["cli-native".into(), format!("ai-cli:{}", self.as_str())]
    }
}

pub const ALL_CLI_KINDS: [AiCliKind; 4] = [
    AiCliKind::Codex,
    AiCliKind::ClaudeCode,
    AiCliKind::Gemini,
    AiCliKind::OpenCode,
];

pub fn supported_hosts() -> [&'static str; 4] {
    ["codex", "claude-code", "gemini", "opencode"]
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliBinaryDiscovery {
    pub cli_kind: AiCliKind,
    pub found: bool,
    pub binary_path: Option<String>,
    pub version: Option<String>,
    pub auth_state: AiCliAuthState,
    pub platform_family: String,
    pub checked_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliAuthState {
    pub authenticated: bool,
    pub summary: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliLaunchTemplate {
    pub cli_kind: AiCliKind,
    pub display_name: String,
    pub workdir: Option<String>,
    pub args: Vec<String>,
    pub env_allowlist: Vec<String>,
    pub execution_target: String,
    pub profile_ref: Option<String>,
    pub recovery_policy: AiCliRecoveryPolicy,
    pub session_tags: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliRecoveryPolicy {
    pub auto_restart: bool,
    pub max_retries: u32,
    pub preserve_workdir: bool,
}

impl Default for AiCliRecoveryPolicy {
    fn default() -> Self {
        Self {
            auto_restart: true,
            max_retries: 3,
            preserve_workdir: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliDiscoverySnapshot {
    pub platform_family: String,
    pub cpu_arch: String,
    pub discoveries: Vec<AiCliBinaryDiscovery>,
    pub checked_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliSessionCreateRequest {
    pub cli_kind: AiCliKind,
    pub workspace_id: String,
    pub working_directory: Option<String>,
    pub extra_args: Vec<String>,
    pub extra_env: HashMap<String, String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

#[derive(Debug)]
pub enum AiCliHostError {
    Discovery(String),
    Launch(String),
    BinaryNotFound(String),
    InvalidRequest(String),
}

impl fmt::Display for AiCliHostError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Discovery(message) => write!(formatter, "AI CLI discovery error: {message}"),
            Self::Launch(message) => write!(formatter, "AI CLI launch error: {message}"),
            Self::BinaryNotFound(name) => {
                write!(formatter, "AI CLI binary not found: {name}")
            }
            Self::InvalidRequest(message) => {
                write!(formatter, "AI CLI invalid request: {message}")
            }
        }
    }
}

impl Error for AiCliHostError {}

pub struct AiCliHost {
    platform_family: String,
    cpu_arch: String,
}

impl AiCliHost {
    pub fn new(platform_family: impl Into<String>, cpu_arch: impl Into<String>) -> Self {
        Self {
            platform_family: platform_family.into(),
            cpu_arch: normalize_cpu_arch(&cpu_arch.into()),
        }
    }

    pub fn new_default() -> Self {
        Self::new(detect_platform_family(), env::consts::ARCH)
    }

    pub fn platform_family(&self) -> &str {
        &self.platform_family
    }

    pub fn cpu_arch(&self) -> &str {
        &self.cpu_arch
    }

    pub fn discover_all(&self) -> AiCliDiscoverySnapshot {
        let discoveries = ALL_CLI_KINDS
            .iter()
            .map(|kind| self.discover_single(kind))
            .collect();

        AiCliDiscoverySnapshot {
            platform_family: self.platform_family.clone(),
            cpu_arch: self.cpu_arch.clone(),
            discoveries,
            checked_at: current_timestamp(),
        }
    }

    pub fn discover_single(&self, kind: &AiCliKind) -> AiCliBinaryDiscovery {
        let binary_path = find_binary(kind);
        let version = binary_path
            .as_ref()
            .and_then(|path| read_version(kind, path));
        let auth_state = check_auth_state(kind, binary_path.as_deref());

        AiCliBinaryDiscovery {
            cli_kind: kind.clone(),
            found: binary_path.is_some(),
            binary_path,
            version,
            auth_state,
            platform_family: self.platform_family.clone(),
            checked_at: current_timestamp(),
        }
    }

    pub fn build_launch_template(
        &self,
        request: &AiCliSessionCreateRequest,
    ) -> Result<AiCliLaunchTemplate, AiCliHostError> {
        let discovery = self.discover_single(&request.cli_kind);
        if !discovery.found {
            return Err(AiCliHostError::BinaryNotFound(
                request.cli_kind.binary_names().join("/"),
            ));
        }

        let args = request.extra_args.clone();

        let env_allowlist = vec![
            "PATH".into(),
            "HOME".into(),
            "USER".into(),
            "SHELL".into(),
            "TERM".into(),
            "COLORTERM".into(),
            "LANG".into(),
            "LC_ALL".into(),
        ];

        Ok(AiCliLaunchTemplate {
            cli_kind: request.cli_kind.clone(),
            display_name: request.cli_kind.display_name().into(),
            workdir: request.working_directory.clone(),
            args: args.into_iter().map(String::from).collect(),
            env_allowlist,
            execution_target: "local-shell".into(),
            profile_ref: None,
            recovery_policy: AiCliRecoveryPolicy::default(),
            session_tags: request.cli_kind.session_tags(),
        })
    }

    pub fn build_session_command(
        &self,
        request: &AiCliSessionCreateRequest,
    ) -> Result<(String, Vec<String>), AiCliHostError> {
        let discovery = self.discover_single(&request.cli_kind);
        let binary_path = discovery.binary_path.ok_or_else(|| {
            AiCliHostError::BinaryNotFound(request.cli_kind.binary_names().join("/"))
        })?;

        let args = request.extra_args.clone();

        Ok((binary_path, args))
    }
}

fn find_binary(kind: &AiCliKind) -> Option<String> {
    for name in kind.binary_names() {
        if let Some(path) = lookup_binary_path(name) {
            return Some(path);
        }
    }
    None
}

fn lookup_binary_path(name: &str) -> Option<String> {
    if cfg!(windows) {
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                &format!("(Get-Command {name} -ErrorAction SilentlyContinue).Source"),
            ])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            None
        } else {
            Some(path)
        }
    } else {
        let output = Command::new("which").arg(name).output().ok()?;
        if !output.status.success() {
            return None;
        }
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            None
        } else {
            Some(path)
        }
    }
}

fn read_version(kind: &AiCliKind, binary_path: &str) -> Option<String> {
    let output = Command::new(binary_path)
        .args(kind.version_args())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    extract_version_string(&raw)
}

fn extract_version_string(raw: &str) -> Option<String> {
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        for segment in trimmed.split_whitespace() {
            let cleaned = segment.trim_start_matches('v');
            if cleaned
                .chars()
                .next()
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
            {
                return Some(cleaned.to_string());
            }
        }
    }
    let first_line = raw.lines().next()?.trim();
    if first_line.is_empty() {
        None
    } else {
        for segment in first_line.split_whitespace() {
            let cleaned = segment.trim_start_matches('v');
            if cleaned
                .chars()
                .next()
                .map(|c| c.is_ascii_digit())
                .unwrap_or(false)
            {
                return Some(cleaned.to_string());
            }
        }
        None
    }
}

fn check_auth_state(kind: &AiCliKind, binary_path: Option<&str>) -> AiCliAuthState {
    let Some(_path) = binary_path else {
        return AiCliAuthState {
            authenticated: false,
            summary: "binary not found".into(),
            details: None,
        };
    };

    match kind {
        AiCliKind::Codex => check_env_auth_state(&["OPENAI_API_KEY"]),
        AiCliKind::ClaudeCode => check_env_auth_state(&["ANTHROPIC_API_KEY"]),
        AiCliKind::Gemini => check_env_auth_state(&["GOOGLE_API_KEY", "GEMINI_API_KEY"]),
        AiCliKind::OpenCode => check_env_auth_state(&["OPENAI_API_KEY"]),
    }
}

fn check_env_auth_state(keys: &[&str]) -> AiCliAuthState {
    for key in keys {
        if let Ok(value) = env::var(key) {
            if !value.trim().is_empty() {
                return AiCliAuthState {
                    authenticated: true,
                    summary: format!("{key} is set"),
                    details: Some(format!("{key}=<redacted>")),
                };
            }
        }
    }

    AiCliAuthState {
        authenticated: false,
        summary: "no authentication env var found".into(),
        details: Some(format!("checked: {}", keys.join(", "))),
    }
}

fn detect_platform_family() -> String {
    if cfg!(windows) {
        "windows".into()
    } else if cfg!(target_os = "macos") {
        "macos".into()
    } else {
        "ubuntu-desktop".into()
    }
}

fn normalize_cpu_arch(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "x86_64" | "amd64" | "x64" => "x64".into(),
        "aarch64" | "arm64" => "arm64".into(),
        other => other.into(),
    }
}

fn current_timestamp() -> String {
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();

    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let mut year = 1970i32;
    let mut remaining_days = days as i32;
    loop {
        let year_days = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days < year_days {
            break;
        }
        remaining_days -= year_days;
        year += 1;
    }

    let month_days = if is_leap_year(year) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1u32;
    let mut day = 1u32;
    for (i, &days_in_month) in month_days.iter().enumerate() {
        if remaining_days < days_in_month {
            month = i as u32 + 1;
            day = remaining_days as u32 + 1;
            break;
        }
        remaining_days -= days_in_month;
    }

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hours, minutes, seconds, millis
    )
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn exposes_native_cli_hosts() {
        assert_eq!(supported_hosts()[0], "codex");
        assert_eq!(supported_hosts()[1], "claude-code");
        assert_eq!(supported_hosts()[2], "gemini");
        assert_eq!(supported_hosts()[3], "opencode");
    }

    #[test]
    fn cli_kind_parse_roundtrip() {
        for kind in &ALL_CLI_KINDS {
            let parsed = AiCliKind::parse_kind(kind.as_str());
            assert_eq!(parsed.as_ref(), Some(kind));
        }
    }

    #[test]
    fn cli_kind_parse_aliases() {
        assert_eq!(
            AiCliKind::parse_kind("claude_code"),
            Some(AiCliKind::ClaudeCode)
        );
        assert_eq!(
            AiCliKind::parse_kind("claudecode"),
            Some(AiCliKind::ClaudeCode)
        );
        assert_eq!(
            AiCliKind::parse_kind("open-code"),
            Some(AiCliKind::OpenCode)
        );
        assert_eq!(
            AiCliKind::parse_kind("open_code"),
            Some(AiCliKind::OpenCode)
        );
    }

    #[test]
    fn cli_kind_display_name() {
        assert_eq!(AiCliKind::Codex.display_name(), "Codex");
        assert_eq!(AiCliKind::ClaudeCode.display_name(), "Claude Code");
        assert_eq!(AiCliKind::Gemini.display_name(), "Gemini");
        assert_eq!(AiCliKind::OpenCode.display_name(), "OpenCode");
    }

    #[test]
    fn cli_kind_session_tags() {
        let tags = AiCliKind::Codex.session_tags();
        assert!(tags.contains(&"cli-native".to_string()));
        assert!(tags.contains(&"ai-cli:codex".to_string()));
    }

    #[test]
    fn discovery_snapshot_has_all_clis() {
        let host = AiCliHost::new("windows", "x64");
        let snapshot = host.discover_all();

        assert_eq!(snapshot.discoveries.len(), 4);
        assert_eq!(snapshot.platform_family, "windows");
        assert_eq!(snapshot.cpu_arch, "x64");
        assert!(!snapshot.checked_at.is_empty());
    }

    #[test]
    fn discovery_single_returns_structured_result() {
        let host = AiCliHost::new("ubuntu-desktop", "arm64");
        let discovery = host.discover_single(&AiCliKind::Codex);

        assert_eq!(discovery.cli_kind, AiCliKind::Codex);
        assert_eq!(discovery.platform_family, "ubuntu-desktop");
        assert!(!discovery.checked_at.is_empty());
    }

    #[test]
    fn extract_version_from_semver_output() {
        let version = extract_version_string("codex 1.2.3");
        assert_eq!(version.as_deref(), Some("1.2.3"));
    }

    #[test]
    fn extract_version_from_v_prefix() {
        let version = extract_version_string("v2.0.0-beta.1");
        assert_eq!(version.as_deref(), Some("2.0.0-beta.1"));
    }

    #[test]
    fn extract_version_from_multiline_output() {
        let raw = "Some CLI Tool\nVersion: 3.4.5\nBuild: abc123";
        let version = extract_version_string(raw);
        assert_eq!(version.as_deref(), Some("3.4.5"));
    }

    #[test]
    fn recovery_policy_defaults() {
        let policy = AiCliRecoveryPolicy::default();
        assert!(policy.auto_restart);
        assert_eq!(policy.max_retries, 3);
        assert!(policy.preserve_workdir);
    }

    #[test]
    fn launch_template_builder_errors_on_missing_binary() {
        let host = AiCliHost::new("windows", "x64");
        let request = AiCliSessionCreateRequest {
            cli_kind: AiCliKind::Codex,
            workspace_id: "workspace-test".into(),
            working_directory: None,
            extra_args: vec![],
            extra_env: HashMap::new(),
            cols: Some(120),
            rows: Some(32),
        };

        let result = host.build_launch_template(&request);
        if let Err(error) = result {
            assert!(matches!(error, AiCliHostError::BinaryNotFound(_)));
        }
    }

    #[test]
    fn normalize_cpu_arch_variants() {
        assert_eq!(normalize_cpu_arch("x86_64"), "x64");
        assert_eq!(normalize_cpu_arch("amd64"), "x64");
        assert_eq!(normalize_cpu_arch("x64"), "x64");
        assert_eq!(normalize_cpu_arch("aarch64"), "arm64");
        assert_eq!(normalize_cpu_arch("arm64"), "arm64");
    }

    #[test]
    fn detect_platform_family_returns_known_value() {
        let platform = detect_platform_family();
        assert!(["windows", "macos", "ubuntu-desktop"].contains(&platform.as_str()));
    }
}
