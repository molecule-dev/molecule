/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Timeline, TimelineDate, type TimelineEventData } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered order activity timeline.
 */
function OrderActivity(): React.JSX.Element {
  const activity = [
    { id: 'a1', at: '2026-03-12T09:15:00Z', title: 'Order placed' },
    { id: 'a2', at: '2026-03-12T09:16:00Z', title: 'Payment confirmed', body: 'Visa ending 4242' },
    { id: 'a3', at: '2026-03-13T14:02:00Z', title: 'Item shipped' },
  ]
  const day = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  const dayOf = new Map(activity.map((a) => [a.id, day.format(new Date(a.at))]))
  const events: TimelineEventData[] = activity.map((a) => ({
    id: a.id,
    timestamp: time.format(new Date(a.at)),
    title: a.title,
    body: a.body,
  }))
  return (
    <Timeline
      events={events}
      renderDateSeparator={(event, prev) =>
        !prev || dayOf.get(event.id) !== dayOf.get(prev.id) ? (
          <TimelineDate>{dayOf.get(event.id)}</TimelineDate>
        ) : null
      }
      emptyState={<p>No activity yet.</p>}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders events in order with one date header per day', () => {
    const html = renderToStaticMarkup(<OrderActivity />)
    const order = [
      'March 12',
      'Order placed',
      'Payment confirmed',
      'Visa ending 4242',
      'March 13',
      'Item shipped',
    ].map((s) => html.indexOf(s))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(html.match(/March 12/g)).toHaveLength(1)
    expect(html).toMatch(/9:15\sAM/)
    expect(html).toMatch(/2:02\sPM/)
    // Connectors join events; the last event has none.
    expect(html.match(/border-left:1px solid currentColor/g)).toHaveLength(2)
    expect(html).not.toContain('No activity yet.')
  })
})
