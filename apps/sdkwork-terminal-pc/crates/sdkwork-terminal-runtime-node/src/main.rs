use sdkwork_terminal_observability::{
    set_health_status, with_registry, HealthStatus, DEFAULT_HTTP_LATENCY_BUCKETS,
};
use sdkwork_terminal_runtime_node::{
    create_runtime_node_router_with_auth, RuntimeNodeBootstrapConfig, RuntimeNodeHost,
};
use std::{env, path::PathBuf, sync::Arc};

fn resolve_bind_addr() -> String {
    if let Ok(value) = env::var("SDKWORK_RUNTIME_NODE_BIND_ADDR") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    if let Ok(value) = env::var("SDKWORK_TERMINAL_APPLICATION_PUBLIC_INGRESS_BIND") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    "127.0.0.1:9620".into()
}

fn bind_requires_auth_token(bind_addr: &str) -> bool {
    let normalized = bind_addr.trim().to_ascii_lowercase();
    normalized.starts_with("0.0.0.0")
        || normalized.starts_with("[::]")
        || normalized == "::"
        || normalized.starts_with(":::")
}

fn runtime_node_auth_required(bind_addr: &str) -> bool {
    if bind_requires_auth_token(bind_addr) {
        return true;
    }

    std::env::var("SDKWORK_RUNTIME_NODE_REQUIRE_AUTH")
        .ok()
        .map(|value| {
            let normalized = value.trim().to_ascii_lowercase();
            normalized == "true" || normalized == "1"
        })
        .unwrap_or(false)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let sqlite_path = env::var("SDKWORK_RUNTIME_NODE_SQLITE_PATH")
        .ok()
        .map(PathBuf::from);

    let config = RuntimeNodeBootstrapConfig {
        platform_family: env::var("SDKWORK_RUNTIME_NODE_PLATFORM_FAMILY")
            .unwrap_or_else(|_| "ubuntu-server".into()),
        cpu_arch: env::var("SDKWORK_RUNTIME_NODE_CPU_ARCH")
            .unwrap_or_else(|_| std::env::consts::ARCH.into()),
        runtime_location: env::var("SDKWORK_RUNTIME_NODE_LOCATION")
            .unwrap_or_else(|_| "runtime-node".into()),
    };

    let host = Arc::new(
        RuntimeNodeHost::new(config, sqlite_path.as_deref()).map_err(|error| {
            eprintln!("sdkwork-terminal-runtime-node failed to initialize host: {error}");
            error
        })?,
    );

    let diagnostics = host.diagnostics();
    eprintln!("sdkwork-terminal-runtime-node starting");
    sdkwork_terminal_observability::emit_component_log(
        "info",
        "runtime node process bootstrapping",
    );
    eprintln!("  host_mode: {}", diagnostics.host_mode);
    eprintln!("  platform_family: {}", diagnostics.platform_family);
    eprintln!("  cpu_arch: {}", diagnostics.cpu_arch);
    eprintln!("  runtime_location: {}", diagnostics.runtime_location);
    eprintln!("  storage_surface: {}", diagnostics.storage_surface);

    // Initialize health status and pre-register metrics so the `/metrics`
    // endpoint serves canonical series before the first request arrives.
    set_health_status(HealthStatus::Serving);
    with_registry(|registry| {
        registry.gauge(
            "runtime_node_health_status",
            "Runtime node health status (1=serving, 0=not serving)",
        );
        registry.counter(
            "runtime_node_http_requests_total",
            "Total HTTP requests handled by the runtime node protected router",
        );
        registry.histogram(
            "runtime_node_http_request_duration_seconds",
            "HTTP request duration in seconds",
            DEFAULT_HTTP_LATENCY_BUCKETS,
        );
    });

    let auth_token = env::var("SDKWORK_ACCESS_TOKEN")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let bind_addr = resolve_bind_addr();

    if runtime_node_auth_required(&bind_addr) {
        eprintln!("  runtime node requires authenticated access");
    }

    if runtime_node_auth_required(&bind_addr) && auth_token.is_none() {
        eprintln!(
            "sdkwork-terminal-runtime-node refuses to start without SDKWORK_ACCESS_TOKEN when authentication is required"
        );
        std::process::exit(1);
    }

    let router = create_runtime_node_router_with_auth(host, auth_token);

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .map_err(|error| {
            eprintln!("sdkwork-terminal-runtime-node failed to bind {bind_addr}: {error}");
            error
        })?;

    eprintln!("  listening on: {bind_addr}");

    let shutdown = async move {
        let ctrl_c = async {
            tokio::signal::ctrl_c()
                .await
                .expect("failed to install ctrl-c handler");
        };

        #[cfg(unix)]
        let terminate = async {
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("failed to install SIGTERM handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {},
            _ = terminate => {},
        }

        eprintln!("sdkwork-terminal-runtime-node received shutdown signal, draining connections");
        sdkwork_terminal_observability::emit_component_log(
            "info",
            "runtime node process received shutdown signal",
        );
        // Mark the process as not serving so /readyz returns 503 during
        // connection drain and /metrics reflects the transition.
        set_health_status(HealthStatus::NotServing);
        with_registry(|registry| {
            registry
                .gauge(
                    "runtime_node_health_status",
                    "Runtime node health status (1=serving, 0=not serving)",
                )
                .set(0);
        });
    };

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown)
        .await
        .map_err(|error| {
            eprintln!("sdkwork-terminal-runtime-node server error: {error}");
            error
        })?;

    eprintln!("sdkwork-terminal-runtime-node stopped gracefully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{bind_requires_auth_token, runtime_node_auth_required};

    #[test]
    fn bind_requires_auth_token_for_wildcard_addresses() {
        assert!(bind_requires_auth_token("0.0.0.0:9620"));
        assert!(bind_requires_auth_token("[::]:9620"));
        assert!(!bind_requires_auth_token("127.0.0.1:9620"));
    }

    #[test]
    fn runtime_node_auth_required_honors_explicit_loopback_flag() {
        std::env::set_var("SDKWORK_RUNTIME_NODE_REQUIRE_AUTH", "true");
        assert!(runtime_node_auth_required("127.0.0.1:9620"));
        std::env::remove_var("SDKWORK_RUNTIME_NODE_REQUIRE_AUTH");
        assert!(!runtime_node_auth_required("127.0.0.1:9620"));
    }
}
