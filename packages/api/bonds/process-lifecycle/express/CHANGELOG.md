# @molecule/api-process-lifecycle-express

## 1.3.2

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.3.0

### Minor Changes

- Support deployment handoff headers on refused draining-readiness responses.

## 1.2.0

### Minor Changes

- 61092fb: Hold readiness closed until the boot warm-up settles and two consecutive probes pass, derive the shutdown flip window from `LB_HEALTHCHECK_INTERVAL_MS`/`LB_HEALTHCHECK_TIMEOUT_MS` (warning once when it is too short), and reap idle keep-alive sockets after a window that runs even when a drain hook fails.

## 1.1.0

### Minor Changes

- 74a0394: First release of the Express/Node process-lifecycle provider: `GET /health/live` and `GET /health/ready`, `Connection: close` on responses while draining, and SIGTERM/SIGINT graceful shutdown that drains in-flight requests and exits 0.

## 1.0.0

### Minor Changes

- First release of the Express/Node process-lifecycle provider: `GET /health/live` and `GET /health/ready`, `Connection: close` on responses while draining, and SIGTERM/SIGINT graceful shutdown that drains in-flight requests and exits 0.
