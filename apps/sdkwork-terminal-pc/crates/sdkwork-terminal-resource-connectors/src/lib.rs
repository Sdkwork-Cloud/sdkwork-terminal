//! Resource connector catalog, launch planning, and host tooling discovery
//! for the sdkwork-terminal desktop application.

mod constants;
mod discovery;
mod launch;
mod runner;
mod types;

#[cfg(test)]
mod tests;

pub use constants::{crate_id, CRATE_ID};
pub use discovery::{discover_connector_execution_targets, ConnectorDiscoveryEnvironment};
pub use launch::{
    build_cli_launch_plan, build_cli_launch_plan_for_request, build_toolchain_smoke_command,
    execute_plan_phase, run_toolchain_smoke,
};
pub use runner::{CommandRunner, CommandRunnerError, SystemCommandRunner};
pub use types::{
    connector_catalog, connector_summary, find_connector, CommandOutput, ConnectorCloseAction,
    ConnectorCommand, ConnectorDescriptor, ConnectorExecutionError, ConnectorExecutionTarget,
    ConnectorHealth, ConnectorLaunchPlan, ConnectorPhase, ConnectorPlanError,
    ConnectorSessionLaunchRequest, ConnectorSmokeReport, ConnectorSmokeStatus, ConnectorSummary,
    ConnectorTransport,
};
