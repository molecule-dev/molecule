/**
 * Locale-bond smoke tests — every language exposes every key with a
 * non-empty string.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { MarginNotesTranslationKey, MarginNotesTranslations } from '../types.js'

const REQUIRED_KEYS: MarginNotesTranslationKey[] = [
  'marginNotes.aria.toggles',
  'marginNotes.aria.notes',
  'marginNotes.aria.panel',
  'marginNotes.dismiss',
]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, MarginNotesTranslations] =>
    entry[1] !== null && typeof entry[1] === 'object',
)

describe('margin-notes locale bond', () => {
  it('exports 79 language tables', () => {
    expect(localeTables.length).toBe(79)
  })

  it.each(localeTables)('locale "%s" supplies every required key', (_code, table) => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof table[key]).toBe('string')
      expect((table[key] as string).length).toBeGreaterThan(0)
    }
  })
})
