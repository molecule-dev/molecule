---
'@molecule/api-code-sandbox-flyio': patch
---

An exec Fly refuses with `412 failed_precondition: machine not running` is retried when Fly's own Machines API reports the Machine `started`, `starting` or `replacing` — the exec endpoint lagging a Machine that is up, which a single repeat clears, instead of a failed operation. A Machine reported `stopped`, `suspended` or `destroyed` still fails at once. `isTransientExecPrecondition` takes the Machine's state as an optional second argument to make that call.
