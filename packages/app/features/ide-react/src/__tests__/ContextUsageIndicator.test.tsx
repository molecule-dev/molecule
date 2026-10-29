// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render as renderReact,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContextComposition, ContextUsage } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ContextUsageIndicator, mergeContextHistory } from '../components/ContextUsageIndicator.js'

const get = vi.fn()
const http = { get } as unknown as HttpClient
const totals = {
  inputTokens: 1000,
  outputTokens: 2000,
  cacheReadInputTokens: 3000,
  cacheCreationInputTokens: 4000,
  allowancePercent: 25,
  allowanceWindow: 'daily',
  allowanceResetAt: new Date('2026-10-30T12:00:00Z').getTime(),
}
const render = (ui: ReactElement) =>
  renderReact(ui, {
    wrapper: ({ children }) => <HttpProvider client={http}>{children}</HttpProvider>,
  })

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
  get.mockReset().mockResolvedValue({ data: totals })
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet({ 'x-mark': { paths: [] } })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('context usage details', () => {
  it('uses the server target and distinguishes actual tokens, estimates, bytes, and unknown media', () => {
    render(<ContextUsageIndicator usage={usage} />)
    const button = screen.getByRole('button', { name: /Context usage/ })
    expect(button.getAttribute('aria-label')).toContain('Compaction target (31%)')
    expect(button.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
    expect(button.title).toBe('')
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
    expect(button.getAttribute('aria-label')).toContain('Context window')
    expect(button.getAttribute('aria-label')).not.toContain('Compaction target')
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

  it('reveals the percentage and a detailed tooltip on hover, then dismisses both', async () => {
    render(
      <ContextUsageIndicator usage={usage} projectId="a project" conversationId="session/one" />,
    )
    expect(get).not.toHaveBeenCalled()
    const button = screen.getByRole('button', { name: /Context usage/ })
    fireEvent.mouseEnter(button)
    const tooltip = screen.getByRole('tooltip')
    expect(button.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('1')
    expect(within(tooltip).getByText('Context has room')).toBeTruthy()
    expect(within(tooltip).getByText(/7K tokens of headroom/)).toBeTruthy()
    await waitFor(() => expect(within(tooltip).getByText('~75% remaining')).toBeTruthy())
    expect(get.mock.calls[0][0]).toBe(
      '/projects/a%20project/chat-usage?conversationId=session%2Fone',
    )
    expect(within(tooltip).getByText('10.0K tokens')).toBeTruthy()
    expect(within(tooltip).getByText('8.0K input (incl. cache) · 2.0K output')).toBeTruthy()
    expect(within(tooltip).getByText(/Daily allowance/)).toBeTruthy()
    fireEvent.mouseLeave(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(button.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
  })

  it('supports keyboard focus, Escape and click without leaving the tooltip above the modal', () => {
    render(<ContextUsageIndicator usage={usage} />)
    const button = screen.getByRole('button', { name: /Context usage/ })
    fireEvent.focus(button)
    expect(button.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('1')
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(button.querySelector<HTMLElement>('[data-ctx-pct]')?.style.opacity).toBe('0')
    fireEvent.mouseEnter(button)
    fireEvent.click(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it.each([
    [1000, 'textSuccess'],
    [7000, 'textWarning'],
    [9500, 'textError'],
  ] as const)('colors the ring semantically at %i tokens', (tokens, color) => {
    render(<ContextUsageIndicator usage={{ ...usage, inputTokens: tokens }} />)
    const ring = screen.getByRole('button', { name: /Context usage/ }).querySelector('svg')
    expect(ring?.getAttribute('class')).toBe(classMap[color])
  })

  it('keeps the context target separate from the window and clamps exhausted allowance', async () => {
    get.mockResolvedValue({
      data: { ...totals, allowancePercent: 125, allowanceWindow: 'billing-period' },
    })
    render(<ContextUsageIndicator usage={{ ...usage, inputTokens: 11000 }} projectId="p" />)
    fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
    await screen.findByText('~0% remaining')
    expect(screen.getByText('At compaction target')).toBeTruthy()
    expect(screen.getByText('Model context window: 100K tokens.')).toBeTruthy()
    expect(screen.getByText(/Monthly allowance/)).toBeTruthy()
    expect(screen.getByText('0 tokens of headroom')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it.each([
    [null, 'Unmetered'],
    [undefined, 'Unavailable'],
  ])('distinguishes allowance %s', async (percent, expected) => {
    get.mockResolvedValue({ data: { ...totals, allowancePercent: percent } })
    render(<ContextUsageIndicator usage={usage} projectId="p" />)
    fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
    await screen.findByText(expected)
    expect(screen.queryByText('~100% remaining')).toBeNull()
  })

  it('retries failed usage and closes the modal before opening chat settings', async () => {
    get.mockRejectedValueOnce(new Error('offline'))
    const settings = vi.fn()
    render(<ContextUsageIndicator usage={usage} projectId="p" onOpenSettings={settings} />)
    fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
    await screen.findByText(/Usage could not be refreshed/)
    expect(screen.queryByText('~100% remaining')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh usage' }))
    await screen.findByText('~75% remaining')
    fireEvent.click(screen.getByRole('button', { name: 'Chat settings' }))
    expect(settings).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('discards old-session totals and an old response when navigation changes the session', async () => {
    let finish!: (value: unknown) => void
    get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { rerender } = render(
      <ContextUsageIndicator usage={usage} projectId="p" conversationId="old" />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
    rerender(<ContextUsageIndicator usage={usage} projectId="p" conversationId="new" />)
    fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
    await screen.findByText('~75% remaining')
    await act(async () => finish({ data: { ...totals, allowancePercent: 99 } }))
    expect(screen.queryByText('~1% remaining')).toBeNull()
    expect(get.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('refreshes visible usage every 15 seconds and cancels the timer and request on close', async () => {
    vi.useFakeTimers()
    render(<ContextUsageIndicator usage={usage} projectId="p" />)
    fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
    await act(async () => {})
    expect(get).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTime(15000))
    expect(get).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(document, { key: 'Escape' })
    await act(async () => vi.advanceTimersByTime(30000))
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1][1].signal.aborted).toBe(true)
  })
})
