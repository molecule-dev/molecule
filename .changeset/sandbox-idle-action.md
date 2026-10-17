---
'@molecule/api-code-sandbox': minor
'@molecule/api-code-sandbox-flyio': minor
---

A caller can hold a sandbox awake for one provisioning window: `SandboxConfig.idleAction` sets the idle policy for a single sandbox, `Sandbox.setIdleAction` changes it in place, and `SandboxProvider.defaultIdleAction` reports the steady-state policy to restore afterwards.
