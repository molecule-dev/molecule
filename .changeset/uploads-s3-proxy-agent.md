---
'@molecule/api-uploads-s3': patch
---

Route S3 calls through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every upload failed with a bare connection error; the client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against `AWS_S3_ENDPOINT` / `AWS_ENDPOINT_URL_S3` when set and the regional endpoint otherwise, so an internal S3-compatible endpoint listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
