/**
 * Content moderation provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  isBonded,
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { ContentModerationProvider } from './types.js'

const BOND_TYPE = 'content-moderation'
expectBond(BOND_TYPE)

/**
 * Registers a content moderation provider.
 *
 * @param provider - The content moderation provider to bond.
 */
export function setProvider(provider: ContentModerationProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded content moderation provider, or `null` if none is bonded.
 *
 * @returns The bonded provider, or `null`.
 */
export function getProvider(): ContentModerationProvider | null {
  return bondGet<ContentModerationProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a content moderation provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded content moderation provider, throwing if none is bonded.
 * Use this when moderation functionality is required.
 *
 * @returns The bonded content moderation provider.
 */
export function requireProvider(): ContentModerationProvider {
  try {
    return bondRequire<ContentModerationProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('contentModeration.error.noProvider', undefined, {
        defaultValue:
          'Content moderation provider not configured. Bond a content-moderation provider first.',
      }),
    )
  }
}
