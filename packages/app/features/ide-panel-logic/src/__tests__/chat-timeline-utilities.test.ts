import { describe, expect, it } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'

import {
  cardCoveredByLimit,
  commitCardVisible,
  persistedCommitHashes,
  upgradeContextFromError,
} from '../components/chat-timeline-utilities.js'

/** Build a chat message, with only the fields a case needs. */
const message = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  role: 'assistant',
  timestamp: 1,
  content: '',
  ...over,
})

/** A commit card's hash, as the timeline's filter reads it. */
const commit = (hash?: string): { hash?: string } => ({ hash })

describe('cardCoveredByLimit', () => {
  it('returns false with no live limit', () => {
    expect(cardCoveredByLimit({ coversLimitType: 'ai_cost' }, undefined)).toBe(false)
  })

  it('returns false for an empty live limit string', () => {
    expect(cardCoveredByLimit({ coversLimitType: '' }, '')).toBe(false)
  })

  it('returns true when the plain card covers the live limit', () => {
    expect(cardCoveredByLimit({ coversLimitType: 'ai_cost' }, 'ai_cost')).toBe(true)
  })

  it('returns false when the card covers a different limit', () => {
    expect(cardCoveredByLimit({ coversLimitType: 'usage_balance' }, 'ai_cost')).toBe(false)
  })

  it('returns false for a plain card that covers no limit', () => {
    expect(cardCoveredByLimit({}, 'ai_cost')).toBe(false)
  })

  it('returns false for a help card that names the live limit', () => {
    expect(cardCoveredByLimit({ variant: 'help', coversLimitType: 'ai_cost' }, 'ai_cost')).toBe(
      false,
    )
  })

  it('returns false for a loaded-skills card that names the live limit', () => {
    expect(
      cardCoveredByLimit({ variant: 'skillsLoaded', coversLimitType: 'ai_cost' }, 'ai_cost'),
    ).toBe(false)
  })
})

describe('persistedCommitHashes', () => {
  it('returns an empty set when no message carries a commit record', () => {
    expect(persistedCommitHashes([message(), message({ id: 'm2' })])).toEqual(new Set())
  })

  it('returns an empty set for an empty transcript', () => {
    expect(persistedCommitHashes([])).toEqual(new Set())
  })

  it('collects the hash of every commit record', () => {
    const messages = [
      message({ commitRecord: { hash: 'abc123', message: 'feat: one', files: [] } }),
      message({ id: 'm2', commitRecord: { hash: 'def456', message: 'fix: two', files: [] } }),
    ]
    expect(persistedCommitHashes(messages)).toEqual(new Set(['abc123', 'def456']))
  })

  it('dedupes a hash carried by more than one message', () => {
    const messages = [
      message({ commitRecord: { hash: 'abc123', message: 'feat: one', files: [] } }),
      message({ id: 'm2', commitRecord: { hash: 'abc123', message: 'feat: one', files: [] } }),
    ]
    expect(persistedCommitHashes(messages)).toEqual(new Set(['abc123']))
  })

  it('skips a commit record with no hash', () => {
    const messages = [message({ commitRecord: { message: 'no hash yet', files: [] } })]
    expect(persistedCommitHashes(messages)).toEqual(new Set())
  })
})

describe('commitCardVisible', () => {
  it('returns true for a card whose commit is still running (no hash)', () => {
    expect(commitCardVisible(commit(), new Set(['abc123']))).toBe(true)
  })

  it('returns true when the hash is not in the persisted transcript', () => {
    expect(commitCardVisible(commit('abc123'), new Set(['def456']))).toBe(true)
  })

  it('returns false when the persisted transcript already shows the commit', () => {
    expect(commitCardVisible(commit('abc123'), new Set(['abc123']))).toBe(false)
  })

  it('returns true against an empty persisted set', () => {
    expect(commitCardVisible(commit('abc123'), new Set())).toBe(true)
  })

  it('returns true for an empty-string hash (not persisted)', () => {
    expect(commitCardVisible(commit(''), new Set(['abc123']))).toBe(true)
  })
})

describe('upgradeContextFromError', () => {
  it('forwards every field the backend sent', () => {
    expect(
      upgradeContextFromError({
        requiresSignup: true,
        limitType: 'usage_balance',
        billingAction: 'add_funds',
        upgradeTier: 'pro',
      }),
    ).toStrictEqual({
      requiresSignup: true,
      limitType: 'usage_balance',
      billingAction: 'add_funds',
      upgradeTier: 'pro',
    })
  })

  it('forwards an explicit null upgrade tier', () => {
    expect(upgradeContextFromError({ limitType: 'spend_cap', upgradeTier: null })).toStrictEqual({
      requiresSignup: undefined,
      limitType: 'spend_cap',
      billingAction: undefined,
      upgradeTier: null,
    })
  })

  it('returns every key as undefined for null metadata', () => {
    expect(upgradeContextFromError(null)).toStrictEqual({
      requiresSignup: undefined,
      limitType: undefined,
      billingAction: undefined,
      upgradeTier: undefined,
    })
  })
})
