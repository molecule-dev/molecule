/**
 * Puppeteer screenshot provider for `@molecule/api-screenshots`.
 *
 * Captures PNG/JPEG images of a URL or an HTML string with in-process
 * headless Chrome. An ordinary bond: swap it for
 * `@molecule/api-screenshots-molecule` (molecule.dev hosted, no local Chrome)
 * without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, capture } from '@molecule/api-screenshots'
 * import { provider } from '@molecule/api-screenshots-puppeteer'
 *
 * setProvider(provider) // launches headless Chrome on first use
 *
 * const png = await capture({ url: 'https://example.com' }, { width: 1280, height: 800 })
 * ```
 *
 * @remarks
 * - Config is in code (`executablePath`, `launchArgs`, `timeout`), not env
 *   vars. Chrome is downloaded by the `puppeteer` dependency on install
 *   (egress `storage.googleapis.com`); set `executablePath` to skip the
 *   download and use a system Chrome (`/usr/bin/chromium`).
 * - **This process is the SSRF boundary, and it has no guard**: a `url:`
 *   capture navigates from YOUR network, an `html:` capture fetches whatever
 *   the markup names. Only capture URLs you control. The hosted bond runs the
 *   same capture behind an egress guard — prefer it for user-supplied targets.
 * - Caps enforced before Chrome is asked for anything (the same numbers the
 *   hosted service uses, so the two bonds behave identically): viewport
 *   16–3840 px per side, device scale 1–3, `delayMs` 0–5000, 2,000,000
 *   characters of HTML, 2,048 characters of URL, a 20,000 px full-page
 *   height, and a 25-megapixel raster budget — a hostile page's claimed
 *   `scrollHeight` never sizes a capture past it.
 * - A capture waits for the `load` event plus `delayMs`; it does not wait for
 *   every animation or lazy image. Errors are plain `Error`s naming the field
 *   at fault.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

import type { ScreenshotProvider } from '@molecule/api-screenshots'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use. */
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
