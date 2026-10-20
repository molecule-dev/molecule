// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ContextComposition, ContextUsage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ContextUsageIndicator, mergeContextHistory } from '../components/ContextUsageIndicator.js'

const composition: ContextComposition = {
  version: 1,
  basis: 'core-provider-context-json',
  percentBasis: 'estimated-known-tokens',
  totalChars: 13000,
  totalBytes: 14000,
  estimatedChars: 12000,
  estimatedTokens: 3000,
  charsPerToken: 4,
  actualInputTokens: 3100,
  unknownTokenItems: 1,
  serializationFailures: 0,
  categories: [
    {
      id: 'toolResults',
      chars: 12000,
      bytes: 12000,
      items: 1,
      unknownItems: 0,
      estimatedTokens: 3000,
      percent: 100,
      bytePercent: 85.71,
    },
    {
      id: 'images',
      chars: 1000,
      bytes: 2000,
      items: 1,
      unknownItems: 1,
      estimatedTokens: null,
      percent: null,
      bytePercent: 14.29,
    },
  ],
}
const usage: ContextUsage = {
  inputTokens: 3100,
  contextWindow: 100000,
  backgroundCompactAtTokens: 10000,
  compactAtTokens: 60000,
  composition,
  requestId: 'request-2',
  at: '2026-10-20T10:01:00Z',
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet({ 'x-mark': { paths: [] } })
})
afterEach(cleanup)

describe('context usage details', () => {
  it('uses the server target and distinguishes actual tokens, estimates, bytes, and unknown media', () => {
    render(<ContextUsageIndicator usage={usage} />)
    const button = screen.getByRole('button', { name: /Context usage/ })
    expect(button.textContent).toContain('31%')
    expect(button.title).toContain('Compaction target')
    expect(button.title).not.toContain('auto-compacts')
    fireEvent.click(button)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/Provider-reported input: 3,100 tokens/)).toBeTruthy()
    expect(screen.getByText(/Known text estimate: 3,000 tokens/)).toBeTruthy()
    expect(screen.getByText(/unknown token cost/)).toBeTruthy()
    expect(screen.getByRole('row', { name: /Tool results/ }).textContent).toContain('100%')
    expect(screen.getByRole('row', { name: /Images/ }).textContent).toContain('— + ?')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('falls back to the context window without inventing a compaction threshold', () => {
    render(<ContextUsageIndicator usage={{ inputTokens: 0, contextWindow: 100000 }} />)
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('0%')
    expect(button.title).toContain('Context window')
    expect(button.title).not.toContain('Compaction target')
  })

  it('shows usage history and actual completed compactions', () => {
    render(
      <ContextUsageIndicator
        usage={usage}
        history={[
          { ...usage, requestId: 'request-1', at: '2026-10-20T10:00:00Z', inputTokens: 20000 },
        ]}
        compactions={[
          {
            at: '2026-10-20T10:00:30Z',
            compactedCount: 12,
            beforeChars: 80000,
            afterChars: 8000,
            elapsedMs: 4500,
          },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Context over time · 2 requests')).toBeTruthy()
    expect(screen.getByRole('img', { name: /Input tokens over time/ })).toBeTruthy()
    expect(screen.getByText(/80,000 → 8,000 characters · 5s/)).toBeTruthy()
  })

  it('replaces estimates with actual usage for the same request and refuses a stale estimate', () => {
    const estimate = { ...usage, composition: { ...composition, actualInputTokens: null } }
    expect(mergeContextHistory([estimate], [usage])).toEqual([usage])
    expect(mergeContextHistory([usage], [estimate])).toEqual([usage])
  })

  it('bounds history while retaining the beginning and newest request', () => {
    const samples = Array.from({ length: 150 }, (_, index) => ({
      ...usage,
      requestId: String(index),
      at: new Date(index * 1000).toISOString(),
    }))
    const merged = mergeContextHistory(samples, [])
    expect(merged).toHaveLength(128)
    expect(merged[0].requestId).toBe('0')
    expect(merged.at(-1)?.requestId).toBe('149')
  })
})
