// @vitest-environment jsdom
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

import { DayTimeline, type DayTimelineEvent } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered itinerary day.
 */
function ItineraryDay(): React.JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null)
  const plan = [
    { id: 'flight', title: 'Flight to LAX', subtitle: 'Gate 32', startHour: 13, endHour: 16 },
    {
      id: 'dinner',
      title: 'Dinner',
      subtitle: 'Bestia',
      startHour: 19,
      endHour: 20.5,
      accentColor: '#f97316',
    },
  ]
  const events: DayTimelineEvent[] = plan.map((item) => ({
    ...item,
    onClick: () => setOpenId(item.id),
  }))
  return (
    <>
      <DayTimeline
        startHour={7}
        endHour={22}
        pxPerHour={48}
        events={events}
        dataMolId="itinerary-day"
      />
      <p>{openId}</p>
    </>
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderDay(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ItineraryDay />
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

  it('positions each event by its hours and labels it', () => {
    const view = renderDay()
    const root = view.getByRole('list', { name: 'Day timeline' })
    expect(root.getAttribute('data-mol-id')).toBe('itinerary-day')
    const flight = view.getByRole('listitem', { name: 'Flight to LAX from 1 PM to 4 PM' })
    expect(flight.style.top).toBe(`${(13 - 7) * 48}px`)
    expect(flight.style.height).toBe(`${3 * 48}px`)
    const dinner = view.getByRole('listitem', { name: 'Dinner from 7 PM to 8:30 PM' })
    expect(dinner.textContent).toContain('Bestia')
    expect(view.container.querySelector('[data-axis-tick="7"]')?.textContent).toBe('7 AM')
  })

  it('fires the per-event click handler, including via the keyboard', () => {
    const view = renderDay()
    fireEvent.click(view.getByText('Dinner'))
    expect(view.container.querySelector('p')?.textContent).toBe('dinner')
    fireEvent.keyDown(view.getByRole('listitem', { name: /Flight to LAX/ }), { key: 'Enter' })
    expect(view.container.querySelector('p')?.textContent).toBe('flight')
  })
})
