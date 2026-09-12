/**
 * The `@playwright/test` drop-in for molecule apps: Playwright's `test`,
 * `expect` and `page`, with the browser supplied by the bonded e2e provider
 * and a console-error guard on every test.
 *
 * Import `test` and `expect` from here instead of `@playwright/test` and
 * write ordinary Playwright specs. Which browser runs them is the e2e bond
 * (`@molecule/app-e2e`):
 *
 * - **`@molecule/app-e2e-preview`** drives the LIVE PREVIEW the molecule.dev
 *   IDE is already showing — the page the person is looking at, in their own
 *   browser — over a WebSocket through the dev server. No browser binary in
 *   the sandbox, nothing to download. This is what a molecule sandbox uses.
 * - **`@molecule/app-e2e-playwright`** launches real Playwright browsers. This
 *   is what your own machine and CI use.
 *
 * The same spec file runs unchanged in both. The provider is picked by
 * `resolveE2EProviderName()`: `MOL_E2E_PROVIDER` when set, otherwise `preview`
 * inside a molecule sandbox (the `/etc/mol/app-root` marker exists) and
 * `playwright` everywhere else. The scaffolded `e2e/bonds.ts` bonds the
 * matching provider (and `test` bonds it by name as a fallback); `test` reads
 * the same answer to decide whether to launch a browser.
 *
 * Every test also carries the console-error guard: the page's `pageerror`
 * and `console.error` events fail the test at teardown, so a spec that only
 * asserts on `page.request` cannot stay green while the rendered page is
 * blank. Allow a known error with
 * `test.info().annotations.push({ type: 'allow-console-error', description: '<regex>' })`.
 *
 * @example
 * ```ts
 * // e2e/bonds.ts — scaffolded; wires the provider for THIS environment
 * import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
 * import { provider as playwright } from '@molecule/app-e2e-playwright'
 * import { provider as preview } from '@molecule/app-e2e-preview'
 *
 * setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
 *
 * // e2e/post.spec.ts — an ordinary Playwright spec
 * import { expect, test } from '@molecule/app-e2e-fixtures-default'
 *
 * import './bonds.js'
 *
 * test('the phone layout keeps the prose large', async ({ page }) => {
 *   await page.setViewportSize({ width: 390, height: 844 })
 *   await page.goto('/blog/hello/')
 *   const prose = page.locator('article p').first()
 *   const size = await prose.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
 *   expect(size).toBeGreaterThanOrEqual(18)
 *   await expect(page.getByRole('switch', { name: /summar/i })).toBeVisible()
 * })
 * ```
 *
 * @remarks
 * - **What works over the preview** (the `@molecule/app-e2e-preview` bond):
 *   `page.goto/reload/goBack/goForward/url/title/content`,
 *   `page.evaluate/$eval/$$eval`, `page.locator` and every `getBy*` (role
 *   with name/level/checked/pressed/expanded/selected, text, label,
 *   placeholder, title, alt text, test id), `first/last/nth/filter/count/all`,
 *   `click/dblclick/hover/tap/fill/clear/type/press/check/uncheck/setChecked/
 *   selectOption/focus/blur/dispatchEvent/scrollIntoViewIfNeeded`,
 *   `textContent/innerText/innerHTML/inputValue/getAttribute/isVisible/isHidden/
 *   isEnabled/isDisabled/isEditable/isChecked/boundingBox/evaluate/evaluateAll/
 *   waitFor`, `page.setViewportSize/viewportSize`, `page.mouse.*`,
 *   `page.keyboard.*`, `page.request.get/post/put/patch/delete/fetch` (runs
 *   `fetch` inside the page, cookies included), `waitForSelector/waitForURL/
 *   waitForFunction/waitForLoadState/waitForTimeout`, `page.on('console' |
 *   'pageerror' | 'dialog' | 'close')`, and `expect(locator)` with
 *   `toBeVisible/toBeHidden/toBeAttached/toHaveCount/toHaveText/toContainText/
 *   toHaveAttribute/toHaveClass/toContainClass/toHaveCSS/toHaveValue/toHaveId/
 *   toBeChecked/toBeEnabled/toBeDisabled/toBeEditable/toBeEmpty/toBeFocused/
 *   toBeInViewport/toHaveAccessibleName/toHaveRole` (+ `.not`, `expect.soft`,
 *   `expect.configure`), `expect(page).toHaveTitle/toHaveURL`.
 * - **The escape hatch is `page.evaluate()`.** Anything the list above does
 *   not cover — a computed style, a scroll position, `matchMedia`, a
 *   `fetch` — is one `evaluate` away; the function runs inside the real page
 *   and returns JSON.
 * - **Not available over the preview**, and the method THROWS naming the
 *   alternative: screenshots and `toHaveScreenshot` (assert layout with
 *   `boundingBox()` and computed styles instead), `page.route/waitForResponse/
 *   waitForRequest` (read the response with `page.request` or `fetch` in
 *   `evaluate`), element handles (`$`, `$$`, `elementHandle` — use locators),
 *   `setInputFiles`, `dragTo`, iframes inside the preview, `emulateMedia`,
 *   `addInitScript/exposeFunction`, `context.cookies/storageState` (read
 *   `document.cookie`/`localStorage` in `evaluate`). The playwright bond
 *   supports all of them.
 * - **Viewport.** `page.setViewportSize` asks the IDE to resize the preview
 *   frame and throws if the host did not (a preview opened in a plain tab
 *   keeps the tab's width). Test phone layouts at 390×844 this way.
 * - **Events.** `page.on('response')`/`'request'` never fire over the preview
 *   (a one-time warning says so); `'console'` and `'pageerror'` do, so the
 *   console-error guard works there too.
 * - **The person's browser is the renderer.** If every tab showing the
 *   preview is closed or asleep, actions wait for a page to reconnect and
 *   then time out with a message saying so. Keep the IDE tab open (the IDE
 *   holds a screen wake lock while a build runs) or open the preview URL in
 *   any other tab — any connected viewer will do.
 * - `createEvaluatePage()` is how a bond that can only run code inside a page
 *   (an `E2ETransport`) gets the whole Playwright-shaped page; the preview
 *   bond uses it, and so can any future one.
 * - `@playwright/test` is a peer dependency: it supplies the runner
 *   (`npx playwright test`), `expect` for plain values, and the `Page` types.
 *   It never downloads browsers on install; only the playwright bond needs
 *   `npx playwright install`.
 *
 * @module
 */

export * from './console-guard.js'
export * from './expect.js'
export * from './page.js'
export * from './playwright.js'
export * from './runtime.js'
export * from './test.js'
