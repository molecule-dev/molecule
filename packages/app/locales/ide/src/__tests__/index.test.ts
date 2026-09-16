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
// INTERPOLATION TOKENS ARE NOT CHECKED HERE ANY MORE.
//
// This file used to assert, for nine hand-listed keys, that `{{agentName}}` and
// `{{count}}` survived translation and that no `<x>` mask leaked. That caught
// its nine keys and nothing else: when the list was written, 214 OTHER values in
// this same bond — and 344 more across twenty other bonds — were already
// shipping a lost, gained or renamed token. A per-bond list only ever guards
// what someone remembered to add to it.
//
// The invariant now lives in ONE fleet-wide gate covering every bond, every
// language and every key: `scripts/check-locale-placeholders.js` (run by the
// pre-commit hook and by CI, asserted by
// `scripts/__tests__/check-locale-placeholders.test.ts`). Do not re-add a
// scoped copy here.

// The `/test` skip strings (added with the per-test progress + Skip controls).
const SKIP_KEYS = [
  'ide.chat.skipToolCall',
  'ide.chat.skippingToolCall',
  'ide.chat.skipToolCallViewer',
  'ide.toolCall.statusSkipped',
  'ide.tests.skip',
  'ide.tests.skipping',
  'ide.tests.skippedCount',
  'ide.tests.skippedByUser',
  'ide.tests.viewerCannotSkip',
] as const

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

  it.each(localeTables)('locale "%s" translates every skip string', (code, table) => {
    for (const key of SKIP_KEYS) {
      const value = table[key as keyof IdeTranslations] as string | undefined
      expect(typeof value, `${code} missing ${key}`).toBe('string')
      expect((value as string).length, `${code} empty ${key}`).toBeGreaterThan(0)
    }
  })

  it.each(localeTables)('locale "%s" translates every auto-tip', (code, table) => {
    for (const key of TIP_KEYS) {
      const value = table[key as keyof IdeTranslations] as string | undefined
      expect(typeof value, `${code} missing ${key}`).toBe('string')
      expect((value as string).length, `${code} empty ${key}`).toBeGreaterThan(0)
    }
  })
})
