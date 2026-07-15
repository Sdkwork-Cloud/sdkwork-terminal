# SDKWork Terminal Topology Profiles

Authoritative machine contract: `specs/topology.spec.json`.

| Profile id | Deployment profile | Environment |
| --- | --- | --- |
| `standalone.development` | standalone | development |
| `standalone.production` | standalone | production |
| `cloud.development` | cloud | development |
| `cloud.production` | cloud | production |

Default dev profile: **standalone.development**

Self-hosted development autostarts the platform API gateway (`SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_AUTOSTART=true`) from sibling `../sdkwork-api-cloud-gateway` when the bind is not already healthy. The optional runtime-node process listens on `http://127.0.0.1:9620` for private-worker verification; it is not a Browser terminal ingress.

When `terminal-dev.mjs --target web` starts a local web renderer, it injects the renderer's same-origin URL into `VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL` as reserved application-ingress configuration. Vite does not proxy `/terminal/*`, Browser composition does not construct a legacy runtime target, and the terminal renders its fail-closed unavailable state until the approved device Internal API control plane exists. Remote runtime workspace and authority values are intentionally absent from these shared profiles.

Validate:

```bash
node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json
```
