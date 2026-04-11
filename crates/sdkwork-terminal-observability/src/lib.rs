use serde::Serialize;

pub const CRATE_ID: &str = "sdkwork-terminal-observability";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ObservabilitySummary {
    pub component: &'static str,
    pub healthy: bool,
    pub tracing_sink: &'static str,
    pub metrics_sink: &'static str,
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
    format!("{CRATE_ID} tracing=buffered metrics=in-memory")
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
}
