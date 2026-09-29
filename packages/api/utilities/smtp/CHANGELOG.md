# @molecule/api-smtp

## 1.0.4

### Patch Changes

- Security dependency bumps for the audit gate: e2b 2.38.3 → 2.51.0, nodemailer 9.1.1 → 10.0.12 (a process-global DNS cache could reuse a TLS `servername` across transports), undici 7.29.0 → 7.30.0 (DoS via an unhandled WebSocket-permessage error). No API changes — the same `createTransport`/`sendMail` calls, the same webhook delivery and preview-fetch code, the same E2B `Sandbox` methods.

## 1.0.2

### Patch Changes

- e96fd5c: Pins nodemailer 9.1.1, fixing the four advisories against ≤9.1.0 (resolveContent bypass, IDN allow-list bypass, addressparser O(n²), RFC 5322 comment mis-parse).

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
