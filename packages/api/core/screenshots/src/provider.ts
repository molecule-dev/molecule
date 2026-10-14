/**
 * Screenshot provider bond accessor and convenience function.
 *
 * Bond packages (e.g. `@molecule/api-screenshots-puppeteer`) call
 * `setProvider()` during setup. Application code uses the `capture`
 * convenience function, which delegates to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CaptureSource, ScreenshotOptions, ScreenshotProvider } from './types.js'

const BOND_TYPE = 'screenshots'
expectBond(BOND_TYPE)

/**
 * Registers a screenshot provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The screenshot provider implementation to bond.
 */
export const setProvider = (provider: ScreenshotProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded screenshot provider, throwing if none is configured.
 *
 * @returns The bonded screenshot provider.
 * @throws {Error} If no screenshot provider has been bonded.
 */
export const getProvider = (): ScreenshotProvider => {
  try {
    return bondRequire<ScreenshotProvider>(BOND_TYPE)
  } catch (_error) {
    throw new Error(
      t('screenshots.error.noProvider', undefined, {
        defaultValue: 'Screenshot provider not configured. Call setProvider() first.',
      }),
      { cause: _error },
    )
  }
}

/**
 * Checks whether a screenshot provider is currently bonded.
 *
 * @returns `true` if a screenshot provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Captures an image of a URL or an HTML string through the bonded provider.
 *
 * @param source - What to capture (URL or HTML — exactly one).
 * @param options - Capture options (viewport, format, scale, …).
 * @returns The image bytes.
 * @throws {Error} If no screenshot provider has been bonded.
 */
export const capture = async (
  source: CaptureSource,
  options?: ScreenshotOptions,
): Promise<Buffer> => {
  return getProvider().capture(source, options)
}
