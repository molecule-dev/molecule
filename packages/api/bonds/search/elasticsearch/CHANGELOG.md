# @molecule/api-search-elasticsearch

## 1.0.2

### Patch Changes

- 8a62afc: Route Elasticsearch requests through the outbound proxy when one is configured. `@elastic/transport` builds its own `undici` pool bound to the node origin, which bypasses the environment-driven global dispatcher, so on a host whose only egress path is a proxy every request failed with a bare connection error; the client now receives the proxy URL via its own `proxy` option, resolved against `ELASTICSEARCH_URL` so a self-hosted cluster listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
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
  - @molecule/api-search@1.0.1
