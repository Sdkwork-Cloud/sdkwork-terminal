//! Minimal Prometheus-compatible metrics registry.
//!
//! Implements Counter, Gauge, and Histogram primitives backed by atomics and
//! `parking_lot::Mutex`. The registry renders Prometheus text exposition
//! format (version 0.0.4) for the `/metrics` HTTP endpoint required by
//! `HEALTH_CHECK_SPEC.md` §1.
//!
//! Naming follows `OBSERVABILITY_SPEC.md` §3:
//! - Counters end in `_total`.
//! - Duration metrics express the unit in the name (e.g. `_seconds`).
//! - Size metrics express the unit in the name (e.g. `_bytes`).
//! - All metric names use lowercase snake case.

use std::{
    collections::BTreeMap,
    sync::{Arc, OnceLock},
};

use parking_lot::RwLock;

use crate::labels::CommonLabels;

/// Recommended histogram bucket boundaries (in seconds) for HTTP/RPC request
/// latency per `OBSERVABILITY_SPEC.md` §3 (Histogram guidance).
pub const DEFAULT_HTTP_LATENCY_BUCKETS: &[f64] = &[
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
];

/// Monotonically increasing counter. Counters MUST end in `_total` when
/// exported to Prometheus-compatible systems.
#[derive(Debug, Clone)]
pub struct Counter {
    inner: Arc<CounterInner>,
}

#[derive(Debug)]
struct CounterInner {
    name: String,
    help: String,
    value: std::sync::atomic::AtomicU64,
}

impl Counter {
    pub fn new(name: impl Into<String>, help: impl Into<String>) -> Self {
        Self {
            inner: Arc::new(CounterInner {
                name: name.into(),
                help: help.into(),
                value: std::sync::atomic::AtomicU64::new(0),
            }),
        }
    }

