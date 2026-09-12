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
> = withConsoleGuard(providerAware)
