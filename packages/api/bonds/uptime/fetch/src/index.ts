/**
 * In-process uptime provider for `@molecule/api-uptime`.
 *
 * Probe an http(s) URL from THIS process — status, latency, redirect count
 * and TLS-certificate lifetime — with the shared verdict rules. The default
 * dialing is VERIFIED: every resolved address must be public unicast (the
 * render machine's egress rules, ported into `@molecule/api-uptime`), and
 * the request goes to the verified address so DNS rebinding has nothing to
 * switch to. Swap it for `@molecule/api-uptime-molecule` (molecule.dev
 * hosted) without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, probe } from '@molecule/api-uptime'
 * import { provider as uptimeFetch } from '@molecule/api-uptime-fetch'
 *
 * setProvider(uptimeFetch) // verified public dialing, no configuration
 *
 * const result = await probe({
 *   url: 'https://api.example.com/health',
 *   expectText: '"ok"',
 *   degradedLatencyMs: 1500,
 * })
 * if (result.status !== 'operational') console.error(result.message)
 * ```
 *
 * @remarks
 * - **A `down` site is a successful probe** — the promise resolves with the
 *   verdict; it rejects only when the spec is invalid or no provider is
 *   bonded. An INVALID TLS certificate is `down` (the message names it);
 *   `tls.daysRemaining` warns before expiry.
 * - **Private targets are refused by default.** `allowPrivateTargets: true`
 *   (createProvider) lifts the public-only rule for probing your OWN
 *   internal hosts in development — never enable it on a path that takes a
 *   raw user-supplied URL: a verified probe cannot be pointed at your
 *   network, an unverified one is an SSRF primitive. The hosted
 *   molecule.dev bond refuses private targets unconditionally.
 * - The verdict rules (same in every bond): failure → `down`;
 *   `expectStatus` is the whole verdict when given; else 2xx `operational`,
 *   3xx `degraded`, 4xx/5xx `down`; `expectText` absent from the first 1 MB
 *   → `down`; slower than `degradedLatencyMs` (default 2,000) → `degraded`.
 * - Redirects: up to 3 hops, each re-verified; 303 switches a HEAD probe to
 *   GET. The result reports `redirects` and `finalUrl`.
 * - The response body is read to 1 MB at most and matched for `expectText`
 *   (case-sensitive substring) — never executed, never parsed as markup.
 * - This is a point-in-time probe, not a monitor: nothing is scheduled and
 *   no history is kept. Drive it on your own cadence.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

import type { UptimeProvider } from '@molecule/api-uptime'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use. */
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
