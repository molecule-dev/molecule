/**
 * `<RelativeTime>`'s clock: "now" is committed state, so the label advances
 * when the refresh interval fires, and an unrelated re-render does not re-read
 * the clock (a `refreshMs={0}` label holds its mount value until remounted).
 *
 * @module
 */

// @vitest-environment jsdom

import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../RelativeTime.js'

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])
setProvider(provider)

const START = new Date('2026-11-18T12:00:00.000Z')
const FIVE_MINUTES_AGO = new Date(START.getTime() - 5 * 60_000).toISOString()

/**
 * The rendered `<time>` text.
 *
 * @param container - Render container.
 * @returns The label.
 */
function label(container: HTMLElement): string {
  return container.querySelector('time')?.textContent ?? ''
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('<RelativeTime> clock', () => {
  it('advances the label when the refresh interval fires', () => {
    const { container } = render(
      createElement(RelativeTime, { date: FIVE_MINUTES_AGO, locale: 'en', refreshMs: 60_000 }),
    )
    expect(label(container)).toBe('5 minutes ago')
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(label(container)).toBe('6 minutes ago')
  })

  it('holds its mount value on an unrelated re-render when refreshMs is 0', () => {
    const { container, rerender } = render(
      createElement(RelativeTime, { date: FIVE_MINUTES_AGO, locale: 'en', refreshMs: 0 }),
    )
    expect(label(container)).toBe('5 minutes ago')
    vi.setSystemTime(new Date(START.getTime() + 2 * 60_000))
    rerender(createElement(RelativeTime, { date: FIVE_MINUTES_AGO, locale: 'en', refreshMs: 0 }))
    expect(label(container)).toBe('5 minutes ago')
  })
})
