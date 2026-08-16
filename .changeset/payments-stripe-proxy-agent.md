---
'@molecule/api-payments-stripe': patch
---

Route Stripe calls through the outbound proxy when one is configured. The `stripe` SDK builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every call failed with a bare connection error; the client now receives a CONNECT-capable agent via the SDK's `httpAgent` option, resolved against `https://api.stripe.com` so `NO_PROXY` is honoured. Nothing is passed when no proxy is configured.
