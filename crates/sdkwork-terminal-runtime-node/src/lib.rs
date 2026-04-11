use sdkwork_terminal_session_runtime::SessionRuntime;
use std::{fs, path::Path};

mod host;
mod http;

pub const CRATE_ID: &str = "sdkwork-terminal-runtime-node";
pub const SERVER_SESSION_RUNTIME_DB_FILE_NAME: &str = "session-runtime.sqlite3";
pub const DEFAULT_SERVER_HOST_MODE: &str = "server";
pub const DEFAULT_SERVER_PLATFORM_FAMILY: &str = "ubuntu-server";
pub const DEFAULT_RUNTIME_LOCATION: &str = "runtime-node";

pub use host::*;
pub use http::*;

pub fn crate_id() -> &'static str {
    CRATE_ID
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeNodeBootstrapConfig {
    pub platform_family: String,
    pub cpu_arch: String,
    pub runtime_location: String,
}

impl Default for RuntimeNodeBootstrapConfig {
    fn default() -> Self {
        Self {
            platform_family: DEFAULT_SERVER_PLATFORM_FAMILY.into(),
            cpu_arch: normalize_cpu_arch(std::env::consts::ARCH),
            runtime_location: DEFAULT_RUNTIME_LOCATION.into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeNodeRecoveryDiagnostics {
    pub host_mode: String,
    pub platform_family: String,
    pub cpu_arch: String,
    pub runtime_location: String,
    pub storage_surface: String,
}

#[derive(Debug)]
pub struct RuntimeNodeSessionRuntimeBootstrap {
    pub diagnostics: RuntimeNodeRecoveryDiagnostics,
    pub session_runtime: SessionRuntime,
}

pub fn create_runtime_node_session_runtime(
    config: &RuntimeNodeBootstrapConfig,
    sqlite_path: Option<&Path>,
) -> Result<RuntimeNodeSessionRuntimeBootstrap, String> {
    let diagnostics = RuntimeNodeRecoveryDiagnostics {
        host_mode: DEFAULT_SERVER_HOST_MODE.into(),
        platform_family: config.platform_family.clone(),
        cpu_arch: normalize_cpu_arch(&config.cpu_arch),
        runtime_location: config.runtime_location.clone(),
        storage_surface: sqlite_path
            .map(|path| path.display().to_string())
            .unwrap_or_else(|| "in-memory-session-runtime".into()),
    };

    let session_runtime = match sqlite_path {
        Some(path) => {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|error| {
                    format!(
                        "failed to create runtime node session runtime directory {}: {error}",
                        parent.display()
                    )
                })?;
            }

            SessionRuntime::with_sqlite(path).map_err(|error| {
                format!(
                    "failed to initialize runtime node session runtime sqlite at {}: {error}",
                    path.display()
                )
            })?
        }
        None => SessionRuntime::new(),
    };

    Ok(RuntimeNodeSessionRuntimeBootstrap {
        diagnostics,
        session_runtime,
    })
}

fn normalize_cpu_arch(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "x86_64" | "amd64" | "x64" => "x64".into(),
        "aarch64" | "arm64" => "arm64".into(),
        other => other.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_terminal_session_runtime::SessionCreateRequest;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_db_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();

        std::env::temp_dir().join(format!("sdkwork-terminal-runtime-node-{name}-{unique}.db"))
    }

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn runtime_node_defaults_target_ubuntu_server_recovery() {
        let config = RuntimeNodeBootstrapConfig::default();

        assert_eq!(config.platform_family, "ubuntu-server");
        assert!(!config.cpu_arch.is_empty());
        assert_eq!(config.runtime_location, "runtime-node");
        assert_eq!(
            SERVER_SESSION_RUNTIME_DB_FILE_NAME,
            "session-runtime.sqlite3"
        );
    }

    #[test]
    fn create_runtime_node_session_runtime_recovers_persisted_server_index_and_replay() {
        let db_path = temp_db_path("server-session-runtime-recovery");
        let config = RuntimeNodeBootstrapConfig {
            platform_family: "ubuntu-server".into(),
            cpu_arch: "arm64".into(),
            runtime_location: "/srv/sdkwork-terminal/runtime-node-a".into(),
        };

        {
            let mut bootstrap =
                create_runtime_node_session_runtime(&config, Some(&db_path)).unwrap();
            let session = bootstrap
                .session_runtime
                .create_session(SessionCreateRequest {
                    workspace_id: "workspace-server-recovery".into(),
                    target: "server-runtime-node".into(),
                    mode_tags: vec!["cli-native".into()],
                    tags: vec!["resource:server-runtime-node".into()],
                    launch_intent: None,
                });
            let attachment = bootstrap
                .session_runtime
                .attach(&session.session_id)
                .unwrap();
            bootstrap
                .session_runtime
                .record_output(
                    &session.session_id,
                    "Ubuntu server session ready",
                    "2026-04-10T12:00:00.000Z",
                )
                .unwrap();
            bootstrap
                .session_runtime
                .acknowledge(&attachment.attachment_id, 1)
                .unwrap();
            bootstrap
                .session_runtime
                .detach(&attachment.attachment_id)
                .unwrap();
        }

        let recovered = create_runtime_node_session_runtime(&config, Some(&db_path)).unwrap();
        let sessions = recovered.session_runtime.list_sessions();

        assert_eq!(recovered.diagnostics.host_mode, "server");
        assert_eq!(recovered.diagnostics.platform_family, "ubuntu-server");
        assert_eq!(recovered.diagnostics.cpu_arch, "arm64");
        assert_eq!(
            recovered.diagnostics.runtime_location,
            "/srv/sdkwork-terminal/runtime-node-a"
        );
        assert_eq!(
            recovered.diagnostics.storage_surface,
            db_path.display().to_string()
        );
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].workspace_id, "workspace-server-recovery");
        assert_eq!(sessions[0].target, "server-runtime-node");
        assert_eq!(sessions[0].mode_tags, vec!["cli-native"]);
        assert_eq!(sessions[0].tags, vec!["resource:server-runtime-node"]);
        assert_eq!(sessions[0].last_ack_sequence, 1);

        let replay = recovered
            .session_runtime
            .replay(&sessions[0].session_id, None, 8)
            .unwrap();
        assert_eq!(replay.entries.len(), 1);
        assert_eq!(replay.entries[0].payload, "Ubuntu server session ready");

        let _ = fs::remove_file(db_path);
    }
}
