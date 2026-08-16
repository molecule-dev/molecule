---
'@molecule/api-search-elasticsearch': patch
---

Route Elasticsearch requests through the outbound proxy when one is configured. `@elastic/transport` builds its own `undici` pool bound to the node origin, which bypasses the environment-driven global dispatcher, so on a host whose only egress path is a proxy every request failed with a bare connection error; the client now receives the proxy URL via its own `proxy` option, resolved against `ELASTICSEARCH_URL` so a self-hosted cluster listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
