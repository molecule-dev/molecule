/**
 * E2E bond that drives the LIVE PREVIEW — the page the molecule.dev IDE is
 * already showing, in the person's own browser — as a Playwright-shaped page.
 * The browser that renders the preview is the browser that runs the test, so
 * the spec exercises exactly the tab the person is watching. (A sandbox also
 * ships its own Chromium; `@molecule/app-e2e-playwright` is the bond that runs
 * the same specs there with no tab involved, and the one a sandbox picks by
 * default — choose this bond with `MOL_E2E_PROVIDER=preview`.)
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
 * ```typescript
 * // 1. vite.config.ts — scaffolded molecule apps already carry the plugin:
 * //      import { molE2EPreviewPlugin } from '@molecule/app-e2e-preview/vite'
 * //      export default defineConfig({ plugins: [react(), molE2EPreviewPlugin()] })
 *
 * // 2. scripts/check-preview.ts — run on the dev server's machine while the
 * //    preview is open in the IDE (or any browser tab).
 * import { requireProvider, setProvider } from '@molecule/app-e2e'
 * import { provider } from '@molecule/app-e2e-preview'
 * import type { PreviewConnectOptions } from '@molecule/app-e2e-preview'
 *
 * setProvider(provider) // specs get this from e2e/bonds.ts
 *
 * // Finds the dev server (MOL_E2E_PREVIEW_PORT, 5173, VITE_PORT, 3000) and its token.
 * const options: PreviewConnectOptions = { connectTimeout: 5_000, timeout: 5_000 } // ms
 * const page = await requireProvider().connect(options)
 * try {
 *   const heading = await page.getByRole('heading', { level: 1 }).textContent()
 *   const fontSize = await page.locator('p').first().evaluate((el) => getComputedStyle(el).fontSize)
 *   await page.getByRole('button', { name: 'Save' }).click()
 *   console.log(heading, fontSize)
 * } finally {
 *   await page.close() // detaches the driver; the person's tab stays open
 * }
 * ```
 *
 * @remarks
 * - **Import the Vite plugin from the `/vite` subpath**
 *   (`@molecule/app-e2e-preview/vite`) in `vite.config.ts`; without it no page
 *   ever attaches and every `connect()` fails after `connectTimeout`.
 * - **`page.close()` never closes the person's tab** — it only drops the
 *   driver connection. Screenshots, network routing and element handles are
 *   NOT available here (they throw); use `@molecule/app-e2e-playwright`.
 * - **Every page the dev server sends is a page the driver can see.** The
 *   plugin puts its client into every HTML response — Vite's own index and
 *   the HTML an app renders from its own dev middleware alike (a static-site
 *   generator's post routes, an SSR handler). A page the preview shows is a
 *   page the hub lists; if it is not, the app is bypassing the dev server.
 * - **Someone must be looking, and the bond fails fast when nobody is.** The
 *   renderer is a browser tab showing the preview. `connect()` waits 5 s
 *   (`connectTimeout`) for a page to be attached and then fails naming the
 *   cause and the alternative: open the preview in the IDE or in any tab, or
 *   run with `MOL_E2E_PROVIDER=playwright`, which needs no tab. The runner
 *   opens a connection per test (in a fresh worker process after each
 *   failure), so after one full wait finds no page the driver leaves a marker
 *   beside the hub's token file and the next connects fail at once (for a
 *   minute, or until the hub lists a page) — a spec file with no tab reports
 *   it once, in seconds, instead of hanging once per test. Any connected viewer will do — a desktop
 *   tab keeps working while a phone sleeps. The IDE holds a screen wake lock
 *   during builds and re-delivers commands when a hidden tab wakes.
 * - **A background tab is as fast as a foreground one.** Browsers throttle a
 *   hidden page's timers to once a second (once a minute after a while), so
 *   nothing in the page waits on a timer: every call is answered at once and
 *   the driver, on its own clock, re-asks while an element is still on its
 *   way. The plugin also serves the locator runtime as a script with the
 *   document, so the first call after a navigation costs one round trip, not
 *   a 60 KB install. Budget one to two seconds per navigation through the
 *   sandbox proxy and about a fifth of a second per action; a whole spec
 *   file normally finishes in well under a minute.
 * - **Discovery.** The driver tries `MOL_E2E_PREVIEW_URL`, then ports
 *   `MOL_E2E_PREVIEW_PORT`, 5173 (the sandbox preview port), `VITE_PORT`,
 *   3000, reading each hub's token from `MOL_E2E_TOKEN` or the file the hub
 *   writes in the OS temp dir. Only loopback drivers with the token are
 *   accepted, so a preview URL never becomes a way to run code in someone
 *   else's tab.
 * - **URLs.** `page.goto('/path')` navigates the previewed page relative to
 *   ITS origin; an absolute `http://localhost:<port>/path` is rewritten to the
 *   same path there, so specs written for a local base URL run unchanged.
 * - **Base path.** An app served under a base (Vite `base: '/blog/'`) has
 *   every URL under it; the page knows its base (the plugin tags the client
 *   with it) and a `goto` outside it fails at once naming the base, instead
 *   of landing on the dev server's "did you mean /blog/…" page — which has
 *   no app and no client, so nothing there can be driven. The page also
 *   announces the base to the IDE that frames it (`molecule:base`), so the
 *   IDE's own navigation stays inside the app.
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

export * from './client.js'
export * from './provider.js'
export * from './server.js'
export * from './types.js'
export * from './vite.js'
