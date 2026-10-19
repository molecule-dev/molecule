---
'@molecule/api-server-default-express': minor
---

The default Express server now wires the process lifecycle automatically: `GET /health/live`, `GET /health/ready`, and SIGTERM/SIGINT graceful shutdown (drain bound `SHUTDOWN_TIMEOUT_MS`, ordered shutdown hooks, exit 0). Pass `lifecycle: { disabled: true }` to opt out.
