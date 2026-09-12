/**
 * The e2e bond contract: which browser runs an app's end-to-end specs.
 *
 * A provider opens a Playwright-shaped `Page`. Two bonds exist:
 *
 * - **`@molecule/app-e2e-preview`** drives the LIVE PREVIEW the molecule.dev
 *   IDE is already showing — the page the person is looking at, in their own
 *   browser — over a WebSocket through the dev server. No browser binary in
 *   the sandbox, nothing to download. This is what a molecule sandbox uses.
 * - **`@molecule/app-e2e-playwright`** launches real Playwright browsers. This
 *   is what your own machine and CI use.
 *
 * Specs do not import this package directly: they import `test` and `expect`
 * from `@molecule/app-e2e-fixtures-default` (a drop-in for `@playwright/test`
 * whose `page` fixture comes from the bonded provider) and stay identical in
 * both places. This core holds only the contract and the accessor, plus
 * `resolveE2EProviderName()`, the one rule that decides which bond an
 * environment gets: `MOL_E2E_PROVIDER` when set, otherwise `preview` inside a
 * molecule sandbox (the `/etc/mol/app-root` marker exists) and `playwright`
 * everywhere else.
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
 * - A bond that can only run code INSIDE a page implements {@link E2ETransport}
 *   (`evaluate`, `navigate`, `viewport`, events) and gets the whole
 *   Playwright-shaped page from `createEvaluatePage()` in
 *   `@molecule/app-e2e-fixtures-default`.
 * - `@playwright/test` is a peer dependency for its types only; it never
 *   downloads browsers on install.
 *
 * @module
 */

export * from './errors.js'
export * from './provider.js'
export * from './types.js'
