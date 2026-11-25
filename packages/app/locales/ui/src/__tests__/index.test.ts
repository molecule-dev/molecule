import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { UiTranslations } from '../types.js'

const reference = locales.en as UiTranslations
const REQUIRED_KEYS = Object.keys(reference) as (keyof UiTranslations)[]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, UiTranslations] => entry[1] !== null && typeof entry[1] === 'object',
)

describe('ui locale bond', () => {
  it('exports at least 79 language tables (en + 78 stubs)', () => {
    expect(localeTables.length).toBeGreaterThanOrEqual(79)
  })

  it('the en reference table defines at least one key', () => {
    expect(REQUIRED_KEYS.length).toBeGreaterThan(0)
  })

  it('provides localized drag controls with the item, destination and position placeholders', () => {
    expect(locales.fr).toMatchObject({
      'ui.dragDrop.moveItem': 'Déplacer {{item}}',
      'ui.dragDrop.moveItemTo': 'Déplacer {{item}} vers {{destination}}',
      'ui.dragDrop.cancelMove': 'Annuler le déplacement',
      'ui.dragDrop.moveAtPosition': '{{action}}, {{position}}',
    })
  })

  it.each(localeTables)('locale "%s" supplies every key en defines', (code, table) => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof table[key], `${code} missing ${String(key)}`).toBe('string')
      expect((table[key] as string).length, `${code} empty ${String(key)}`).toBeGreaterThan(0)
    }
  })
})
