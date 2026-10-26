/**
 * Provider-agnostic uptime interface for molecule.dev — probe an http(s) URL
 * and get a verdict: `operational`, `degraded` or `down`, with latency, the
 * final HTTP status, redirect count and the TLS certificate's remaining
 * lifetime.
 *
 * Defines the `UptimeProvider` interface for availability checks. Bond
 * packages (an in-process fetch with verified dialing, molecule.dev hosted)
 * implement this interface. Application code uses the `probe` convenience
 * function, which delegates to the bonded provider.
 *
 * @remarks
 * - **A `down` site is a SUCCESSFUL probe.** The provider resolves with the
   `down` verdict — the call answered the question. A thrown error means the
 *   probe itself could not run (invalid spec, provider misconfigured).
 * - **Verdict rules** (the same in every bond — see `deriveProbeStatus`):
 *   a connection/DNS/TLS/timeout failure is `down`; `expectStatus`, when
 *   given, is the whole verdict; otherwise 2xx is `operational`, 3xx
 *   `degraded` (the probe follows up to 3 redirects), 4xx/5xx `down`;
 *   `expectText` absent from the first 1 MB of the body is `down`; an
 *   `operational` probe slower than `degradedLatencyMs` (default 2,000)
 *   degrades.
 * - **A `url:` probe leaves YOUR server's network** — an in-process bond
 *   dials what the URL names. The default dialing is VERIFIED (every
 *   resolved address must be public unicast — loopback, RFC 1918, link-local
 *   cloud metadata and every other non-global range refuse, and the probe
 *   dials the verified address, so DNS rebinding has nothing to switch to);
 *   `allowPrivateTargets: true` lifts that for probing hosts you know are
 *   yours — NEVER with a raw user-supplied URL (prefer the hosted
 *   molecule.dev bond there; it refuses private targets, period).
 * - Probe targets are untrusted INPUT, but responses are not executed and
 *   not parsed as markup: the body is read only to cap 1 MB and match
 *   `expectText`.
 * - This is a point-in-time probe, NOT a monitor: nothing is scheduled and
 *   no history is kept. Call it on your own cadence (a cron in the app, an
 *   agent's loop) — or use it as the check a status page's renderer drives.
 *
 * @example
 * ```typescript
 * import { setProvider, probe } from '@molecule/api-uptime'
 * import { provider as uptimeFetch } from '@molecule/api-uptime-fetch'
 *
 * setProvider(uptimeFetch)
 * const result = await probe({
 *   url: 'https://api.example.com/health',
 *   expectText: '"ok"',
 * })
 * console.log(result.status, result.latencyMs, result.tls?.daysRemaining)
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './public-ip.js'
export * from './types.js'
export * from './validate.js'

// Provider exports
export * from './provider.js'
