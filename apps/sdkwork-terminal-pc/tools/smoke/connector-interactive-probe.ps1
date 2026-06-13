$ErrorActionPreference = "Stop"

$nodeArgs = @("tools/smoke/connector-interactive-probe.mjs")
$nodeArgs += $args

node @nodeArgs
exit $LASTEXITCODE
