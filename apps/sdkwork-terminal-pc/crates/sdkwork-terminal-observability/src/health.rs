//! Health status tracking for `/healthz` and `/readyz` probes.
//!
//! Implements the `<service>_health_status` gauge contract from
//! `OBSERVABILITY_SPEC.md` §3 (Health check metrics) and the readiness
//! semantics from `HEALTH_CHECK_SPEC.md`.

use std::sync::OnceLock;

use parking_lot::RwLock;

/// Coarse-grained process health status used by liveness/readiness probes.
///
/// `Serving` maps to gauge value `1`; `NotServing` and `Degraded` map to `0`
/// per the health gauge contract. `Degraded` is preserved as a distinct enum
/// variant so callers can log the transition reason without losing fidelity.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthStatus {
    Serving,
    Degraded,
    NotServing,
}

impl HealthStatus {
    pub fn as_gauge_value(self) -> f64 {
        match self {
            HealthStatus::Serving => 1.0,
            HealthStatus::Degraded | HealthStatus::NotServing => 0.0,
        }
    }

    pub fn as_label(self) -> &'static str {
        match self {
            HealthStatus::Serving => "serving",
            HealthStatus::Degraded => "degraded",
            HealthStatus::NotServing => "not_serving",
        }
    }
}

static CURRENT_HEALTH: OnceLock<RwLock<HealthStatus>> = OnceLock::new();

fn health_cell() -> &'static RwLock<HealthStatus> {
    CURRENT_HEALTH.get_or_init(|| RwLock::new(HealthStatus::Serving))
}

/// Update the global health status. Subsequent `current_health_status` calls
/// observe the new value. Idempotent when the status is unchanged.
pub fn set_health_status(status: HealthStatus) {
    let mut guard = health_cell().write();
    *guard = status;
}

/// Read the current global health status.
pub fn current_health_status() -> HealthStatus {
    *health_cell().read()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_status_transitions_are_observed() {
        // Reset to known state at start (ensures isolation from other tests)
        set_health_status(HealthStatus::Serving);
        assert_eq!(current_health_status(), HealthStatus::Serving);
        assert_eq!(HealthStatus::Serving.as_gauge_value(), 1.0);

        // Test Degraded transition
        set_health_status(HealthStatus::Degraded);
        assert_eq!(current_health_status(), HealthStatus::Degraded);
        assert_eq!(HealthStatus::Degraded.as_gauge_value(), 0.0);

        // Test NotServing transition
        set_health_status(HealthStatus::NotServing);
        assert_eq!(current_health_status(), HealthStatus::NotServing);
        assert_eq!(HealthStatus::NotServing.as_label(), "not_serving");

        // Reset to Serving at test end for subsequent tests
        set_health_status(HealthStatus::Serving);
        assert_eq!(current_health_status(), HealthStatus::Serving);
    }
}
