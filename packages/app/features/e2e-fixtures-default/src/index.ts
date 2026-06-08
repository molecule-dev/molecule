/**
 * Shared Playwright `test` + `expect` with auto-attached browser
 * console-error / pageerror guard.
 *
 * Every fleet app's e2e specs import `test` and `expect` from this
 * module (re-exported through their per-app `_helpers.ts`) instead of
 * `@playwright/test` directly. The custom `test` includes a
 * `consoleGuard` fixture with `{ auto: true }`, so every test
 * automatically subscribes to the browser's `pageerror` event and
 * `console.error` messages, then asserts the buffer is empty at test
 * teardown.
 *
 * This catches the failure mode where React (or any other client-side
 * module) throws on mount but the spec only asserts against
 * `page.request.get/post`, leaving the test green while the rendered
 * page is blank. A single quill-delta ESM/CJS interop error sat for
 * four days like this before we noticed — the replay videos were
 * 17 KB of nothing and the JSON reported PASS.
 *
 * To intentionally let a known error through (rare — almost always a
 * smell that should be fixed in the app), use
 * `test.info().annotations.push({ type: 'allow-console-error', description: 'why' })`
 * inside the test body BEFORE the error fires. The fixture ignores
 * substring matches from those annotations.
 *
 * @example
 * ```ts
 * import { test, expect } from './_helpers.js'   // re-exports from here
 *
 * test('login lands on dashboard', async ({ page }) => {
 *   await page.goto('/login')
 *   await page.getByLabel(/email/i).fill('user@example.com')
 *   // ...
 * })
 * ```
 *
 * @module
 */

import { type ConsoleMessage, expect, test as base } from '@playwright/test'

interface ConsoleErrorEntry {
  type: 'pageerror' | 'console.error'
  text: string
  location?: string
}

/** Substrings that are always ignored — browser noise that doesn't reflect app bugs. */
const ALWAYS_IGNORE: readonly RegExp[] = [
  // Vite HMR dev-only websocket reconnect warnings — happen on the
  // test runner's first poll before vite is fully booted; harmless.
  /\[vite\].*connecting/i,
  /\[vite\].*server connection lost/i,
  // Service worker registration failures in headless Chrome — VitePWA
  // tries to register at /sw.js but our smoke build emits to /workbox-*
  // and Playwright fixtures the user-agent. Cosmetic.
  /service worker.*404/i,
  // Chrome devtools' own probe for source maps on third-party CDN
  // bundles we don't ship maps for (Stripe, Google Maps).
  /failed to fetch source map.*\.cdn\./i,
]

/**
 * Custom Playwright `test` with an auto-attached browser console-error
 * guard. Drop-in replacement for `import { test } from '@playwright/test'`.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use, testInfo) => {
      const buffer: ConsoleErrorEntry[] = []

      const allowedFromAnnotations = (): RegExp[] =>
        testInfo.annotations
          .filter((a) => a.type === 'allow-console-error')
          .map((a) => new RegExp(a.description ?? '.*'))

      const shouldIgnore = (text: string): boolean => {
        if (ALWAYS_IGNORE.some((re) => re.test(text))) return true
        return allowedFromAnnotations().some((re) => re.test(text))
      }

      const onPageError = (err: Error): void => {
        const text = err.message || String(err)
        if (shouldIgnore(text)) return
        buffer.push({ type: 'pageerror', text })
      }
      const onConsole = (msg: ConsoleMessage): void => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (shouldIgnore(text)) return
        const loc = msg.location()
        buffer.push({
          type: 'console.error',
          text,
          location: loc?.url ? `${loc.url}:${loc.lineNumber}` : undefined,
        })
      }

      page.on('pageerror', onPageError)
      page.on('console', onConsole)

      try {
        await use()
      } finally {
        page.off('pageerror', onPageError)
        page.off('console', onConsole)
      }

      if (buffer.length > 0) {
        const lines = buffer
          .map((e) => `  - [${e.type}] ${e.text}${e.location ? `  (${e.location})` : ''}`)
          .join('\n')
        throw new Error(
          `Browser console error(s) during test (${buffer.length}):\n${lines}\n\n` +
            `If this error is genuinely expected, add\n` +
            `  test.info().annotations.push({ type: 'allow-console-error', description: '<regex>' })\n` +
            `to the test body BEFORE the error fires.`,
        )
      }
    },
    { auto: true },
  ],
})

export { expect }
export type { ConsoleErrorEntry }
