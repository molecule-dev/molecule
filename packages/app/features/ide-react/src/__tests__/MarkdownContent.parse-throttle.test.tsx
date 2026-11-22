// @vitest-environment jsdom

/**
 * `MarkdownContent`'s live-parse throttle. Two timing guarantees matter to the
 * chat and both are pinned here:
 *
 * - while `isStreaming`, incoming text is re-parsed on a ~120ms throttle (so a
 *   fast token stream does not re-parse the whole message on every flush) — the
 *   pending text appears when the throttle window elapses, not synchronously;
 * - FINALIZING (a non-streaming update, or the stream ending) parses the full,
 *   stable text in that same render, with no timer of its own — the last tokens
 *   and the final message are never a frame apart.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent } from '../components/MarkdownContent.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('MarkdownContent live parse', () => {
  it('throttles the parse while streaming and finalizes in the same render', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<MarkdownContent text="first line" isStreaming />)
    expect(container.textContent).toContain('first line')

    // A flush that lands inside the throttle window is NOT parsed synchronously;
    // it is scheduled, so continuous streaming refreshes at the throttle rate.
    rerender(<MarkdownContent text="first line and more" isStreaming />)
    expect(container.textContent).not.toContain('first line and more')
    act(() => {
      vi.advanceTimersByTime(120)
    })
    expect(container.textContent).toContain('first line and more')

    // Finalizing needs no timer: the full text is parsed in that render.
    rerender(<MarkdownContent text="first line and more, final" isStreaming={false} />)
    expect(container.textContent).toContain('first line and more, final')
  })

  it('parses a non-streaming text change immediately', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<MarkdownContent text="static" />)
    expect(container.textContent).toContain('static')

    rerender(<MarkdownContent text="static, updated" />)
    expect(container.textContent).toContain('static, updated')
  })

  it('keeps refreshing while the stream continues past one window', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<MarkdownContent text="a" isStreaming />)
    rerender(<MarkdownContent text="a b" isStreaming />)
    act(() => {
      vi.advanceTimersByTime(120)
    })
    expect(container.textContent).toContain('a b')

    rerender(<MarkdownContent text="a b c" isStreaming />)
    act(() => {
      vi.advanceTimersByTime(120)
    })
    expect(container.textContent).toContain('a b c')
  })
})
