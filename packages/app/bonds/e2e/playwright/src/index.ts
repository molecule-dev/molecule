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
 * When the test runner picks the `playwright` provider, `@molecule/app-e2e`'s
 * `test` IS Playwright's `test`, so this bond is only reached by scripts that
 * call `connect()` themselves (a measurement script, a smoke check outside the
 * runner). Under `npx playwright test`, Playwright's own fixtures launch the
 * browser as usual.
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
 * - On your own machine, browsers are installed once with
 *   `npx playwright install chromium` (`@playwright/test` never downloads them
 *   on `npm install`). The launch error says so when they are missing.
 * - Inside a molecule sandbox nothing is installed by hand: the image ships
 *   Chromium under `PLAYWRIGHT_BROWSERS_PATH` (`/ms-playwright`), pinned to
 *   the same Playwright version the scaffold's `@playwright/test` uses. It is
 *   the headless shell, so `headless: false` has no display to open, and the
 *   `firefox`/`webkit` engines are not baked — Chromium is the sandbox engine.
 *   Chromium runs with Playwright's default `chromiumSandbox: false` (the
 *   container is the sandbox), and `/tmp` there is a 256 MB tmpfs, which is
 *   where its per-launch profile goes.
 * - `MOL_E2E_BROWSER=firefox|webkit` picks the engine; `MOL_E2E_HEADED=1`
 *   shows the window (both are for your own machine).
 * - Budget, measured inside a sandbox at the free tier's cap (1 CPU, 1280 MB):
 *   the browser launches in about a second and a spec file of a dozen tests
 *   finishes in well under a minute — run ONE spec file per command so a run
 *   never meets the sandbox's per-command cap.
 *
 * @module
 */

export { connectPlaywright, provider } from './provider.js'
export * from './types.js'
