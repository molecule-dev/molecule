---
'@molecule/api-emails-ses': patch
---

Route SES calls through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every send failed with a bare connection error; the client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against `AWS_SES_ENDPOINT` when set and the regional endpoint otherwise so `NO_PROXY` is honoured. Nothing is passed when no proxy is configured.
