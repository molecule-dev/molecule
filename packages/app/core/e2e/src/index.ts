/**
 * The e2e bond contract: which browser runs an app's end-to-end specs.
 *
 * A provider opens a Playwright-shaped `Page`. Two bonds exist:
 *
 * - **`@molecule/app-e2e-playwright`** launches a real Playwright browser.
 *   Every molecule sandbox image bakes Chromium (headless shell + its system
 *   libraries and fonts), so this is what a sandbox uses — the specs run there
 *   exactly as they do on your own machine and in CI, with no IDE tab involved.
 * - **`@molecule/app-e2e-preview`** drives the LIVE PREVIEW the molecule.dev
 *   IDE is showing — the page the person is looking at, in their own browser —
 *   over a WebSocket through the dev server. Pick it (`MOL_E2E_PROVIDER=preview`)
 *   when the point is to drive the tab the person is watching; it needs that
 *   tab to be open and fails fast when it is not.
 *
 * Specs do not import this package directly: they import `test` and `expect`
 * from `@molecule/app-e2e-fixtures-default` (a drop-in for `@playwright/test`
 * whose `page` fixture comes from the bonded provider) and stay identical in
 * both places. This core holds only the contract and the accessor, plus
 * `resolveE2EProviderName()`, the one rule that decides which bond an
 * environment gets: `MOL_E2E_PROVIDER` when set; otherwise, inside a molecule
 * sandbox (the `/etc/mol/app-root` marker exists), `playwright` when a
 * Playwright browser is installed (`hasInstalledBrowser()` — it looks under
 * `PLAYWRIGHT_BROWSERS_PATH`) and `preview` when none is; and `playwright`
 * everywhere else.
 *
 * It also holds `e2eRunnerDefaults()`, the runner settings (workers,
 * parallelism, retries, failure cap, per-test timeout) every scaffolded
 * `playwright.config.ts` spreads first, so one change here reaches every app.
 *
 * @example
 * ```ts
 * // e2e/bonds.ts — scaffolded into every app; wires the provider for THIS environment
 * import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
 * import { provider as playwright } from '@molecule/app-e2e-playwright'
 * import { provider as preview } from '@molecule/app-e2e-preview'
 *
 * setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
 *
 * // playwright.config.ts — the shared runner settings first, so the app can override any of them
 * import { defineConfig } from '@playwright/test'
 * import { e2eRunnerDefaults } from '@molecule/app-e2e'
 *
 * export default defineConfig({ ...e2eRunnerDefaults(), testDir: './e2e' })
 *
 * // a script that measures the live page without a test runner
 * import { requireProvider } from '@molecule/app-e2e'
 * const page = await requireProvider().connect({ viewport: { width: 390, height: 844 } })
 * await page.goto('/blog/hello/')
 * console.log(await page.locator('article p').first().evaluate((el) => getComputedStyle(el).fontSize))
 * await page.close()
 * ```
 *
 * @remarks
 * - `connect()` returns Playwright's `Page` TYPE in every bond, so specs,
 *   helpers and editor completions are the same everywhere. What a bond can
 *   actually do is documented on the bond; the preview bond throws a one-line
 *   error naming the alternative for the few methods that need a real browser
 *   (screenshots, network interception, element handles, iframes).
 * - `isMoleculeSandbox()` and `hasInstalledBrowser()` are the two facts the
 *   rule is made of; a `playwright.config.ts` reads them to turn video, traces
 *   and retries off inside a sandbox, where the run is a feedback loop and
 *   nothing reads the artifacts.
 * - A bond that can only run code INSIDE a page implements {@link E2ETransport}
 *   (`evaluate`, `navigate`, `viewport`, events) and gets the whole
 *   Playwright-shaped page from `createEvaluatePage()` in
 *   `@molecule/app-e2e-fixtures-default`.
 * - `e2eRunnerDefaults()` decides five runner fields; spread it FIRST in
 *   `defineConfig({ ...e2eRunnerDefaults(), … })` so an app's own value wins.
 *   Do not re-add `workers`/`fullyParallel`/`retries`/`maxFailures` per app —
 *   that is how 150 template configs stopped receiving the shared settings.
 *   - `workers: '50%'`, `fullyParallel: true` on a real browser (each worker
 *     has its own browser against the same dev server; on an 8-vCPU sandbox 12
 *     passing tests went 7.6 s on 1 worker → 1.6 s on 4). Over the preview there
 *     is one page, so 1 worker, not fully parallel.
 *   - `retries: 0` in a sandbox — the run is the executor's feedback loop and a
 *     retry only replays the same failure and multiplies the run time. 2 under
 *     CI, 1 on your machine.
 *   - `maxFailures: 8` in a sandbox — a run failing everywhere (usually specs
 *     aimed at the wrong server or base path) stops early and still reports the
 *     failures it hit: 24 failing tests took 73.8 s uncapped → 23.7 s capped, and
 *     one uncapped run with 21 failures took 534 s. No cap elsewhere.
 *   - `timeout: 30_000` per test in a sandbox (video and traces are off there,
 *     so a healthy test is well under it), `60_000` elsewhere. A test that
 *     genuinely runs long says so itself (`test.slow()` / `test.setTimeout()`);
 *     an app-wide `timeout` after the spread also overrides the sandbox value.
 * - `@playwright/test` is a peer dependency for its types only; it never
 *   downloads browsers on install.
 *
 * @module
 */

export * from './errors.js'
export * from './provider.js'
export * from './runner.js'
export * from './types.js'
