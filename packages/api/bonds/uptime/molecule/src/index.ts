/**
 * molecule.dev hosted uptime provider for `@molecule/api-uptime`.
 *
 * Probe a URL from molecule.dev's vantage point — status, latency, the final
 * HTTP status, redirect count and the TLS certificate's remaining lifetime —
 * billed to your molecule project, no vendor account. It is an ordinary
 * bond: swap it for `@molecule/api-uptime-fetch` (in-process, verified
 * public dialing) without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, probe } from '@molecule/api-uptime'
 * import { provider as uptime } from '@molecule/api-uptime-molecule'
 *
 * setProvider(uptime) // reads MOLECULE_API_KEY from the environment
 *
 * const result = await probe({
 *   url: 'https://api.example.com/health',
 *   expectText: '"ok"',
 * })
 * console.log(result.status, result.latencyMs, result.tls?.daysRemaining)
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:uptime`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - **A user-supplied URL is safe to pass**: the hosted machine probes
 *   HTTP(S) targets from PUBLIC addresses only — loopback, private-network,
 *   link-local and other non-global addresses are refused before any
 *   connection (the egress guard verifies every dial's DNS itself, so DNS
 *   rebinding has nothing to switch to). A probe of YOUR OWN site sees the
 *   public internet's view of it — the point of an uptime check.
 * - **A `down` site is a successful probe**: the promise resolves with the
 *   `down` verdict. It rejects only for a refused call (bad key, bad spec)
 *   or a service failure.
 * - Limits mirrored locally: a 2,048-character URL, `timeoutMs` 1,000–30,000
 *   (default 10,000), `expectText` 1–256 characters (GET only) — bad calls
 *   are refused locally and never leave the process.
 * - This is a point-in-time probe, not a monitor: nothing is scheduled and
 *   no history is kept. Drive it on your own cadence (the app's cron, an
 *   agent loop, a status-page renderer).
 * - Metered per probe and billed to the project; the upstream is molecule's
 *   own infrastructure, so the real cost is 0 — probes still count against
 *   the project's rate limit and free-tier allowance.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 over limits, 429 / 503 retry later). Nothing is
 *   retried. The default HTTP timeout is 45 s — the probe budget (at most
 *   30 s) plus redirect and network slack.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { UptimeProvider } from '@molecule/api-uptime'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: UptimeProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: UptimeProvider = new Proxy({} as UptimeProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
