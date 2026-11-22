import { describe, expect, it } from 'vitest'

import type { ContextComposition, ContextUsage } from '@molecule/app-ai-chat'

import { mergeContextHistory } from '../components/context-usage-utilities.js'

const composition: ContextComposition = {
  version: 1,
  basis: 'core-provider-context-json',
  percentBasis: 'estimated-known-tokens',
  categories: [],
  totalChars: 4800,
  totalBytes: 4800,
  estimatedChars: 4800,
  estimatedTokens: 1200,
  charsPerToken: 4,
  actualInputTokens: 1250,
  unknownTokenItems: 0,
  serializationFailures: 0,
}

/**
 * A usage sample.
 *
 * @param fields - The fields that differ from the default sample.
 * @returns The sample.
 */
const sample = (fields: Partial<ContextUsage>): ContextUsage => ({
  inputTokens: 1250,
  contextWindow: 200_000,
  at: '2026-11-20T00:00:00.000Z',
  composition,
  ...fields,
})

describe('mergeContextHistory', () => {
  it('replaces an estimate with the final usage of the same request', () => {
    const estimate = sample({
      requestId: 'r1',
      composition: { ...composition, actualInputTokens: null },
    })
    const final = sample({ requestId: 'r1' })
    expect(mergeContextHistory([estimate], [final])).toEqual([final])
  })

  it('keeps provider-reported usage when an estimate of the same request arrives later', () => {
    const estimate = sample({
      requestId: 'r1',
      composition: { ...composition, actualInputTokens: null },
    })
    const final = sample({ requestId: 'r1' })
    expect(mergeContextHistory([final], [estimate])).toEqual([final])
  })

  it('keys a sample without a request id by its time, and drops one with neither', () => {
    const timed = sample({ requestId: undefined, at: '2026-11-20T00:00:01.000Z' })
    const later = sample({ requestId: undefined, at: '2026-11-20T00:00:01.000Z', inputTokens: 9 })
    const neither = sample({ requestId: undefined, at: undefined })
    expect(mergeContextHistory([timed, neither], [later])).toEqual([later])
  })

  it('sorts by time and bounds the history to the first sample and the newest 127', () => {
    const samples = Array.from({ length: 150 }, (_, index) =>
      sample({ requestId: String(149 - index), at: new Date((149 - index) * 1000).toISOString() }),
    )
    const merged = mergeContextHistory(samples, [])
    expect(merged).toHaveLength(128)
    expect(merged.map((usage) => usage.requestId).slice(0, 3)).toEqual(['0', '23', '24'])
    expect(merged.at(-1)?.requestId).toBe('149')
  })
})
