/**
 * E2E bond that drives the LIVE PREVIEW — the page the molecule.dev IDE is
 * already showing, in the person's own browser — as a Playwright-shaped page.
 * No browser binary in the sandbox, nothing to download: the browser that
 * renders the preview is the browser that runs the test.
 *
 * Three small parts:
 *
 * 1. A Vite plugin ({@link molE2EPreviewPlugin}) every scaffolded app carries.
 *    In `vite` dev and `vite preview` it serves a tiny page client, injects it
 *    into each document, and attaches a WebSocket hub to the dev server.
 *    `vite build` output is untouched.
 * 2. The page client, which opens a same-origin WebSocket back to that hub
 *    (through whatever proxy serves the preview), runs `evaluate` requests,
 *    navigates on request, asks the framing IDE to resize on
 *    `setViewportSize`, and forwards console output, errors and dialogs.
 * 3. The driver ({@link provider}), which the test runner uses from the same
 *    machine as the dev server: it connects to the hub as `role=driver`
 *    (loopback only, with the hub's token) and turns one connected page into
 *    `@molecule/app-e2e`'s Playwright-shaped `Page`.
 *
 * @example
 * ```ts
 * // e2e/bonds.ts (scaffolded)
 * import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
 * import { provider as playwright } from '@molecule/app-e2e-playwright'
 * import { provider as preview } from '@molecule/app-e2e-preview'
 *
 * setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
 *
 * // vite-preview-bridge-plugin.ts (scaffolded) — the plugin rides the existing molecule plugin
 * import { molE2EPreviewPlugin } from '@molecule/app-e2e-preview/vite'
 *
 * // any script — measure the live page without a test runner
 * import { connectPreview } from '@molecule/app-e2e-preview'
 * const page = await connectPreview()
 * await page.setViewportSize({ width: 390, height: 844 })
 * console.log(await page.locator('article p').first().evaluate((el) => getComputedStyle(el).fontSize))
 * await page.close()
 * ```
 *
 * @remarks
 * - **Someone must be looking.** The renderer is a browser tab showing the
 *   preview. `connect()` waits (30s by default) for a page to be connected
 *   and then fails with a message saying to open the preview in the IDE or
 *   in any tab. Any connected viewer will do — a desktop tab keeps working
 *   while a phone sleeps. The IDE holds a screen wake lock during builds and
 *   re-delivers commands when a hidden tab wakes.
 * - **Discovery.** The driver tries `MOL_E2E_PREVIEW_URL`, then ports
 *   `MOL_E2E_PREVIEW_PORT`, 5173 (the sandbox preview port), `VITE_PORT`,
 *   3000, reading each hub's token from `MOL_E2E_TOKEN` or the file the hub
 *   writes in the OS temp dir. Only loopback drivers with the token are
 *   accepted, so a preview URL never becomes a way to run code in someone
 *   else's tab.
 * - **URLs.** `page.goto('/path')` navigates the previewed page relative to
 *   ITS origin; an absolute `http://localhost:<port>/path` is rewritten to the
 *   same path there, so specs written for a local base URL run unchanged.
 * - **Viewport.** `page.setViewportSize` posts `molecule:viewport` to the
 *   framing IDE, which resizes the frame; in a plain tab the size cannot
 *   change and the call throws (the configured project viewport is applied
 *   with a warning instead of a failure).
 * - **What is not here** is listed in `@molecule/app-e2e`'s docs — screenshots,
 *   network interception, element handles, iframes — each method throws with
 *   the alternative; `@molecule/app-e2e-playwright` runs the same spec with
 *   real browsers when you need them.
 * - Imported (non-Vite) apps get the hub only if their dev server can host
 *   it; today the plugin covers every Vite-served app, which is every
 *   molecule scaffold.
 *
 * @module
 */

export { E2E_PREVIEW_CLIENT_SCRIPT } from './client.js'
export { connectPreview, listPreviewPages, provider } from './provider.js'
export { attachE2EHub, type E2EHub } from './server.js'
export * from './types.js'
export { injectE2EClientTag, molE2EPreviewPlugin, type MolE2EPreviewPluginOptions } from './vite.js'
