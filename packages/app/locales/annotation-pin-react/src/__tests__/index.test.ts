/**
 * Locale-bond smoke tests — every language exposes every key with a
 * non-empty string. Stub-language translations may equal the English
 * string verbatim, but they must exist.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { AnnotationPinTranslationKey, AnnotationPinTranslations } from '../types.js'

const REQUIRED_KEYS: AnnotationPinTranslationKey[] = [
  'annotationPin.aria.layer',
  'annotationPin.aria.marker',
  'annotationPin.aria.popup',
  'annotationPin.empty',
]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, AnnotationPinTranslations] =>
    entry[1] !== null && typeof entry[1] === 'object',
)

describe('annotation-pin locale bond', () => {
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
