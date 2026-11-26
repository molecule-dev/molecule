/**
 * E2E bond that opens real Playwright browsers — Chromium, Firefox or WebKit
 * with everything Playwright offers: screenshots, traces, videos, network
 * interception. It is the bond a molecule sandbox uses too: every sandbox
 * image bakes Playwright's Chromium (the headless shell, its system libraries
 * and fonts), so `npm run test:e2e` runs there exactly as it does on your own
 * machine and in CI, against the app's own dev server on `localhost`, with no
 * IDE tab involved. `@molecule/app-e2e-preview` remains the way to drive the
 * live preview the person is watching.
 *
 * The Molecule suite installs the managed browser it needs on first use,
 * then Playwright's own fixtures launch it. Set `MOL_E2E_SKIP_BROWSER_INSTALL=1`
 * if you provision browsers yourself. On a read-only browser cache (a mount
 * shared into a container), setup checks the required downloads and fails at
 * once if any are missing. Playwright checks FFmpeg when recording video and
 * validates host libraries when launching a browser.
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
 * // a script
 * import { connectPlaywright } from '@molecule/app-e2e-playwright'
 * const page = await connectPlaywright({ baseURL: 'http://localhost:3000', viewport: { width: 390, height: 844 } })
 * await page.goto('/')
 * await page.screenshot({ path: 'home-phone.png' })
 * await page.close() // closes the context and the browser too
 * ```
 *
 * @remarks
 * - Scripts that call `connectPlaywright()` directly can install their browser
 *   first with `npx playwright install chromium` or pass the install arguments
 *   to `installPlaywrightBrowser`.
 * - Inside a molecule sandbox nothing is installed by hand: the image ships
 *   Chromium where Playwright looks by default (`~/.cache/ms-playwright` of
 *   the sandbox user; `PLAYWRIGHT_BROWSERS_PATH` points there too), pinned to
 *   the same Playwright version the scaffold's `@playwright/test` uses. It is
 *   the headless shell, so `headless: false` has no display to open, and the
 *   `firefox`/`webkit` engines are not baked — Chromium is the sandbox engine.
 *   Chromium runs with Playwright's default `chromiumSandbox: false` (the
 *   container is the sandbox), and `/tmp` there is a 256 MB tmpfs, which is
 *   where its per-launch profile goes.
 * - `MOL_E2E_BROWSER=firefox|webkit` picks the engine; `MOL_E2E_HEADED=1`
 *   shows the window (both are for your own machine).
 * - Budget, measured inside a sandbox at the free tier's cap (1 CPU, 1280 MB,
 *   2026-09-22): the browser launches in 0.5–0.8 s; a spec file of four to
 *   seven tests takes 4–13 s including the runner's startup, 0.1–3 s per test;
 *   Chromium's peak RSS is ~170 MB and the runner's ~190 MB. Run ONE spec file
 *   per command so a run never meets the sandbox's per-command cap.
 *
 * @module
 */

export { installPlaywrightBrowser } from './install.js'
export { connectPlaywright, provider } from './provider.js'
export * from './types.js'
