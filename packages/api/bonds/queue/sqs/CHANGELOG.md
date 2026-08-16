# @molecule/api-queue-sqs

## 1.0.2

### Patch Changes

- 8a62afc: Route SQS calls through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every queue operation failed with a bare connection error; the client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against `SQS_ENDPOINT` when set and the regional endpoint otherwise, so a LocalStack endpoint listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
- Updated dependencies [8b35739]
  - @molecule/api-proxy-agent@1.1.0

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-queue@1.0.1
  - @molecule/api-secrets@1.0.1
