/**
 * Playwright's `test`, with the `page` fixture supplied by the bonded e2e
 * provider when this environment should not launch a browser, and the
 * console-error guard attached to every test.
 *
 * @module
 */

import {
  type Page,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
  test as base,
  type TestType,
} from '@playwright/test'

import {
  type E2EProvider,
  hasProvider,
  requireProvider,
  resolveE2EProviderName,
  setProvider,
} from '@molecule/app-e2e'

import { type ConsoleGuardFixtures, withConsoleGuard } from './console-guard.js'

/** The provider name this process resolved at import time (see `resolveE2EProviderName`). */
export const e2eProviderName = resolveE2EProviderName()

/**
 * A spec that imports neither `./bonds.js` nor `_helpers.ts` still needs a
 * provider: bond the package named after the resolved provider
 * (`@molecule/app-e2e-<name>`) when it is installed — the scaffolded
 * `e2e/bonds.ts` remains the explicit, overridable wiring.
 */
const bondByName = async (name: string): Promise<void> => {
  if (hasProvider()) return
  const specifier = `@molecule/app-e2e-${name}`
  try {
    const mod = (await import(specifier)) as { provider?: E2EProvider }
    if (mod.provider) setProvider(mod.provider)
  } catch (_error) {
    // The bond package is not installed: requireProvider() below explains what to do.
  }
}

/** Playwright's `test` as-is, or one whose `page` comes from the bonded provider. */
const providerAware: TestType<
  PlaywrightTestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> =
  e2eProviderName === 'playwright'
    ? base
    : base.extend<{ page: Page }>({
        page: async ({ baseURL, viewport, actionTimeout, navigationTimeout }, use, testInfo) => {
          await bondByName(e2eProviderName)
          const provider = requireProvider()
          const page = await provider.connect({
            baseURL: baseURL ?? undefined,
            viewport: viewport ?? null,
            timeout: actionTimeout || 10_000,
            navigationTimeout: navigationTimeout || 15_000,
            ...(testInfo.project.use.testIdAttribute
              ? { testIdAttribute: testInfo.project.use.testIdAttribute }
              : {}),
          })
          try {
            await use(page)
          } finally {
            await page.close().catch((_error) => {
              // The page (or its tab) is already gone; nothing left to release.
            })
          }
        },
      })

/**
 * rrweb DOM-mutation recording — captures the page's DOM as a compact
 * event stream (a few KB of JSON) alongside the video recording. The
 * replay viewer's "DOM replay" toggle replays these events through the
 * rrweb player, enabling programmatic DOM inspection that video cannot
 * provide.
 *
 * Only injected when the `playwright` provider is active (a real browser
 * is driving the page); the preview provider does not support
 * `addInitScript` and rrweb is a bonus, not a requirement.
 *
 * Events are extracted in `afterEach` and saved as `rrweb-events.json`
 * in the test's output dir, next to the video.
 */
/**
 * rrweb DOM-mutation recording — OPT-IN via `MOL_E2E_RRWEB=1`.
 *
 * Captures the page's DOM as an event stream saved next to the video for the
 * replay viewer's DOM-replay toggle. Off by default because it (a) loads
 * rrweb from unpkg — unreachable in sandboxed egress and blocked by the CSP
 * that billing/pricing pages ship (each blocked load logs a console.error
 * that fails console-guarded tests fleet-wide), and (b) ran its loader in the
 * init phase where `document.head` can be null. Videos record either way.
 */
const RRWEB_INIT = `
  window.__rrwebEvents = [];
  (function() {
    var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!document.head || (meta && meta.content.indexOf('script-src') !== -1 && meta.content.indexOf('unpkg.com') === -1)) return;
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/rrweb@2.0.0-alpha.4/dist/rrweb-all.js';
    s.onload = function() {
      rrweb.record({ emit: function(e) { window.__rrwebEvents.push(e); } });
    };
    document.head.appendChild(s);
  })();
`

const withRrwebRecording: TestType<
  PlaywrightTestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> =
  e2eProviderName === 'playwright'
    ? providerAware.extend<{ page: Page }>({
        page: async ({ page }, use, testInfo) => {
          if (process.env.MOL_E2E_RRWEB === '1') await page.addInitScript(RRWEB_INIT)
          await use(page)
          try {
            const events = (await page.evaluate(
              () => (window as unknown as { __rrwebEvents?: unknown[] }).__rrwebEvents,
            )) as unknown[]
            if (Array.isArray(events) && events.length > 0) {
              const fs = await import('node:fs')
              const { join } = await import('node:path')
              const filePath = join(testInfo.outputDir, 'rrweb-events.json')
              fs.writeFileSync(filePath, JSON.stringify(events))
              // Push as a Playwright attachment so the replay reporter
              // can copy it to the chapter dir alongside the video.
              testInfo.attachments.push({
                name: 'rrweb-events',
                path: filePath,
                contentType: 'application/json',
              })
            }
          } catch (_error) {
            // rrweb events are a bonus — never fail the test for them (intentional noop).
          }
        },
      })
    : providerAware

/**
 * Drop-in for `import { test } from '@playwright/test'`.
 *
 * With the `playwright` provider this IS Playwright's `test` — real browsers,
 * traces, videos, every fixture untouched. With any other provider (the live
 * preview inside a molecule sandbox) the `page` fixture comes from the bonded
 * provider's `connect()`, honouring the project's `baseURL`, `viewport`,
 * `actionTimeout` and `navigationTimeout` options, and no browser is launched.
 * Either way the console-error guard is attached to every test.
 */
export const test: TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & ConsoleGuardFixtures,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> = withConsoleGuard(withRrwebRecording)
