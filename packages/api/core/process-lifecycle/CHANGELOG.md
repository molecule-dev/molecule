# @molecule/api-process-lifecycle

## 1.2.0

### Minor Changes

- 7b65737: Readiness checks, liveness checks and shutdown hooks registered before a provider is bonded are queued and applied when it is, so a bond can register its dependency checks at import time.
- 61092fb: Add a boot warm-up contract (named, time-bounded steps plus consecutive passing probes before readiness answers 200) and drain hooks that run before the load-balancer flip window.

## 1.1.0

### Minor Changes

- 74a0394: First release of the process-lifecycle core: named readiness and liveness checks with per-check timeouts and criticality, a drain state, in-flight request tracking, and ordered shutdown hooks.

## 1.0.0

### Minor Changes

- First release of the process-lifecycle core: named readiness and liveness checks with per-check timeouts and criticality, a drain state, in-flight request tracking, and ordered shutdown hooks.
