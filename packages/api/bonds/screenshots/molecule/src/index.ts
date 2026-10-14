/**
 * molecule.dev hosted screenshot provider for `@molecule/api-screenshots`.
 *
 * Capture a URL or an HTML string to a PNG/JPEG image on molecule.dev —
 * billed to your molecule project, no vendor account, no local Chrome. It is
 * an ordinary bond: swap it for `@molecule/api-screenshots-puppeteer`
 * (in-process headless Chrome) without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, capture } from '@molecule/api-screenshots'
 * import { provider as screenshots } from '@molecule/api-screenshots-molecule'
 *
 * setProvider(screenshots) // reads MOLECULE_API_KEY from the environment
 *
 * const png = await capture({ url: 'https://example.com' }, { width: 1280, height: 800 })
 * const og = await capture({ html: '<h1>Hello</h1>' }, { width: 1200, height: 630, format: 'jpeg' })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:screenshots`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - Limits mirrored locally: 2,000,000 characters of HTML, a 2,048-character
 *   URL, viewport 16–3840 px per side, device scale 1–3, `delayMs` 0–5000, a
 *   20,000 px full-page height, a 25-megapixel raster budget and a 12 MB
 *   result — oversized or over-budget calls are refused locally and never
 *   leave the process.
 * - **One hosted round trip per capture.** Use `captureWithMeta` (or the raw
 *   `MoleculeScreenshotProvider`) when you also want the image's pixel
 *   dimensions — the same response carries them.
 * - **A user-supplied URL is safe to pass**: the hosted renderer fetches
 *   HTTP(S) targets from PUBLIC addresses only — loopback, private-network,
 *   link-local and other non-global addresses are refused server-side before
 *   any connection, and `file:` URLs are never read. (An in-process bond has
 *   no such guard — prefer this bond when the URL is untrusted.)
 * - Metered per capture and billed to the project; the upstream is molecule's
 *   own infrastructure, so the real cost is 0 — requests still count against
 *   the project's rate limit and free-tier allowance.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 over limits, 429 / 503 retry later). Nothing is
 *   retried. The default timeout is 60 s — the renderer loads the page first.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { ScreenshotProvider } from '@molecule/api-screenshots'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: ScreenshotProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: ScreenshotProvider = new Proxy({} as ScreenshotProvider, {
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
