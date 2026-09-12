/**
 * E2E bond that opens real Playwright browsers. Inside a molecule sandbox the
 * same specs drive the live preview through `@molecule/app-e2e-preview`; on
 * your own machine and in CI this bond gives them Chromium, Firefox or WebKit
 * with everything Playwright offers — screenshots, traces, videos, network
 * interception.
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
 * - Browsers are installed once with `npx playwright install chromium`
 *   (`@playwright/test` never downloads them on `npm install`). The launch
 *   error says so when they are missing.
 * - `MOL_E2E_BROWSER=firefox|webkit` picks the engine; `MOL_E2E_HEADED=1`
 *   shows the window.
 * - Do not use this bond inside a molecule sandbox: there is no browser there
 *   by design, and the preview bond is the one that works.
 *
 * @module
 */

export { connectPlaywright, provider } from './provider.js'
export * from './types.js'
