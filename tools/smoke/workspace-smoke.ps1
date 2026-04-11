$ErrorActionPreference = "Stop"

pnpm test
cargo test --workspace
cargo check --manifest-path src-tauri/Cargo.toml
