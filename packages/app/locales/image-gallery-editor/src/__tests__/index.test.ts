import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { ImageGalleryEditorTranslations } from '../types.js'

const reference = locales.en as ImageGalleryEditorTranslations
const REQUIRED_KEYS = Object.keys(reference) as (keyof ImageGalleryEditorTranslations)[]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, ImageGalleryEditorTranslations] =>
    entry[1] !== null && typeof entry[1] === 'object',
)

describe('image-gallery-editor locale bond', () => {
  it('exports en plus 78 translated language tables', () => {
    expect(localeTables.length).toBeGreaterThanOrEqual(79)
  })

  it('the en reference table defines at least one key', () => {
    expect(REQUIRED_KEYS.length).toBeGreaterThan(0)
  })

  it.each(localeTables)('locale "%s" supplies every key en defines', (code, table) => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof table[key], `${code} missing ${String(key)}`).toBe('string')
      expect((table[key] as string).length, `${code} empty ${String(key)}`).toBeGreaterThan(0)
    }
  })
})
