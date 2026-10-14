/**
 * Provider-agnostic screenshot capture interface for molecule.dev.
 *
 * Defines the `ScreenshotProvider` interface for capturing images of a URL or
 * an HTML string. Bond packages (Puppeteer in-process, molecule.dev hosted)
 * implement this interface. Application code uses the `capture` convenience
 * function, which delegates to the bonded provider.
 *
 * @remarks
 * - **A browser-engine provider fetches the page — and everything it names —
 *   with YOUR server's network access (SSRF).** A `url:` capture navigates to
 *   that address and loads its subresources from your machine; an `html:`
 *   capture renders whatever `<img src>` / CSS `url()` the markup names. The
 *   hosted molecule.dev provider runs every capture through an egress guard
 *   that resolves each target itself and dials public addresses only; an
 *   in-process bond (Puppeteer) has NO such guard — point it only at URLs you
 *   control, and never pass a raw user-supplied URL straight through.
 * - **A hostile page is untrusted input on every axis**: its `scrollHeight`
 *   can be enormous (providers cap how tall a `fullPage` capture may get), its
 *   scripts can stall the load event (providers bound the wait and the total
 *   capture time), and the returned image is whatever the page drew.
 * - Results are `Buffer`s: send them with an `image/png` / `image/jpeg`
 *   response, or store them via the uploads package — never `JSON.stringify`
 *   a Buffer into an API payload.
 * - Output dimensions depend on the options: the image is `width × height ×
 *   scale` pixels for a viewport capture, and as tall as the page (up to the
 *   provider's cap) for `fullPage`.
 *
 * @example
 * ```typescript
 * import { setProvider, capture } from '@molecule/api-screenshots'
 * import { provider as puppeteer } from '@molecule/api-screenshots-puppeteer'
 *
 * setProvider(puppeteer)
 * const png = await capture({ url: 'https://example.com' }, { width: 1280, height: 800 })
 * const og = await capture({ html: '<h1>Hello</h1>' }, { width: 1200, height: 630 })
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
