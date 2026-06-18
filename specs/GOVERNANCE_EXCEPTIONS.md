# SDKWork Terminal — Repository Governance Exceptions

Architecture exceptions for the `sdkwork-terminal` git repository root per [`GOVERNANCE_SPEC.md`](../../sdkwork-specs/GOVERNANCE_SPEC.md) §3.

PC application surface exceptions are recorded separately in [`apps/sdkwork-terminal-pc/specs/GOVERNANCE_EXCEPTIONS.md`](../apps/sdkwork-terminal-pc/specs/GOVERNANCE_EXCEPTIONS.md).

## Exception Record: Narrow Multi-App Root Layout

```yaml
id: EX-2026-REPO-001
spec: SDKWORK_WORKSPACE_SPEC.md
rule: Standard project-root directory dictionary (apis/, crates/, sdks/, deployments/, tools/ at git root)
owner: sdkwork-terminal-team
reason: >
  sdkwork-terminal is a multi-surface client monorepo. Rust crates, SDK consumer
  documentation, deployment descriptors, and reusable tools are owned by the PC
  application surface at apps/sdkwork-terminal-pc/ rather than duplicated at the
  git repository root. The repository does not own platform HTTP or RPC API
  contracts, so root apis/ and sdks/ generation workspaces are intentionally absent.
risk: >
  Developers expecting all standard directories at git root may need to follow
  root README.md and specs/architecture-alignment.md for capability placement.
expires_at: 2027-06-30
removal_plan: >
  Re-evaluate when the repository promotes to a full platform backend root or
  splits PC/H5/Flutter into independent git repositories. Until then, document
  active layout in root README.md.
```

## Exception Record: Local Runtime Without sdkwork-web-framework

```yaml
id: EX-2026-REPO-002
spec: WEB_FRAMEWORK_SPEC.md
rule: Rust HTTP surfaces MUST integrate sdkwork-web-framework
owner: sdkwork-terminal-team
reason: >
  sdkwork-terminal-runtime-node serves a product-local HTTP API at /terminal/api/v1
  for session, PTY, and replay orchestration. It is not a platform open-api,
  app-api, or backend-api surface. Axum with sdkwork-terminal-protocol contracts
  keeps the local runtime lightweight and co-located with the desktop client.
risk: >
  If /terminal/api/v1 is promoted to a governed platform HTTP surface consumed
  by other SDKWork applications, the current Axum-direct implementation would
  need migration to sdkwork-web-framework and OpenAPI/SDK generation.
expires_at: 2027-06-30
removal_plan: >
  When terminal runtime API stabilizes for external consumers:
  1. Add apis/ contract and sdkgen workspace (done)
  2. Migrate runtime-node to sdkwork-web-framework (if promoted to platform surface)
  3. Replace infrastructure fetch calls with generated terminal-app-sdk (done for JSON API)
```

## Exception Record: Local Runtime OpenAPI Without Generated SDK

```yaml
id: EX-2026-REPO-003
spec: SDK_WORKSPACE_GENERATION_SPEC.md
rule: HTTP API contracts SHOULD generate application-root SDK families for consumers
owner: sdkwork-terminal-team
status: resolved
resolved_at: 2026-06-18
reason: >
  Resolved in alignment pass 5. Local runtime OpenAPI authority lives at
  apps/sdkwork-terminal-pc/apis/local-runtime/openapi.yaml. Generated SDK family
  sdkwork-terminal-local-runtime-app-sdk is materialized under apps/sdkwork-terminal-pc/sdks/.
  sdkwork-terminal-pc-infrastructure consumes @sdkwork/terminal-local-runtime-app-sdk
  instead of raw fetch for JSON runtime API calls.
```

## Exception Status

| Exception | Status | Review Date |
| --- | --- | --- |
| EX-2026-REPO-001 | Active | 2026-12-31 |
| EX-2026-REPO-002 | Active | 2026-12-31 |
| EX-2026-REPO-003 | Resolved | 2026-06-18 |

## Compliance Checklist

- [x] Exception records created per GOVERNANCE_SPEC.md §3
- [x] Owner identified for each exception
- [x] Risk assessment documented
- [x] Expiry date set
- [x] Removal plan documented
- [x] Alignment matrix published in specs/architecture-alignment.md
- [x] Local runtime OpenAPI authority published under apis/local-runtime/
