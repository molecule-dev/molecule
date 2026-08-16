/**
 * A CONNECT-capable proxy agent built from the standard proxy environment, for
 * the vendor SDKs that ignore it.
 *
 * Most HTTP clients already honour `HTTPS_PROXY`/`HTTP_PROXY`/`NO_PROXY`: Node's
 * global `fetch` does under `NODE_USE_ENV_PROXY=1`, and so do axios-based SDKs.
 * A handful do not — they build their own `http.Agent` or `undici` pool and dial
 * the vendor directly. On a workstation that direct connection succeeds, so the
 * difference is invisible; in an environment whose ONLY egress path is a proxy
 * (a molecule.dev sandbox, a deployed molecule.dev app, a locked-down VPC) the
 * same call fails with a bare connection error naming nothing.
 *
 * Each of those SDKs does accept an agent — it just will not build one for you.
 * `getProxyAgent(url)` builds it, and returns `undefined` when no proxy applies
 * so the SDK keeps its own default and an app running outside a proxied
 * environment is completely unaffected.
 *
 * @example
 * ```typescript
 * import { getProxyAgent, getProxyAgents } from '@molecule/api-proxy-agent'
 *
 * // Stripe: `httpAgent` is used for every request the client makes.
 * const stripe = new Stripe(key, { httpAgent: getProxyAgent('https://api.stripe.com') })
 *
 * // AWS SDK v3 (any client): `requestHandler` takes NodeHttpHandler options,
 * // so no extra `@smithy/*` dependency is needed.
 * const proxy = getProxyAgents(`https://email.${region}.amazonaws.com`)
 * const ses = new SESv2Client({ region, ...(proxy ? { requestHandler: proxy } : {}) })
 * ```
 *
 * @remarks
 * - **Pass the REAL endpoint, not a placeholder.** The target URL decides which
 *   variable applies (`https_proxy` vs `http_proxy`) and whether `NO_PROXY`
 *   exempts the host. `getProxyAgent('https://example.com')` standing in for an
 *   S3 call would consult the wrong `NO_PROXY` entry.
 * - **Spread the result, never pass it unconditionally.** Several SDKs treat a
 *   present-but-`undefined` agent option as "use no agent" rather than "use the
 *   default". `...(agent ? { httpAgent: agent } : {})` is the shape that is a
 *   true no-op when nothing is proxied.
 * - **Agents are memoized per proxy URL**, because an agent owns a connection
 *   pool — building a fresh one per call opens a new tunnel every request. Call
 *   it inside your lazy client getter and keep the client, not the agent.
 * - **This cannot rescue an SDK that vendors its own proxy handling.** If a
 *   library bundles a copy of its HTTP client and offers no agent option, there
 *   is no hook to pass this into; the fix has to be upstream or in the proxy.
 * - **HTTP(S) only.** A raw-TCP client — Postgres, MySQL, Redis, Mongo, AMQP,
 *   SMTP — cannot be tunnelled by an HTTP proxy at all. Those need a network
 *   path to the host, not an agent.
 * - Built on `https-proxy-agent`/`http-proxy-agent` (the CONNECT tunnel) and
 *   `proxy-from-env` (the env + `NO_PROXY` semantics, the same resolver axios
 *   uses) rather than a hand-rolled parser: `NO_PROXY` has enough real edge
 *   cases — leading dots, `*`, per-entry ports, IPv6 brackets — that a bespoke
 *   one would be wrong in exactly the situations it matters.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './proxyAgent.js'
export * from './types.js'
