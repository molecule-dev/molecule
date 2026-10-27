---
'@molecule/api-code-sandbox-docker': minor
---

Add `publishHostIp` / `DOCKER_PUBLISH_HOST_IP` so published ports can bind a routable interface on a remote daemon (wildcard binds require `MOL_DOCKER_ALLOW_PUBLIC_BINDS=1` in production), report a wildcard bind on a remote daemon at the daemon's own host, and declare `hostingCapabilities` for long-lived hosting selection.
