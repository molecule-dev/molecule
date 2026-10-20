# @molecule/api-server-default-express

## 1.2.0

### Minor Changes

- 61092fb: Readiness now answers 503 until the boot warm-up settles and two consecutive probes pass, so a rolling deploy does not route to a still-warming instance.

### Patch Changes

- Updated dependencies [7b65737]
- Updated dependencies [61092fb]
- Updated dependencies [61092fb]
  - @molecule/api-process-lifecycle@1.2.0
  - @molecule/api-process-lifecycle-express@1.2.0

## 1.1.0

### Minor Changes

- 74a0394: The default Express server now wires the process lifecycle automatically: `GET /health/live`, `GET /health/ready`, and SIGTERM/SIGINT graceful shutdown (drain bound `SHUTDOWN_TIMEOUT_MS`, ordered shutdown hooks, exit 0). Pass `lifecycle: { disabled: true }` to opt out.

### Patch Changes

- Updated dependencies [74a0394]
- Updated dependencies [74a0394]
  - @molecule/api-process-lifecycle@1.1.0
  - @molecule/api-process-lifecycle-express@1.1.0

## 1.0.4

### Patch Changes

- 99f6f19: The API server now keeps an idle keep-alive connection longer than a proxy's connection pool does, so a request is never reused onto a socket the server is closing.

## 1.0.3

### Patch Changes

- 240411e: HTTPS mode now loads `pem` correctly from this ES module and says how to install it when missing; `pem` is declared as an optional peer dependency.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-error-tracking@1.0.1
  - @molecule/api-logger@1.0.1
  - @molecule/api-middleware-body-parser@1.0.1
  - @molecule/api-middleware-cookie-parser@1.0.1
  - @molecule/api-middleware-cors@1.0.1
  - @molecule/api-secrets@1.0.1
