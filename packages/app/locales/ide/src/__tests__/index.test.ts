import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { IdeTranslations } from '../types.js'

const reference = locales.en as IdeTranslations
const REQUIRED_KEYS = Object.keys(reference) as (keyof IdeTranslations)[]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, IdeTranslations] => entry[1] !== null && typeof entry[1] === 'object',
)

// SYN12 — the auto-tip strings must live in the bond (not English-only inline).
// getStarted is the onboarding entry tip; the rest rotate while idle.
const TIP_KEYS = [
  'ide.chat.tip.getStarted',
  'ide.chat.tip.mention',
  'ide.chat.tip.slash',
  'ide.chat.tip.plan',
  'ide.chat.tip.undo',
  'ide.chat.tip.compact',
  'ide.chat.tip.commit',
  'ide.chat.tip.report',
] as const
// The tips that personalise with the host agent identity, so the {{agentName}}
// interpolation token MUST survive translation intact (a real bug: the bulk
// translator once left it masked/translated, breaking interpolation).
const AGENT_NAME_TIP_KEYS = new Set([
  'ide.chat.tip.getStarted',
  'ide.chat.tip.mention',
  'ide.chat.tip.plan',
])

describe('ide locale bond', () => {
  it('exports at least 79 language tables (en + 78 stubs)', () => {
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

  it('the en reference defines every SYN12 auto-tip string', () => {
    for (const key of TIP_KEYS) {
      expect(typeof reference[key as keyof IdeTranslations], `en missing ${key}`).toBe('string')
    }
  })

  it.each(localeTables)(
    'locale "%s" translates every auto-tip with intact placeholders',
    (code, table) => {
      for (const key of TIP_KEYS) {
        const value = table[key as keyof IdeTranslations] as string | undefined
        expect(typeof value, `${code} missing ${key}`).toBe('string')
        expect((value as string).length, `${code} empty ${key}`).toBeGreaterThan(0)
        // No leftover masking tags from the translation pipeline.
        expect(value, `${code} ${key} has leftover <x> mask`).not.toContain('<x>')
        if (AGENT_NAME_TIP_KEYS.has(key)) {
          // The exact interpolation token must survive (not translated/spaced).
          expect(value, `${code} ${key} lost {{agentName}}`).toContain('{{agentName}}')
        } else {
          expect(value, `${code} ${key} grew a stray placeholder`).not.toContain('{{')
        }
      }
    },
  )
})
