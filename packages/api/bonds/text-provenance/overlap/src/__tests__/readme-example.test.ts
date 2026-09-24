/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — the provider is pure, no mocks.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import type { AgentSession } from '@molecule/api-agent-transcript'
import { attributeText, setProvider } from '@molecule/api-text-provenance'

import { provider } from '../index.js'

describe('README @example', () => {
  it('marks the assistant-written paragraph ai and the new one human', () => {
    setProvider(provider)

    const sessions: AgentSession[] = [
      {
        format: 'claude-code',
        harness: 'Claude Code',
        model: 'claude-opus-4-5',
        turns: [
          { role: 'user', text: 'Write an intro about tide pools.', files: [] },
          {
            role: 'assistant',
            text: 'Tide pools are rocky hollows that trap seawater when the ocean retreats at low tide.',
            files: [],
          },
        ],
      },
    ]

    const paragraphs = [
      'Tide pools are rocky hollows that trap seawater when the ocean retreats at low tide.',
      'I spent every summer of my childhood poking at anemones on the Oregon coast.',
    ]

    const result = attributeText({ paragraphs, sessions })

    expect(result.paragraphs[0]).toMatchObject({
      origin: 'ai',
      prompt: 'Write an intro about tide pools.',
      model: 'claude-opus-4-5',
      source: { session: 0, turn: 1 },
    })
    expect(result.paragraphs[1]?.origin).toBe('human')
    expect(result.words).toBe(29)
    expect(result.aiShare).toBe(15 / 29)
    expect(result.prompts).toEqual(['Write an intro about tide pools.'])
  })
})
