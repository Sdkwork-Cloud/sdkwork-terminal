use sdkwork_terminal_runtime_node::{
    create_runtime_node_router, RuntimeNodeBootstrapConfig, RuntimeNodeHost,
};
use std::{env, path::PathBuf, sync::Arc};

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
    eprintln!("  host_mode: {}", diagnostics.host_mode);
    eprintln!("  platform_family: {}", diagnostics.platform_family);
    eprintln!("  cpu_arch: {}", diagnostics.cpu_arch);
    eprintln!("  runtime_location: {}", diagnostics.runtime_location);
    eprintln!("  storage_surface: {}", diagnostics.storage_surface);

    let router = create_runtime_node_router(host);
    let bind_addr =
        env::var("SDKWORK_RUNTIME_NODE_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:9620".into());

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .unwrap_or_else(|error| panic!("failed to bind {bind_addr}: {error}"));

    eprintln!("  listening on: {bind_addr}");

    axum::serve(listener, router)
        .await
        .expect("runtime node server failed");
}
