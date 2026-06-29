//! SDKWork Terminal observability crate.
//!
//! Provides a minimal Prometheus-compatible metrics registry, structured
//! component logging, and health status tracking for SDKWork Terminal
//! runtime services. Follows `OBSERVABILITY_SPEC.md` and
//! `HEALTH_CHECK_SPEC.md`.

pub mod health;
pub mod labels;
pub mod metrics;

pub use health::{current_health_status, set_health_status, HealthStatus};
pub use labels::CommonLabels;
pub use metrics::{
    render_prometheus_text, with_registry, Counter, Gauge, Histogram, MetricsRegistry,
    DEFAULT_HTTP_LATENCY_BUCKETS,
};

use serde::Serialize;

pub const CRATE_ID: &str = "sdkwork-terminal-observability";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

/// Legacy observability summary retained for backward compatibility with
/// existing callers (e.g. `sdkwork-terminal-runtime-node` bootstrap logs).
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ObservabilitySummary {
    pub component: &'static str,
    pub healthy: bool,
    pub tracing_sink: &'static str,
    pub metrics_sink: &'static str,
}

pub fn emit_component_log(level: &str, message: &str) {
    eprintln!("[{CRATE_ID}] {level}: {message}");
}

pub fn default_observability_summary() -> ObservabilitySummary {
    ObservabilitySummary {
        component: CRATE_ID,
        healthy: true,
        tracing_sink: "buffered",
        metrics_sink: "in-memory",
    }
}

pub fn readiness_summary() -> String {
    let health = current_health_status();
    let status = match health {
        HealthStatus::Serving => "serving",
        HealthStatus::Degraded => "degraded",
        HealthStatus::NotServing => "not_serving",
    };
    format!("{CRATE_ID} health={status} tracing=buffered metrics=in-memory")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn exposes_default_observability_summary() {
        let summary = default_observability_summary();

        assert_eq!(summary.component, CRATE_ID);
        assert!(summary.healthy);
        assert_eq!(summary.tracing_sink, "buffered");
        assert_eq!(summary.metrics_sink, "in-memory");
        assert!(readiness_summary().contains("tracing=buffered"));
    }

    #[test]
    fn readiness_summary_reflects_current_health() {
        set_health_status(HealthStatus::Serving);
        assert!(readiness_summary().contains("health=serving"));

        set_health_status(HealthStatus::NotServing);
        assert!(readiness_summary().contains("health=not_serving"));

        set_health_status(HealthStatus::Degraded);
        assert!(readiness_summary().contains("health=degraded"));

        // Restore default for other tests.
        set_health_status(HealthStatus::Serving);
    }
}
