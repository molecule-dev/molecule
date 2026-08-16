---
'@molecule/api-code-sandbox-docker': minor
---

Map `SandboxConfig.command` onto the container's `Cmd` and `restartPolicy` onto its Docker restart policy, so a container the daemon restarts comes back running the caller's own process.
