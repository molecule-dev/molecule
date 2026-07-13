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
 * inside the test body BEFORE the error fires. The `description` is
 * matched against the error text as a regular expression; if it is not
 * a valid regex it is matched as a plain substring instead (so literal
 * error text with `[`/`(` can be pasted verbatim). An annotation with
 * no description allows every error — always provide one.
 *
 * A small, fixed set of browser-noise patterns are ALWAYS ignored regardless
 * of `allow-console-error` (Vite HMR reconnect chatter, service-worker 404s
 * in headless Chrome, and a real Chrome DevTools "failed to load SourceMap"
 * message for any `https://`-hosted bundle — e.g. Stripe/Google Maps CDN
 * scripts shipped without source maps). That last pattern is verified
 * against the actual Chrome message text and constrained to `https://` so it
 * can never silence a genuinely broken source map in the app's OWN bundle
 * (served over plain `http://localhost` in dev/preview).
 *
 * @example
 * ```ts
 * // In fleet apps, the per-app `./_helpers.ts` re-exports these:
 * import { test, expect } from '@molecule/app-e2e-fixtures-default'
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
  // Chrome DevTools' own probe for source maps on third-party CDN bundles
  // we don't ship maps for (Stripe, Google Maps, etc). Two bugs fixed here,
  // both verified against a headless Chromium probe + the real reported
  // message text (not guessed): (1) the verb was wrong — real Chrome output
  // is "DevTools failed to load SourceMap: Could not load content for
  // <url>: ...", not "failed to fetch source map", so the old pattern never
  // matched real Chrome text at all; (2) the host check (`.cdn.`) doesn't
  // match real vendor hosts (js.stripe.com, maps.googleapis.com contain no
  // '.cdn.' substring). Now matches any `https://`-hosted source map
  // (third-party CDN bundles are always TLS; the app's own dev/preview
  // server is plain `http://localhost`, so same-origin source-map issues
  // are never accidentally silenced by this pattern).
  // NOTE (verified, not assumed): a probe with a broken `sourceMappingURL`
  // produced ZERO console messages via `page.on('console')` under plain
  // Playwright automation (with and without tracing) — Chrome only fetches
  // source maps when a DevTools Sources panel is actually attached, which a
  // headless Playwright run never does. So this entry currently matches
  // nothing observed in practice; it is defense-in-depth against a future
  // Chrome/Playwright behavior change, not an active filter today.
  /devtools failed to load source ?map.*https:\/\//i,
]

/**
 * Custom Playwright `test` with an auto-attached browser console-error
 * guard. Drop-in replacement for `import { test } from '@playwright/test'`.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use, testInfo) => {
      const buffer: ConsoleErrorEntry[] = []

      // Each allow-console-error description is tried as a regex; an invalid
      // pattern (e.g. verbatim error text containing `[` or `(`) falls back to
      // plain substring matching instead of throwing from inside the guard.
      const matchesAllowed = (text: string, description: string | undefined): boolean => {
        if (description === undefined) return true // no description = allow everything
        try {
          return new RegExp(description).test(text)
        } catch (_error) {
          // Invalid regex — treat the description as a literal substring.
          return text.includes(description)
        }
      }

      const shouldIgnore = (text: string): boolean => {
        if (ALWAYS_IGNORE.some((re) => re.test(text))) return true
        return testInfo.annotations
          .filter((a) => a.type === 'allow-console-error')
          .some((a) => matchesAllowed(text, a.description))
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
