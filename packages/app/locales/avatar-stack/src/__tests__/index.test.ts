import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { AvatarStackTranslations } from '../types.js'

/** The keys the English table defines, in its order: the contract every language mirrors. */
const REQUIRED_KEYS = Object.keys(locales.en)

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, AvatarStackTranslations] =>
    entry[1] !== null && typeof entry[1] === 'object',
)

describe('avatar-stack-react locale bond', () => {
  it('exports at least 79 language tables (en + 78 translations)', () => {
    expect(localeTables.length).toBeGreaterThanOrEqual(79)
  })

  it('the en reference table defines the two avatar-stack keys, in order', () => {
    expect(REQUIRED_KEYS).toEqual(['avatarStack.more', 'avatarStack.overflowPrefix'])
  })

  it.each(localeTables)('locale "%s" supplies every key en defines', (code, table) => {
    expect(Object.keys(table), `${code} key set`).toEqual(REQUIRED_KEYS)
    for (const [key, value] of Object.entries(table)) {
      expect(typeof value, `${code} missing ${key}`).toBe('string')
      expect(String(value).length, `${code} empty ${key}`).toBeGreaterThan(0)
    }
    // `{{count}}` names the value the overflow label interpolates: the same in every language.
    expect(table['avatarStack.more'], `${code} keeps {{count}}`).toContain('{{count}}')
    expect(table['avatarStack.more'], `${code} keeps the overflow marker`).toMatch(/^\+/)
  })
})
