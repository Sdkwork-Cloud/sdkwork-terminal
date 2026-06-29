//! Common metric labels required by `OBSERVABILITY_SPEC.md` §3.
//!
//! These labels are low-cardinality and bounded. They MUST NOT include raw
//! user ids, emails, API keys, access tokens, trace ids, request ids, file
//! paths, or any other unbounded or sensitive values (see `OBSERVABILITY_SPEC.md`
//! §3 "Label rules").

use std::fmt;

/// Bounded common labels attached to every exported metric series.
///
/// All fields are intentionally `&'static str` or owned `String` with bounded
/// values from a small enumeration. High-cardinality dimensions belong in
/// traces/logs, not metric labels.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CommonLabels {
    pub service: String,
    pub environment: Environment,
    pub deployment_profile: DeploymentProfile,
    pub runtime_target: RuntimeTarget,
}

impl CommonLabels {
    /// Default labels for the SDKWork Terminal runtime-node process.
    ///
    /// `service=sdkwork-terminal-runtime-node`, `environment=development`,
    /// `deployment_profile=standalone`, `runtime_target=server`.
    pub fn for_runtime_node() -> Self {
        Self {
            service: "sdkwork-terminal-runtime-node".into(),
            environment: Environment::development(),
            deployment_profile: DeploymentProfile::standalone(),
            runtime_target: RuntimeTarget::server(),
        }
    }

    /// Render labels as Prometheus exposition format, e.g.
    /// `service="...",environment="...",deployment_profile="...",runtime_target="..."`.
    pub fn render(&self) -> String {
        format!(
            "service=\"{service}\",environment=\"{environment}\",deployment_profile=\"{profile}\",runtime_target=\"{target}\"",
            service = self.service,
            environment = self.environment,
            profile = self.deployment_profile,
            target = self.runtime_target,
        )
    }
}

/// Deployment environment. Bounded to the four canonical values from
/// `OBSERVABILITY_SPEC.md` §3.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Environment {
    Development,
    Test,
    Staging,
    Production,
}

impl Environment {
    pub fn development() -> Self {
        Environment::Development
    }

    pub fn from_env_or_default(value: Option<&str>) -> Self {
        match value.map(|v| v.trim().to_ascii_lowercase()).as_deref() {
            Some("production") | Some("prod") => Environment::Production,
            Some("staging") => Environment::Staging,
            Some("test") | Some("testing") => Environment::Test,
            _ => Environment::Development,
        }
    }
}

impl fmt::Display for Environment {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Environment::Development => f.write_str("development"),
            Environment::Test => f.write_str("test"),
            Environment::Staging => f.write_str("staging"),
            Environment::Production => f.write_str("production"),
        }
    }
}

/// Deployment profile. Bounded to `standalone` or `cloud` per
/// `OBSERVABILITY_SPEC.md` §3.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DeploymentProfile {
    Standalone,
    Cloud,
}

impl DeploymentProfile {
    pub fn standalone() -> Self {
        DeploymentProfile::Standalone
    }

    pub fn from_env_or_default(value: Option<&str>) -> Self {
        match value.map(|v| v.trim().to_ascii_lowercase()).as_deref() {
            Some("cloud") => DeploymentProfile::Cloud,
            _ => DeploymentProfile::Standalone,
        }
    }
}

impl fmt::Display for DeploymentProfile {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DeploymentProfile::Standalone => f.write_str("standalone"),
            DeploymentProfile::Cloud => f.write_str("cloud"),
        }
    }
}

/// Runtime target. Bounded to the canonical runtime targets from
/// `CONFIG_SPEC.md` / `OBSERVABILITY_SPEC.md` §3.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RuntimeTarget {
    Server,
    Container,
    Desktop,
    Browser,
    TestRunner,
}

impl RuntimeTarget {
    pub fn server() -> Self {
        RuntimeTarget::Server
    }

