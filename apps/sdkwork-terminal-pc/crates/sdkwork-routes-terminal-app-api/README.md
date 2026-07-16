# sdkwork-routes-terminal-app-api

Axum route adapter for the authenticated SDKWork Terminal Browser control plane.
It mounts only `/app/v3/api/device/terminal/**`, consumes framework-injected
`WebRequestContext`, and delegates PTY/session behavior to
`sdkwork-terminal-runtime-node`.

The public create operation accepts `projectId`, `runtimeLocationId`, and
terminal launch settings only. A host application injects the project execution
resolver that authorizes the caller and resolves a trusted target-owned root.
The route never accepts, returns, or retains that root in create, replay, or
stream projections.
