import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings, every other access
// yields its key as a string token, so emitted classNames are inspectable.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Timeline } = await import('../Timeline.js')
const { TimelineEvent } = await import('../TimelineEvent.js')
const { TimelineRail } = await import('../TimelineRail.js')
const { TimelineDate } = await import('../TimelineDate.js')
import type { TimelineEventData } from '../types.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const ev = (id: string, over: Partial<TimelineEventData> = {}): TimelineEventData => ({
  id,
  timestamp: `ts-${id}`,
  title: `title-${id}`,
  ...over,
})

describe('TimelineRail', () => {
  it('renders a default "•" marker when none is given', () => {
    expect(html(createElement(TimelineRail, {}))).toContain('•')
  })

  it('marks the default marker aria-hidden', () => {
    expect(html(createElement(TimelineRail, {}))).toContain('aria-hidden="true"')
  })

  it('renders a supplied marker instead of the default dot', () => {
    const markup = html(
      createElement(TimelineRail, { marker: createElement('i', { 'data-marker': '' }) }),
    )
    expect(markup).toContain('data-marker=""')
    expect(markup).not.toContain('•')
  })

  it('renders the vertical connector by default', () => {
    expect(html(createElement(TimelineRail, {}))).toContain('border-left:1px solid currentColor')
  })

  it('omits the connector when connector={false}', () => {
    expect(html(createElement(TimelineRail, { connector: false }))).not.toContain(
      'border-left:1px solid currentColor',
    )
  })

  it('forwards className', () => {
    expect(html(createElement(TimelineRail, { className: 'rail-cls' }))).toContain('rail-cls')
  })
})

describe('TimelineEvent', () => {
  it('renders the event timestamp, title, and body', () => {
    const markup = html(createElement(TimelineEvent, { event: ev('a', { body: 'body-a' }) }))
    expect(markup).toContain('ts-a')
    expect(markup).toContain('title-a')
    expect(markup).toContain('body-a')
  })

  it('omits the body block when the event has no body', () => {
    const markup = html(createElement(TimelineEvent, { event: ev('a') }))
    expect(markup).toContain('title-a')
    // no body text present
    expect(markup).not.toContain('body-')
  })

  it('renders the rail connector when not the last event', () => {
    const markup = html(createElement(TimelineEvent, { event: ev('a'), isLast: false }))
    expect(markup).toContain('border-left:1px solid currentColor')
  })

  it('suppresses the rail connector when isLast', () => {
    const markup = html(createElement(TimelineEvent, { event: ev('a'), isLast: true }))
    expect(markup).not.toContain('border-left:1px solid currentColor')
  })

  it('passes a custom marker through to the rail', () => {
    const markup = html(
      createElement(TimelineEvent, {
        event: ev('a', { marker: createElement('span', { 'data-m': '' }) }),
      }),
    )
    expect(markup).toContain('data-m=""')
  })

  it('forwards className', () => {
    expect(html(createElement(TimelineEvent, { event: ev('a'), className: 'evt-cls' }))).toContain(
      'evt-cls',
    )
  })
})

describe('TimelineDate', () => {
  it('renders its children', () => {
    expect(html(createElement(TimelineDate, {}, 'Yesterday'))).toContain('Yesterday')
  })

  it('forwards className', () => {
    expect(html(createElement(TimelineDate, { className: 'date-cls' }, 'Today'))).toContain(
      'date-cls',
    )
  })
})

describe('Timeline', () => {
  it('renders one row per event', () => {
    const markup = html(createElement(Timeline, { events: [ev('a'), ev('b'), ev('c')] }))
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('title-c')
  })

  it('renders the emptyState when there are no events and emptyState is given', () => {
    const markup = html(
      createElement(Timeline, {
        events: [],
        emptyState: createElement('p', { 'data-empty': '' }, 'Nothing yet'),
      }),
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing yet')
  })

  it('renders an empty wrapper (no emptyState) when events is empty and none supplied', () => {
    // no emptyState → falls through to the mapping branch over an empty array
    const markup = html(createElement(Timeline, { events: [] }))
    expect(markup).not.toContain('title-')
  })

  it('suppresses the connector on the final event only', () => {
    const markup = html(createElement(Timeline, { events: [ev('a'), ev('b')] }))
    // two events → exactly one connector (on the first, not the last)
    const connectors = markup.split('border-left:1px solid currentColor').length - 1
    expect(connectors).toBe(1)
  })

  it('invokes renderDateSeparator with each event and its predecessor', () => {
    const seen: Array<[string, string | undefined]> = []
    const markup = html(
      createElement(Timeline, {
        events: [ev('a'), ev('b')],
        renderDateSeparator: (event, prev) => {
          seen.push([event.id, prev?.id])
          return createElement('hr', { 'data-sep': event.id })
        },
      }),
    )
    expect(seen).toEqual([
      ['a', undefined],
      ['b', 'a'],
    ])
    expect(markup).toContain('data-sep="a"')
    expect(markup).toContain('data-sep="b"')
  })

  it('forwards className onto the outer wrapper', () => {
    expect(html(createElement(Timeline, { events: [ev('a')], className: 'tl-cls' }))).toContain(
      'tl-cls',
    )
  })
})
