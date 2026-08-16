# @molecule/api-proxy-agent

## 1.1.0

### Minor Changes

- 8b35739: New package: builds a CONNECT-capable HTTP(S) agent from the standard proxy environment (`HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`, honouring `NO_PROXY`) for vendor SDKs that create their own HTTP agent and read no proxy variable. `getProxyAgent(url)` returns the agent, `getProxyAgents(url)` the `{ httpAgent } | { httpsAgent }` shape AWS SDK v3's `requestHandler` accepts, and `getProxyUrl(url)` the URL for clients that want it directly. All return `undefined` when the target is not proxied, so passing the result through is a no-op outside a proxied environment.
