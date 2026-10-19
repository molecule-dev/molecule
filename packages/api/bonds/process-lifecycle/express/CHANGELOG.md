# @molecule/api-process-lifecycle-express

## 1.1.0

### Minor Changes

- 74a0394: First release of the Express/Node process-lifecycle provider: `GET /health/live` and `GET /health/ready`, `Connection: close` on responses while draining, and SIGTERM/SIGINT graceful shutdown that drains in-flight requests and exits 0.

## 1.0.0

### Minor Changes

- First release of the Express/Node process-lifecycle provider: `GET /health/live` and `GET /health/ready`, `Connection: close` on responses while draining, and SIGTERM/SIGINT graceful shutdown that drains in-flight requests and exits 0.
