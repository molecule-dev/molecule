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

import type { ContentClassifierProvider, ContentModerationProvider } from './types.js'

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
  } catch (error) {
    throw new Error(
      t('contentModeration.error.noProvider', undefined, {
        defaultValue:
          'Content moderation provider not configured. Bond a content-moderation provider first.',
      }),
      { cause: error },
    )
  }
}

// ---------------------------------------------------------------------------
// Classifier — bonded separately from the full moderation provider.
// Deliberately NOT expectBond()-ed: an app that only uses the full provider
// (or no classifier) must still pass validateBonds().
// ---------------------------------------------------------------------------

const CLASSIFIER_BOND_TYPE = 'content-classifier'

/**
 * Registers a content classifier (text/image scoring only, no reports).
 *
 * @param classifier - The classifier to bond.
 */
export function setClassifier(classifier: ContentClassifierProvider): void {
  bond(CLASSIFIER_BOND_TYPE, classifier)
}

/**
 * Retrieves the bonded content classifier, or `null` if none is bonded.
 *
 * @returns The bonded classifier, or `null`.
 */
export function getClassifier(): ContentClassifierProvider | null {
  return bondGet<ContentClassifierProvider>(CLASSIFIER_BOND_TYPE) ?? null
}

/**
 * Checks whether a content classifier is currently bonded.
 *
 * @returns `true` if a classifier is bonded.
 */
export function hasClassifier(): boolean {
  return isBonded(CLASSIFIER_BOND_TYPE)
}

/**
 * Retrieves the bonded content classifier, throwing if none is bonded.
 *
 * @returns The bonded content classifier.
 */
export function requireClassifier(): ContentClassifierProvider {
  try {
    return bondRequire<ContentClassifierProvider>(CLASSIFIER_BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('contentModeration.error.noClassifier', undefined, {
        defaultValue:
          'Content classifier not configured. Bond one with setClassifier() (e.g. @molecule/api-content-moderation-openai).',
      }),
      { cause: error },
    )
  }
}
