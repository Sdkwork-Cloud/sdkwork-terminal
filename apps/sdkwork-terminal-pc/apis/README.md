# APIs

Local runtime API contract inputs for the PC application surface. This is **not** a platform `open-api` / `app-api` / `backend-api` authority.

## Layout

| Path | Purpose |
| --- | --- |
| [`local-runtime/openapi.yaml`](./local-runtime/openapi.yaml) | OpenAPI 3.1 contract for `/terminal/api/v1` and `/terminal/stream/v1` |
| [`local-runtime/changelogs/`](./local-runtime/changelogs/) | Contract changelog records |

Platform IAM and business APIs are consumed through generated SDKs from sibling repositories (`sdkwork-appbase`, `sdkwork-api-cloud-gateway`). Do not add raw HTTP wrappers here for platform surfaces.

## Framework posture

`runtime-node` implements the local runtime HTTP surface with Axum. `sdkwork-web-framework` integration is deferred per repository exception **EX-2026-REPO-002** until this API is promoted for external SDKWork consumers.
