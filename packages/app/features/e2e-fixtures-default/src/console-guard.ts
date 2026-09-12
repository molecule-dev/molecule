/**
 * The console-error guard fixture: every test subscribes to the page's
 * `pageerror` and `console.error` events and fails at teardown if any were
 * seen. It works over both bonds — the preview client forwards console output
 * and errors, so the guard sees the same events a real browser emits.
 *
 * @module
 */

import type {
  ConsoleMessage,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType,
} from '@playwright/test'

type BaseTest = TestType<
  PlaywrightTestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
>

/** One captured browser error. */
export interface ConsoleErrorEntry {
  type: 'pageerror' | 'console.error'
  text: string
  location?: string
}

/**
 * Substrings that are always ignored — browser noise that doesn't reflect app
 * bugs.
 */
export const ALWAYS_IGNORE: readonly RegExp[] = [
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

/** The fixture object `withConsoleGuard` adds to a test. */
export interface ConsoleGuardFixtures {
  consoleGuard: void
}

/**
 * Extend a Playwright `test` with the auto-attached console-error guard.
 *
 * To intentionally let a known error through (rare — almost always a smell
 * that should be fixed in the app), use
 * `test.info().annotations.push({ type: 'allow-console-error', description: 'why' })`
 * inside the test body BEFORE the error fires. The `description` is matched
 * against the error text as a regular expression; if it is not a valid regex
 * it is matched as a plain substring instead. An annotation with no
 * description allows every error — always provide one.
 */
export const withConsoleGuard = (
  base: BaseTest,
): TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & ConsoleGuardFixtures,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> =>
  base.extend<ConsoleGuardFixtures>({
    consoleGuard: [
      async ({ page }, use, testInfo) => {
        const buffer: ConsoleErrorEntry[] = []

        const matchesAllowed = (text: string, description: string | undefined): boolean => {
          if (description === undefined) return true // no description = allow everything
          try {
            return new RegExp(description).test(text)
          } catch (_error) {
            // Not a valid regex: the annotation holds literal error text — match it as a substring.
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
