/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ClassSchedule, type ScheduleEvent, type ScheduleSlot } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered timetable page.
 */
function TimetablePage(): React.JSX.Element {
  const events: ScheduleEvent[] = [
    {
      id: 'math',
      weekday: 1,
      start: 9 * 60,
      end: 10 * 60 + 30,
      title: 'Math 101',
      subtitle: 'Room 4B',
      meta: 'Ms. Rivera',
    },
    {
      id: 'eng',
      weekday: 3,
      start: 11 * 60,
      end: 12 * 60,
      title: 'English',
      subtitle: 'Room 12',
      accentColor: '#2563eb',
    },
  ]
  const [selected, setSelected] = useState<ScheduleEvent | null>(null)
  const [slot, setSlot] = useState<ScheduleSlot | null>(null)
  return (
    <>
      <ClassSchedule
        events={events}
        dayHours={[8, 16]}
        showWeekendCols={false}
        locale="en-US"
        onEventClick={(event) => setSelected(event)}
        onSlotClick={(s) => setSlot(s)}
      />
      <p>{selected?.id ?? slot?.start}</p>
    </>
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderPage(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <TimetablePage />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders weekday headers, hour rows and both event tiles', () => {
    const view = renderPage()
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    const hours = view.container.querySelectorAll('[data-mol-id="class-schedule-hour-label"]')
    expect(hours).toHaveLength(8)
    expect(hours[0]?.textContent).toBe('08:00')
    expect(view.getByText('Math 101')).toBeTruthy()
    expect(view.getByText('Room 4B')).toBeTruthy()
    expect(view.getByText('Ms. Rivera')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Mon 09:00 – 10:30' })).toBeTruthy()
    expect(view.getByRole('button', { name: 'Wed 11:00 – 12:00' })).toBeTruthy()
  })

  it('reports event clicks and empty-slot clicks', () => {
    const view = renderPage()
    fireEvent.click(view.getByRole('button', { name: 'Empty slot, Tue 14:00' }))
    expect(view.container.querySelector('p')?.textContent).toBe('840')
    fireEvent.click(view.getByText('English'))
    expect(view.container.querySelector('p')?.textContent).toBe('eng')
  })
})
