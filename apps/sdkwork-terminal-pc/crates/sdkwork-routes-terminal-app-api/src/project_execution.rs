use std::path::{Path, PathBuf};

/// The authenticated project identity needed to resolve a terminal root. This
/// transport-neutral request intentionally contains no caller-supplied path.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectTerminalExecutionRequest {
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub subject_id: String,
    pub project_id: String,
    pub runtime_location_id: String,
}

/// The only terminal target currently supported by the in-process runtime
/// node. Other targets need their own mutually authenticated execution
/// adapters instead of being relabeled as a local process.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProjectTerminalExecutionTarget {
    ServerRuntimeNode,
}

impl ProjectTerminalExecutionTarget {
    pub const fn as_host_target(self) -> &'static str {
        match self {
            Self::ServerRuntimeNode => "server-runtime-node",
        }
    }
}

/// Resolved terminal execution facts. The canonical root is deliberately not
/// serializable, printable, or exposed through a public accessor returning a
/// string. It is consumed only while constructing the local PTY request.
pub struct ResolvedProjectTerminalExecution {
    workspace_id: String,
    target: ProjectTerminalExecutionTarget,
    authority: String,
    canonical_root: PathBuf,
}

impl ResolvedProjectTerminalExecution {
    pub fn new(
        workspace_id: impl Into<String>,
        target: ProjectTerminalExecutionTarget,
        authority: impl Into<String>,
        canonical_root: PathBuf,
    ) -> Self {
        Self {
            workspace_id: workspace_id.into(),
            target,
            authority: authority.into(),
            canonical_root,
        }
    }

    pub fn workspace_id(&self) -> &str {
        &self.workspace_id
    }

    pub fn target(&self) -> ProjectTerminalExecutionTarget {
        self.target
    }

    pub fn authority(&self) -> &str {
        &self.authority
    }

    pub(crate) fn canonical_root(&self) -> &Path {
        &self.canonical_root
    }
}

/// Stable, path-free failures from an application-owned project resolver.
/// Mapping a domain-specific error into this enum belongs in runtime
/// composition, not in the generic terminal route crate.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProjectTerminalExecutionError {
    InvalidInput,
    NotFound,
    Forbidden,
    Conflict,
    Unavailable,
    Internal,
}

#[async_trait::async_trait]
pub trait ProjectTerminalExecutionResolver: Send + Sync {
    async fn resolve_project_terminal_execution(
        &self,
        request: ProjectTerminalExecutionRequest,
    ) -> Result<ResolvedProjectTerminalExecution, ProjectTerminalExecutionError>;
}

/// Default composition must fail closed until the host provides a resolver
/// backed by a trusted project runtime-location authority.
#[derive(Clone, Default)]
pub struct DenyProjectTerminalExecutionResolver;

#[async_trait::async_trait]
impl ProjectTerminalExecutionResolver for DenyProjectTerminalExecutionResolver {
    async fn resolve_project_terminal_execution(
        &self,
        _request: ProjectTerminalExecutionRequest,
    ) -> Result<ResolvedProjectTerminalExecution, ProjectTerminalExecutionError> {
        Err(ProjectTerminalExecutionError::Unavailable)
    }
}
