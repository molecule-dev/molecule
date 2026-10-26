# @molecule/api-uptime

## 1.1.0

### Minor Changes

- a570535: First release of the uptime core: the `UptimeProvider` interface — `probe({url})` returns an availability verdict (operational/degraded/down) with latency, the final HTTP status, redirect count and the TLS certificate's remaining lifetime — plus the shared spec validation and verdict rules every uptime bond applies, and the public-unicast dial rules an in-process probe verifies before it connects.
