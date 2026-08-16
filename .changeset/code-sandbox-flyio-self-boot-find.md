---
'@molecule/api-code-sandbox-flyio': minor
---

Map `SandboxConfig.command` onto the Machine's `init.exec` and `restartPolicy` onto its restart policy, so a Machine Fly restarts comes back running the caller's own process. Adds `find()`, which enumerates managed Machines app-by-app and throws rather than returning a partial result. `selfDeliveredEnv` is validated for private routes and never written into the Machine config.
