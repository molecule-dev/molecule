/**
 * Builds a CONNECT-capable agent from the standard proxy environment.
 *
 * @module
 */

import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { getProxyForUrl } from 'proxy-from-env'

import type { ProxyAgent, ProxyAgentOptions } from './types.js'

/**
 * Memoized agents, keyed by `<proxyUrl>|<targetProtocol>|<keepAlive>`.
 *
 * One agent per proxy is the point: an agent owns a connection pool, so
 * constructing a fresh one per SDK call would open (and leak) a new tunnel
 * every time.
 */
const cache = new Map<string, ProxyAgent>()

/**
 * Returns the proxy URL that should serve `targetUrl` according to the standard
 * proxy environment (`HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`, either case),
 * or `undefined` when the target is not proxied — either because no proxy is
 * configured, or because `NO_PROXY` exempts it.
 *
 * @param targetUrl - The absolute URL the SDK is about to call.
 * @returns The proxy URL, or `undefined` to connect directly.
 */
export const getProxyUrl = (targetUrl: string): string | undefined =>
  getProxyForUrl(targetUrl) || undefined

/**
 * Whether `targetUrl` should be sent through a proxy.
 *
 * @param targetUrl - The absolute URL the SDK is about to call.
 * @returns `true` when a proxy is configured for this target.
 */
export const shouldProxy = (targetUrl: string): boolean => getProxyUrl(targetUrl) !== undefined

/**
 * Returns an agent that tunnels `targetUrl` through the configured proxy via
 * `CONNECT`, or `undefined` when this target is not proxied.
 *
 * `undefined` is the whole contract: a call site passes the result straight into
 * its SDK's own agent option, so with no proxy configured the SDK keeps its own
 * default agent and behaves exactly as it did before. Nothing is monkey-patched
 * and nothing changes for an app running outside a proxied environment.
 *
 * @param targetUrl - The absolute URL the SDK is about to call. It decides both
 *   which env var applies (`https_proxy` vs `http_proxy`) and whether `NO_PROXY`
 *   exempts the host, so pass the real vendor endpoint — not a placeholder.
 * @param options - See {@link ProxyAgentOptions}.
 * @returns An `http.Agent`/`https.Agent` that tunnels through the proxy, or
 *   `undefined` when the target is not proxied.
 */
export const getProxyAgent = (
  targetUrl: string,
  options: ProxyAgentOptions = {},
): ProxyAgent | undefined => {
  const proxyUrl = getProxyUrl(targetUrl)
  if (!proxyUrl) {
    return undefined
  }

  const keepAlive = options.keepAlive ?? true
  const secure = targetUrl.startsWith('https:')
  const key = `${proxyUrl}|${secure ? 'https' : 'http'}|${keepAlive}`

  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const agent: ProxyAgent = secure
    ? new HttpsProxyAgent(proxyUrl, { keepAlive })
    : new HttpProxyAgent(proxyUrl, { keepAlive })

  cache.set(key, agent)
  return agent
}

/**
 * Returns `{ httpAgent }` or `{ httpsAgent }` — whichever matches `targetUrl`'s
 * protocol — or `undefined` when the target is not proxied.
 *
 * This is the shape AWS SDK v3's `requestHandler` accepts directly (it takes
 * `NodeHttpHandler` OPTIONS, so no `@smithy/node-http-handler` dependency is
 * needed), and it is also what `got` and `node-fetch` take. Spread it, so that
 * an unproxied environment adds no key at all:
 *
 * ```typescript
 * const proxy = getProxyAgents(endpoint)
 * new S3Client({ region, ...(proxy ? { requestHandler: proxy } : {}) })
 * ```
 *
 * @param targetUrl - The absolute URL the SDK is about to call.
 * @param options - See {@link ProxyAgentOptions}.
 * @returns The agent pair, or `undefined` when the target is not proxied.
 */
export const getProxyAgents = (
  targetUrl: string,
  options: ProxyAgentOptions = {},
): { httpAgent?: ProxyAgent; httpsAgent?: ProxyAgent } | undefined => {
  const agent = getProxyAgent(targetUrl, options)
  if (!agent) {
    return undefined
  }
  return targetUrl.startsWith('https:') ? { httpsAgent: agent } : { httpAgent: agent }
}

/**
 * Drops every memoized agent, destroying its sockets.
 *
 * Only useful when the proxy environment changes inside a live process — a test
 * that mutates `process.env`, or a secrets bond that resolves `HTTPS_PROXY`
 * after the first call. Ordinary application code never needs it.
 */
export const resetProxyAgents = (): void => {
  for (const agent of cache.values()) {
    agent.destroy()
  }
  cache.clear()
}
