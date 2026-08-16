---
'@molecule/api-queue-sqs': patch
---

Route SQS calls through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every queue operation failed with a bare connection error; the client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against `SQS_ENDPOINT` when set and the regional endpoint otherwise, so a LocalStack endpoint listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
