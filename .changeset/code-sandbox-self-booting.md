---
'@molecule/api-code-sandbox': minor
---

`SandboxConfig` gains `command` (the sandbox's main process, instead of the image's), `restartPolicy`, and `selfDeliveredEnv` (env the caller delivers itself, which a provider validates but must never persist in its own configuration).
