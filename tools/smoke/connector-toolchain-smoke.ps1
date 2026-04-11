$ErrorActionPreference = "Stop"

$targets = @($args)

if ($targets.Length -eq 0) {
    cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke
    exit $LASTEXITCODE
}

cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke -- $targets
exit $LASTEXITCODE