    pub fn from_env_or_default(value: Option<&str>) -> Self {
        match value.map(|v| v.trim().to_ascii_lowercase()).as_deref() {
            Some("container") => RuntimeTarget::Container,
            Some("desktop") => RuntimeTarget::Desktop,
            Some("browser") => RuntimeTarget::Browser,
            Some("test-runner") | Some("test_runner") => RuntimeTarget::TestRunner,
            _ => RuntimeTarget::Server,
        }
    }
}

impl fmt::Display for RuntimeTarget {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RuntimeTarget::Server => f.write_str("server"),
            RuntimeTarget::Container => f.write_str("container"),
            RuntimeTarget::Desktop => f.write_str("desktop"),
            RuntimeTarget::Browser => f.write_str("browser"),
            RuntimeTarget::TestRunner => f.write_str("test-runner"),
        }
    }
}

/// Resolve `CommonLabels` from `SDKWORK_*` environment variables, falling
/// back to `CommonLabels::for_runtime_node()` defaults when unset.
pub fn common_labels_from_env() -> CommonLabels {
    let mut labels = CommonLabels::for_runtime_node();
    if let Ok(value) = std::env::var("SDKWORK_SERVICE_NAME") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            labels.service = trimmed.to_string();
        }
    }
    labels.environment =
        Environment::from_env_or_default(std::env::var("SDKWORK_ENVIRONMENT").ok().as_deref());
    labels.deployment_profile = DeploymentProfile::from_env_or_default(
        std::env::var("SDKWORK_DEPLOYMENT_PROFILE").ok().as_deref(),
    );
    labels.runtime_target =
        RuntimeTarget::from_env_or_default(std::env::var("SDKWORK_RUNTIME_TARGET").ok().as_deref());
    labels
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn common_labels_for_runtime_node_has_expected_defaults() {
        let labels = CommonLabels::for_runtime_node();
        assert_eq!(labels.service, "sdkwork-terminal-runtime-node");
        assert_eq!(labels.environment, Environment::Development);
        assert_eq!(labels.deployment_profile, DeploymentProfile::Standalone);
        assert_eq!(labels.runtime_target, RuntimeTarget::Server);
    }

    #[test]
    fn common_labels_render_prometheus_format() {
        let labels = CommonLabels::for_runtime_node();
        let rendered = labels.render();
        assert!(rendered.contains("service=\"sdkwork-terminal-runtime-node\""));
        assert!(rendered.contains("environment=\"development\""));
        assert!(rendered.contains("deployment_profile=\"standalone\""));
        assert!(rendered.contains("runtime_target=\"server\""));
    }

    #[test]
    fn environment_parsing_recognizes_canonical_values() {
        assert_eq!(
            Environment::from_env_or_default(Some("production")),
            Environment::Production
        );
        assert_eq!(
            Environment::from_env_or_default(Some("staging")),
            Environment::Staging
        );
        assert_eq!(
            Environment::from_env_or_default(Some("test")),
            Environment::Test
        );
        assert_eq!(
            Environment::from_env_or_default(None),
            Environment::Development
        );
        assert_eq!(
            Environment::from_env_or_default(Some("garbage")),
            Environment::Development
        );
    }

    #[test]
    fn deployment_profile_parsing_recognizes_cloud() {
        assert_eq!(
            DeploymentProfile::from_env_or_default(Some("cloud")),
            DeploymentProfile::Cloud
        );
        assert_eq!(
            DeploymentProfile::from_env_or_default(None),
            DeploymentProfile::Standalone
        );
    }

    #[test]
    fn runtime_target_parsing_recognizes_container_and_desktop() {
        assert_eq!(
            RuntimeTarget::from_env_or_default(Some("container")),
            RuntimeTarget::Container
        );
        assert_eq!(
            RuntimeTarget::from_env_or_default(Some("desktop")),
            RuntimeTarget::Desktop
        );
        assert_eq!(
            RuntimeTarget::from_env_or_default(None),
            RuntimeTarget::Server
        );
    }
}
