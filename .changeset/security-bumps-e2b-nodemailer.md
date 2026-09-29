---
'@molecule/api-code-sandbox-e2b': patch
'@molecule/api-emails-ses': patch
'@molecule/api-emails-mailgun': patch
'@molecule/api-emails-sendmail': patch
'@molecule/api-smtp': patch
'@molecule/api-webhook-http': patch
'@molecule/api-webhook-queue': patch
'@molecule/api-link-preview': patch
'@molecule/api-oembed': patch
---

Security dependency bumps for the audit gate: e2b 2.38.3 → 2.51.0, nodemailer 9.1.1 → 10.0.12 (a process-global DNS cache could reuse a TLS `servername` across transports), undici 7.29.0 → 7.30.0 (DoS via an unhandled WebSocket-permessage error). No API changes — the same `createTransport`/`sendMail` calls, the same webhook delivery and preview-fetch code, the same E2B `Sandbox` methods.
