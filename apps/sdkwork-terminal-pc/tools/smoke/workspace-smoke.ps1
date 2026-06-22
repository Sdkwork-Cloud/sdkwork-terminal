$ErrorActionPreference = "Stop"

pnpm test
cargo test --workspace
cargo check --manifest-path packages/sdkwork-terminal-pc-desktop/src-tauri/Cargo.toml
