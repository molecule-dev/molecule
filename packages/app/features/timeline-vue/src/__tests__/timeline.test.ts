// @vitest-environment jsdom
/**
 * Unit tests for the Vue timeline — a port of
 * `@molecule/app-timeline-react/src/__tests__/timeline.test.tsx`: the same test
 * names and behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { Timeline } from '../Timeline.js'
import { TimelineDate } from '../TimelineDate.js'
import { TimelineEvent } from '../TimelineEvent.js'
import { TimelineRail } from '../TimelineRail.js'
import type { TimelineEventData } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a component and returns the markup it produced. */
const render = (
  component: unknown,
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const ev = (id: string, over: Partial<TimelineEventData> = {}): TimelineEventData => ({
  id,
  timestamp: `ts-${id}`,
  title: `title-${id}`,
  ...over,
})

describe('TimelineRail', () => {
  it('renders a default "•" marker when none is given', () => {
    expect(render(TimelineRail, {})).toContain('•')
  })

  it('marks the default marker aria-hidden', () => {
    expect(render(TimelineRail, {})).toContain('aria-hidden="true"')
  })

  it('renders a supplied marker instead of the default dot', () => {
    const markup = render(TimelineRail, { marker: h('i', { 'data-marker': '' }) })
    expect(markup).toContain('data-marker=""')
    expect(markup).not.toContain('•')
  })

  it('renders the vertical connector by default', () => {
    expect(render(TimelineRail, {})).toContain('border-left: 1px solid')
  })

  it('omits the connector when connector={false}', () => {
    expect(render(TimelineRail, { connector: false })).not.toContain('border-left: 1px solid')
  })

  it('forwards className', () => {
    expect(render(TimelineRail, { className: 'rail-cls' })).toContain('rail-cls')
  })
})

describe('TimelineEvent', () => {
  it('renders the event timestamp, title, and body', () => {
    const markup = render(TimelineEvent, { event: ev('a', { body: 'body-a' }) })
    expect(markup).toContain('ts-a')
    expect(markup).toContain('title-a')
    expect(markup).toContain('body-a')
  })

  it('omits the body block when the event has no body', () => {
    const markup = render(TimelineEvent, { event: ev('a') })
    expect(markup).toContain('title-a')
    // no body text present
    expect(markup).not.toContain('body-')
  })

  it('renders the rail connector when not the last event', () => {
    const markup = render(TimelineEvent, { event: ev('a'), isLast: false })
    expect(markup).toContain('border-left: 1px solid')
  })

  it('suppresses the rail connector when isLast', () => {
    const markup = render(TimelineEvent, { event: ev('a'), isLast: true })
    expect(markup).not.toContain('border-left: 1px solid')
  })

  it('passes a custom marker through to the rail', () => {
    const markup = render(TimelineEvent, {
      event: ev('a', { marker: h('span', { 'data-m': '' }) }),
    })
    expect(markup).toContain('data-m=""')
  })

  it('forwards className', () => {
    expect(render(TimelineEvent, { event: ev('a'), className: 'evt-cls' })).toContain('evt-cls')
  })
})

describe('TimelineDate', () => {
  it('renders its children', () => {
    expect(render(TimelineDate, {}, { default: () => ['Yesterday'] })).toContain('Yesterday')
  })

  it('forwards className', () => {
    expect(render(TimelineDate, { className: 'date-cls' }, { default: () => ['Today'] })).toContain(
      'date-cls',
    )
  })
})

describe('Timeline', () => {
  it('renders one row per event', () => {
    const markup = render(Timeline, { events: [ev('a'), ev('b'), ev('c')] })
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('title-c')
  })

  it('renders the emptyState when there are no events and emptyState is given', () => {
    const markup = render(Timeline, {
      events: [],
      emptyState: h('p', { 'data-empty': '' }, 'Nothing yet'),
    })
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing yet')
  })

  it('renders an empty wrapper (no emptyState) when events is empty and none supplied', () => {
    // no emptyState → falls through to the mapping branch over an empty array
    const markup = render(Timeline, { events: [] })
    expect(markup).not.toContain('title-')
  })

  it('suppresses the connector on the final event only', () => {
    const markup = render(Timeline, { events: [ev('a'), ev('b')] })
    // two events → exactly one connector (on the first, not the last)
    const connectors = markup.split('border-left: 1px solid').length - 1
    expect(connectors).toBe(1)
  })

  it('invokes renderDateSeparator with each event and its predecessor', () => {
    const seen: Array<[string, string | undefined]> = []
    const markup = render(Timeline, {
      events: [ev('a'), ev('b')],
      renderDateSeparator: (event: TimelineEventData, prev?: TimelineEventData) => {
        seen.push([event.id, prev?.id])
        return h('hr', { 'data-sep': event.id })
      },
    })
    expect(seen).toEqual([
      ['a', undefined],
      ['b', 'a'],
    ])
    expect(markup).toContain('data-sep="a"')
    expect(markup).toContain('data-sep="b"')
  })

  it('forwards className onto the outer wrapper', () => {
    expect(render(Timeline, { events: [ev('a')], className: 'tl-cls' })).toContain('tl-cls')
  })
})
