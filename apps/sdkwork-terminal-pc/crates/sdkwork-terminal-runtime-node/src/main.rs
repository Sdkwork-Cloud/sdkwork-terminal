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

#[tokio::main]
async fn main() {
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
        RuntimeNodeHost::new(config, sqlite_path.as_deref())
            .expect("failed to initialize runtime node host"),
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

    let auth_token = env::var("SDKWORK_RUNTIME_NODE_AUTH_TOKEN")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let bind_addr = resolve_bind_addr();

    if bind_requires_auth_token(&bind_addr) {
        eprintln!("  wildcard bind requires authenticated access");
    }

    if auth_token.is_none() {
        eprintln!(
            "sdkwork-terminal-runtime-node refuses to start without SDKWORK_RUNTIME_NODE_AUTH_TOKEN"
        );
        std::process::exit(1);
    }

    let router = create_runtime_node_router_with_auth(host, auth_token);

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .unwrap_or_else(|error| panic!("failed to bind {bind_addr}: {error}"));

    eprintln!("  listening on: {bind_addr}");

    axum::serve(listener, router)
        .await
        .expect("runtime node server failed");
}

#[cfg(test)]
mod tests {
    use super::bind_requires_auth_token;

    #[test]
    fn bind_requires_auth_token_for_wildcard_addresses() {
        assert!(bind_requires_auth_token("0.0.0.0:9620"));
        assert!(bind_requires_auth_token("[::]:9620"));
        assert!(!bind_requires_auth_token("127.0.0.1:9620"));
    }
}