    pub fn inc(&self, by: u64) {
        self.inner
            .value
            .fetch_add(by, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn inc_by(&self, by: u64) {
        self.inc(by);
    }

    pub fn value(&self) -> u64 {
        self.inner.value.load(std::sync::atomic::Ordering::Relaxed)
    }

    pub fn name(&self) -> &str {
        &self.inner.name
    }

    pub fn help(&self) -> &str {
        &self.inner.help
    }
}

/// Gauge that can go up or down. Used for in-flight requests, queue depth,
/// pool usage, active sessions, health status, etc.
#[derive(Debug, Clone)]
pub struct Gauge {
    inner: Arc<GaugeInner>,
}

#[derive(Debug)]
struct GaugeInner {
    name: String,
    help: String,
    value: std::sync::atomic::AtomicI64,
}

impl Gauge {
    pub fn new(name: impl Into<String>, help: impl Into<String>) -> Self {
        Self {
            inner: Arc::new(GaugeInner {
                name: name.into(),
                help: help.into(),
                value: std::sync::atomic::AtomicI64::new(0),
            }),
        }
    }

    pub fn set(&self, value: i64) {
        self.inner
            .value
            .store(value, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn add(&self, delta: i64) {
        self.inner
            .value
            .fetch_add(delta, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn inc(&self) {
        self.add(1);
    }

    pub fn dec(&self) {
        self.add(-1);
    }

    pub fn value(&self) -> i64 {
        self.inner.value.load(std::sync::atomic::Ordering::Relaxed)
    }

    pub fn name(&self) -> &str {
        &self.inner.name
    }

    pub fn help(&self) -> &str {
        &self.inner.help
    }
}

/// Histogram for latency/duration measurements. Stores count, sum, and
/// per-bucket counts. Does NOT store raw samples (bounded memory).
#[derive(Debug, Clone)]
pub struct Histogram {
    inner: Arc<HistogramInner>,
}

#[derive(Debug)]
struct HistogramInner {
    name: String,
    help: String,
    buckets: Vec<f64>,
    state: RwLock<HistogramState>,
}

#[derive(Debug, Default)]
struct HistogramState {
    count: u64,
    sum: f64,
    bucket_counts: Vec<u64>,
}

impl Histogram {
    pub fn new(name: impl Into<String>, help: impl Into<String>, buckets: &[f64]) -> Self {
        let mut sorted = buckets.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let bucket_count = sorted.len();
        Self {
            inner: Arc::new(HistogramInner {
                name: name.into(),
                help: help.into(),
                buckets: sorted,
                state: RwLock::new(HistogramState {
                    count: 0,
                    sum: 0.0,
                    bucket_counts: vec![0; bucket_count],
                }),
            }),
        }
    }

    pub fn observe(&self, value: f64) {
        let mut state = self.inner.state.write();
        state.count += 1;
        state.sum += value;
        for (idx, boundary) in self.inner.buckets.iter().enumerate() {
            if value <= *boundary {
                state.bucket_counts[idx] += 1;
            }
        }
    }

    pub fn count(&self) -> u64 {
        self.inner.state.read().count
    }

    pub fn sum(&self) -> f64 {
        self.inner.state.read().sum
    }

    pub fn name(&self) -> &str {
        &self.inner.name
    }

    pub fn help(&self) -> &str {
        &self.inner.help
    }

    pub fn buckets(&self) -> &[f64] {
        &self.inner.buckets
    }

    pub fn bucket_counts(&self) -> Vec<u64> {
        self.inner.state.read().bucket_counts.clone()
    }
}

/// Registry of named metrics. A single global instance is exposed via
/// `with_registry()`; tests can construct their own via `MetricsRegistry::new()`.
#[derive(Debug, Default)]
pub struct MetricsRegistry {
    counters: RwLock<BTreeMap<String, Counter>>,
    gauges: RwLock<BTreeMap<String, Gauge>>,
    histograms: RwLock<BTreeMap<String, Histogram>>,
}

impl MetricsRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Get or insert a counter by name. Help text is set on first insertion
    /// and ignored on subsequent calls (callers should pass the same help).
    pub fn counter(&self, name: &str, help: &str) -> Counter {
        let read = self.counters.read();
        if let Some(existing) = read.get(name) {
            return existing.clone();
        }
        drop(read);
        let mut write = self.counters.write();
        write
            .entry(name.to_string())
            .or_insert_with(|| Counter::new(name, help))
            .clone()
    }

    /// Get or insert a gauge by name.
    pub fn gauge(&self, name: &str, help: &str) -> Gauge {
        let read = self.gauges.read();
        if let Some(existing) = read.get(name) {
            return existing.clone();
        }
        drop(read);
        let mut write = self.gauges.write();
        write
            .entry(name.to_string())
            .or_insert_with(|| Gauge::new(name, help))
            .clone()
    }

    /// Get or insert a histogram by name.
    pub fn histogram(&self, name: &str, help: &str, buckets: &[f64]) -> Histogram {
        let read = self.histograms.read();
        if let Some(existing) = read.get(name) {
            return existing.clone();
        }
        drop(read);
        let mut write = self.histograms.write();
        write
            .entry(name.to_string())
            .or_insert_with(|| Histogram::new(name, help, buckets))
            .clone()
    }

    /// Render the entire registry as Prometheus text exposition format,
    /// applying `common_labels` to every metric series.
    pub fn render(&self, common_labels: &CommonLabels) -> String {
        let mut output = String::new();
        let label_prefix = common_labels.render();

        for counter in self.counters.read().values() {
            output.push_str(&format!("# HELP {} {}\n", counter.name(), counter.help()));
            output.push_str(&format!("# TYPE {} counter\n", counter.name()));
            output.push_str(&format!(
                "{}{{{label_prefix}}} {value}\n",
                counter.name(),
                value = counter.value(),
            ));
        }

        for gauge in self.gauges.read().values() {
            output.push_str(&format!("# HELP {} {}\n", gauge.name(), gauge.help()));
            output.push_str(&format!("# TYPE {} gauge\n", gauge.name()));
            output.push_str(&format!(
                "{}{{{label_prefix}}} {value}\n",
                gauge.name(),
                value = gauge.value(),
            ));
        }

        for histogram in self.histograms.read().values() {
            output.push_str(&format!(
                "# HELP {} {}\n",
                histogram.name(),
                histogram.help()
            ));
            output.push_str(&format!("# TYPE {} histogram\n", histogram.name()));
            let state = histogram.inner.state.read();
            let mut cumulative: u64 = 0;
            for (idx, boundary) in histogram.buckets().iter().enumerate() {
                // Prometheus cumulative bucket semantics: each bucket is the
                // sum of all samples up to that boundary. Per OBSERVABILITY_SPEC.md §3.
                cumulative += state.bucket_counts[idx];
                output.push_str(&format!(
                    "{}_bucket{{le=\"{boundary}\",{label_prefix}}} {cumulative}\n",
                    histogram.name(),
                ));
            }
            output.push_str(&format!(
                "{}_bucket{{le=\"+Inf\",{label_prefix}}} {count}\n",
                histogram.name(),
                count = state.count,
            ));
            output.push_str(&format!(
                "{}_sum{{{label_prefix}}} {sum}\n",
                histogram.name(),
                sum = state.sum,
            ));
            output.push_str(&format!(
                "{}_count{{{label_prefix}}} {count}\n",
                histogram.name(),
                count = state.count,
            ));
        }

        output
    }
}

static GLOBAL_REGISTRY: OnceLock<MetricsRegistry> = OnceLock::new();

/// Access the singleton `MetricsRegistry`. First call initializes it; all
/// subsequent calls return the same instance.
pub fn with_registry<F, R>(f: F) -> R
where
    F: FnOnce(&MetricsRegistry) -> R,
{
    let registry = GLOBAL_REGISTRY.get_or_init(MetricsRegistry::new);
    f(registry)
}

/// Convenience: render the global registry with `common_labels_from_env()`.
pub fn render_prometheus_text() -> String {
    let labels = crate::labels::common_labels_from_env();
    with_registry(|registry| registry.render(&labels))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counter_increments_monotonically() {
        let counter = Counter::new("test_counter_total", "test counter");
        counter.inc(1);
        counter.inc(2);
        assert_eq!(counter.value(), 3);
        assert_eq!(counter.name(), "test_counter_total");
    }

    #[test]
    fn gauge_supports_up_and_down() {
        let gauge = Gauge::new("test_gauge", "test gauge");
        gauge.set(10);
        assert_eq!(gauge.value(), 10);
        gauge.inc();
        gauge.inc();
        assert_eq!(gauge.value(), 12);
        gauge.dec();
        assert_eq!(gauge.value(), 11);
        gauge.add(-5);
        assert_eq!(gauge.value(), 6);
    }

    #[test]
    fn histogram_records_samples_in_buckets() {
        let histogram = Histogram::new(
            "test_duration_seconds",
            "test duration",
            &[0.1, 0.5, 1.0, 5.0],
        );
        histogram.observe(0.05);
        histogram.observe(0.3);
        histogram.observe(0.8);
        histogram.observe(2.0);
        histogram.observe(10.0);

        assert_eq!(histogram.count(), 5);
        assert!((histogram.sum() - 13.15).abs() < 1e-9);

        let counts = histogram.bucket_counts();
        // Cumulative Prometheus semantics:
        // bucket 0.1: 1 sample (0.05)
        assert_eq!(counts[0], 1);
        // bucket 0.5: 2 samples total (0.05, 0.3)
        assert_eq!(counts[1], 2);
        // bucket 1.0: 3 samples total (0.05, 0.3, 0.8)
        assert_eq!(counts[2], 3);
        // bucket 5.0: 4 samples total (0.05, 0.3, 0.8, 2.0)
        assert_eq!(counts[3], 4);
    }

    #[test]
    fn registry_returns_same_counter_for_same_name() {
        let registry = MetricsRegistry::new();
        let c1 = registry.counter("requests_total", "total requests");
        let c2 = registry.counter("requests_total", "total requests");
        c1.inc(5);
        assert_eq!(c2.value(), 5);
    }

    #[test]
    fn registry_render_emits_prometheus_text_format() {
        let registry = MetricsRegistry::new();
        let counter = registry.counter("http_requests_total", "HTTP requests");
        counter.inc(42);
        let gauge = registry.gauge("active_sessions", "active sessions");
        gauge.set(7);
        let histogram = registry.histogram(
            "http_request_duration_seconds",
            "HTTP request duration",
            &[0.1, 1.0],
        );
        histogram.observe(0.05);
        histogram.observe(0.5);

        let labels = CommonLabels::for_runtime_node();
        let text = registry.render(&labels);

        assert!(text.contains("# HELP http_requests_total HTTP requests"));
        assert!(text.contains("# TYPE http_requests_total counter"));
        assert!(text.contains("http_requests_total{service=\"sdkwork-terminal-runtime-node\""));
        assert!(text.contains("} 42"));

        assert!(text.contains("# TYPE active_sessions gauge"));
        assert!(text.contains("active_sessions{service=\"sdkwork-terminal-runtime-node\""));
        assert!(text.contains("} 7"));

        assert!(text.contains("# TYPE http_request_duration_seconds histogram"));
        assert!(text.contains("http_request_duration_seconds_bucket{le=\"0.1\""));
        assert!(text.contains("http_request_duration_seconds_bucket{le=\"1\""));
        assert!(text.contains("http_request_duration_seconds_bucket{le=\"+Inf\""));
        assert!(text.contains("http_request_duration_seconds_sum"));
        assert!(text.contains("http_request_duration_seconds_count"));

        // Verify cumulative bucket semantics:
        // observe(0.05) → bucket_counts[0] += 1, bucket_counts[1] += 1
        // observe(0.5)  → bucket_counts[1] += 1
        // cumulative: bucket0 = 1, bucket1 = 1+2 = 3
        let bucket_01 = text.lines().find(|l| l.contains("le=\"0.1\"")).unwrap();
        assert!(
            bucket_01.ends_with(" 1"),
            "expected cumulative 1 for le=0.1, got: {bucket_01}"
        );
        let bucket_1 = text
            .lines()
            .find(|l| l.contains("le=\"1\"") && l.contains("_bucket"))
            .unwrap();
        assert!(
            bucket_1.ends_with(" 3"),
            "expected cumulative 3 for le=1.0, got: {bucket_1}"
        );
    }

    #[test]
    fn global_registry_is_singleton() {
        with_registry(|r1| {
            let c1 = r1.counter("global_test_total", "global test");
            c1.inc(1);
            with_registry(|r2| {
                let c2 = r2.counter("global_test_total", "global test");
                assert_eq!(c2.value(), 1);
                c2.inc(1);
            });
            assert_eq!(c1.value(), 2);
        });
    }
}
