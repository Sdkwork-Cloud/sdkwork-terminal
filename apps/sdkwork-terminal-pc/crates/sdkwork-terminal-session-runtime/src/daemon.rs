use sdkwork_terminal_observability::readiness_summary as observability_readiness_summary;
use serde::Serialize;

use crate::readiness_summary;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum LocalDaemonPhase {
    Stopped,
    Starting,
    Running,
    Reconnecting,
    Failed,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalDaemonHealthSnapshot {
    pub phase: LocalDaemonPhase,
    pub healthy: bool,
    pub start_count: u32,
    pub reconnect_count: u32,
    pub stop_count: u32,
    pub last_error: Option<String>,
    pub runtime_summary: String,
    pub observability_summary: String,
}

#[derive(Debug, Default)]
pub struct LocalSessionDaemon {
    start_count: u32,
    reconnect_count: u32,
    stop_count: u32,
    last_error: Option<String>,
    phase: Option<LocalDaemonPhase>,
}

impl LocalSessionDaemon {
    pub fn health_snapshot(&self) -> LocalDaemonHealthSnapshot {
        let phase = self.phase.clone().unwrap_or(LocalDaemonPhase::Stopped);
        let healthy = matches!(phase, LocalDaemonPhase::Running);

        LocalDaemonHealthSnapshot {
            phase,
            healthy,
            start_count: self.start_count,
            reconnect_count: self.reconnect_count,
            stop_count: self.stop_count,
            last_error: self.last_error.clone(),
            runtime_summary: readiness_summary(),
            observability_summary: observability_readiness_summary(),
        }
    }

    pub fn start(&mut self) -> LocalDaemonHealthSnapshot {
        self.phase = Some(LocalDaemonPhase::Starting);
        self.start_count += 1;
        self.last_error = None;
        self.health_snapshot()
    }

    pub fn mark_running(&mut self) -> LocalDaemonHealthSnapshot {
        if matches!(
            self.phase,
            Some(LocalDaemonPhase::Starting) | Some(LocalDaemonPhase::Reconnecting)
        ) {
            self.phase = Some(LocalDaemonPhase::Running);
        }
        self.health_snapshot()
    }

    pub fn stop(&mut self) -> LocalDaemonHealthSnapshot {
        self.stop_count += 1;
        self.phase = Some(LocalDaemonPhase::Stopped);
        self.health_snapshot()
    }

    pub fn reconnect(&mut self) -> LocalDaemonHealthSnapshot {
        self.reconnect_count += 1;
        self.phase = Some(LocalDaemonPhase::Reconnecting);
        self.last_error = None;
        self.health_snapshot()
    }

    pub fn fail(&mut self, message: impl Into<String>) -> LocalDaemonHealthSnapshot {
        self.phase = Some(LocalDaemonPhase::Failed);
        self.last_error = Some(message.into());
        self.health_snapshot()
    }
}
