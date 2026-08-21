# SDKWork Terminal Topology Profiles

Authoritative machine contract: `specs/topology.spec.json` (`schemaVersion: 5`).

| Profile id | Deployment profile | Environment |
| --- | --- | --- |
| `standalone.development` | standalone | development |
| `standalone.test` | standalone | test |
| `standalone.staging` | standalone | staging |
| `standalone.production` | standalone | production |
| `cloud.development` | cloud | development |
| `cloud.test` | cloud | test |
| `cloud.staging` | cloud | staging |
| `cloud.production` | cloud | production |

Default dev profile: **standalone.development**

Default local development may set `SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_AUTOSTART=true` and `SDKWORK_API_CLOUD_GATEWAY_CONFIG` for operator tooling against sibling `../sdkwork-api-cloud-gateway`. Framework `shouldAutostartGateway()` remains false for standalone deployment profiles. The optional runtime-node process listens on `http://127.0.0.1:9620` for private-worker verification; it is not a Browser terminal ingress.

When `terminal-dev.mjs --target web` starts a local web renderer, it injects the renderer's same-origin URL into `VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL` as reserved application-ingress configuration. Vite does not proxy `/terminal/*`, Browser composition does not construct a legacy runtime target, and the terminal renders its fail-closed unavailable state until the approved device Internal API control plane exists. Remote runtime workspace and authority values are intentionally absent from these shared profiles.

`--service-layout` is retired; profile ids are `<deploymentProfile>.<environment>` only.

Validate:

```bash
node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json
```
