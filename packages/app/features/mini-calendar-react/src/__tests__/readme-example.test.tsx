// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. "Today" is pinned to Wednesday
 * 10 June 2026 so the grid is deterministic.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MiniCalendar } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The appointment date picker.
 */
function AppointmentDatePicker(): React.JSX.Element {
  const [date, setDate] = useState<Date>()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return (
    <div>
      <MiniCalendar
        selected={date} // pass the pick back — the calendar does not remember it
        onSelect={setDate}
        locale="en-US"
        isDisabled={(d) => d < startOfToday || d.getDay() === 0 || d.getDay() === 6}
      />
      {date && <p>Appointment on {date.toLocaleDateString('en-US', { dateStyle: 'full' })}</p>}
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 10, 9, 0))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows the current month, blocks past days and weekends, and selects a weekday', () => {
    const view = render(<AppointmentDatePicker />)
    expect(view.getByText('June 2026')).toBeTruthy()

    const day = (n: string): HTMLButtonElement => {
      const match = view.getAllByRole('button', { name: n })[0]
      if (!(match instanceof HTMLButtonElement)) throw new Error(`no day ${n}`)
      return match
    }
    expect(day('9').disabled).toBe(true) // yesterday
    expect(day('13').disabled).toBe(true) // Saturday
    expect(day('12').disabled).toBe(false)

    fireEvent.click(day('12'))
    expect(view.getByText('Appointment on Friday, June 12, 2026')).toBeTruthy()
    expect(day('12').getAttribute('aria-current')).toBe('date')

    fireEvent.click(view.getByRole('button', { name: 'Next month' }))
    expect(view.getByText('July 2026')).toBeTruthy()
  })
})
