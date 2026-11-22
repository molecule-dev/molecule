/**
 * Template-shaped sample APIs for the mock server's tests, committed in this package so a test
 * reads nothing outside it (a monorepo checkout has no app templates beside it). Each one keeps a
 * template's layout: `api/fixtures/*.json`, and `api/src/handlers/` where its routes are written.
 *
 * @module
 */
import { join } from 'node:path'

/** The app types with a sample API. */
export type SampleAppType = 'blog' | 'online-store' | 'personal-finance'

/**
 * Locate a sample API. Its handlers directory is always named, so the scanner never falls back
 * to looking for a template by app type.
 *
 * @param appType - Which sample.
 * @returns The fields a mock server config takes for it.
 */
export function sampleApp(appType: SampleAppType): {
  appType: SampleAppType
  fixturesPath: string
  handlersPath: string
} {
  const api = join(import.meta.dirname, 'sample-apps', appType, 'api')
  return {
    appType,
    fixturesPath: join(api, 'fixtures'),
    handlersPath: join(api, 'src', 'handlers'),
  }
}
