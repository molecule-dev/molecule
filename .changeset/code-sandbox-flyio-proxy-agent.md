---
'@molecule/api-code-sandbox-flyio': patch
---

Route the template object store through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so the S3 client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against the configured endpoint so a store listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
