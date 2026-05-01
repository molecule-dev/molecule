/**
 * Locale-bond smoke tests — every language exposes every key with a
 * non-empty string. Stub-language translations are allowed to equal the
 * English string verbatim, but they must exist.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { AuthorBioCardTranslationKey, AuthorBioCardTranslations } from '../types.js'

const REQUIRED_KEYS: AuthorBioCardTranslationKey[] = [
  'authorBioCard.follow',
  'authorBioCard.following',
  'authorBioCard.social.twitter.label',
  'authorBioCard.social.github.label',
  'authorBioCard.social.linkedin.label',
  'authorBioCard.social.mastodon.label',
  'authorBioCard.social.website.label',
  'authorBioCard.social.twitter',
  'authorBioCard.social.github',
  'authorBioCard.social.linkedin',
  'authorBioCard.social.mastodon',
  'authorBioCard.social.website',
]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, AuthorBioCardTranslations] =>
    entry[1] !== null && typeof entry[1] === 'object',
)

describe('author-bio-card locale bond', () => {
  it('exports at least 79 language tables (en + 78 stubs)', () => {
    expect(localeTables.length).toBeGreaterThanOrEqual(79)
  })

  it.each(localeTables)('locale "%s" supplies every required key', (_code, table) => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof table[key]).toBe('string')
      expect((table[key] as string).length).toBeGreaterThan(0)
    }
  })
})
