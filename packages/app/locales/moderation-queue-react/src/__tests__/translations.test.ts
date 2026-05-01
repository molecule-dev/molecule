/**
 * Locale-bond smoke tests — every language exposes every key with a
 * non-empty string. Stub-language translations are allowed to equal the
 * English string verbatim, but they must exist.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import * as locales from '../index.js'
import type { ModerationQueueTranslationKey, ModerationQueueTranslations } from '../types.js'

const REQUIRED_KEYS: ModerationQueueTranslationKey[] = [
  'moderationQueue.aria.region',
  'moderationQueue.aria.bulkToolbar',
  'moderationQueue.aria.selectAll',
  'moderationQueue.aria.selectRow',
  'moderationQueue.aria.approve',
  'moderationQueue.aria.reject',
  'moderationQueue.aria.escalate',
  'moderationQueue.aria.mute',
  'moderationQueue.loading',
  'moderationQueue.empty',
  'moderationQueue.selectAll',
  'moderationQueue.selectedCount',
  'moderationQueue.reportedBy',
  'moderationQueue.reason',
  'moderationQueue.action.approve',
  'moderationQueue.action.reject',
  'moderationQueue.action.escalate',
  'moderationQueue.action.mute',
  'moderationQueue.bulk.approve',
  'moderationQueue.bulk.reject',
  'moderationQueue.bulk.escalate',
  'moderationQueue.bulk.mute',
  'moderationQueue.kind.post',
  'moderationQueue.kind.comment',
  'moderationQueue.kind.image',
  'moderationQueue.kind.message',
  'moderationQueue.kind.profile',
  'moderationQueue.severity.low',
  'moderationQueue.severity.medium',
  'moderationQueue.severity.high',
]

const localeTables = Object.entries(locales).filter(
  (entry): entry is [string, ModerationQueueTranslations] =>
    entry[1] !== null && typeof entry[1] === 'object',
)

describe('moderation-queue locale bond', () => {
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
