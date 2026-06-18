# SDKWork Terminal Topology Profiles

Authoritative machine contract: `specs/topology.spec.json`.

| Profile id | Hosting | Service layout | Environment |
| --- | --- | --- | --- |
| `self-hosted.split-services.development` | self-hosted | split-services | development |
| `self-hosted.split-services.production` | self-hosted | split-services | production |
| `cloud-hosted.split-services.development` | cloud-hosted | split-services | development |
| `cloud-hosted.split-services.production` | cloud-hosted | split-services | production |

Default dev profile: **self-hosted.split-services.development**

Self-hosted development autostarts the platform API gateway (`SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_AUTOSTART=true`) from sibling `../sdkwork-api-gateway` when the bind is not already healthy.

Validate:

```bash
node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json
```
