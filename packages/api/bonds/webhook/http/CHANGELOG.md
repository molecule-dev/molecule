# @molecule/api-webhook-http

## 1.0.3

### Patch Changes

- Security dependency bumps for the audit gate: e2b 2.38.3 → 2.51.0, nodemailer 9.1.1 → 10.0.12 (a process-global DNS cache could reuse a TLS `servername` across transports), undici 7.29.0 → 7.30.0 (DoS via an unhandled WebSocket-permessage error). No API changes — the same `createTransport`/`sendMail` calls, the same webhook delivery and preview-fetch code, the same E2B `Sandbox` methods.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-logger@1.0.1
  - @molecule/api-webhook@1.0.1
