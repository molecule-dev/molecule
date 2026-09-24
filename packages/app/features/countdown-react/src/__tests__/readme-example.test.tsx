// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Countdown, useCountdown } from '../index.js'

const SALE_ENDS_AT = '2030-01-01T00:00:00Z' // fixed target — never `Date.now() + x` inside render

/**
 * The README example, verbatim.
 *
 * @returns The rendered sale banner.
 */
function SaleBanner(): React.JSX.Element {
  const { expired } = useCountdown(SALE_ENDS_AT)
  // Shows "03:04:12:05" (days:hours:minutes:seconds); `expired={null}` renders nothing once past.
  return (
    <div data-expired={expired}>
      <Countdown target={SALE_ENDS_AT} format="colon" expired={null} />
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('counts down in colon format and renders nothing once expired', () => {
    vi.useFakeTimers()
    // 3 days, 4 hours, 12 minutes, 5 seconds before the target.
    vi.setSystemTime(new Date('2029-12-28T19:47:55Z'))
    const view = render(<SaleBanner />)
    const root = view.container.firstElementChild as HTMLElement
    expect(root.textContent).toBe('03:04:12:05')
    expect(root.getAttribute('data-expired')).toBe('false')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(root.textContent).toBe('03:04:12:04')

    act(() => {
      vi.advanceTimersByTime(3 * 86_400_000 + 4 * 3_600_000 + 12 * 60_000 + 4000)
    })
    expect(root.textContent).toBe('')
    expect(root.getAttribute('data-expired')).toBe('true')
  })
})
