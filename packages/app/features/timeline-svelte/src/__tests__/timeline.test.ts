// @vitest-environment jsdom
/**
 * Unit tests for the Svelte timeline — a port of
 * `@molecule/app-timeline-react/src/__tests__/timeline.test.tsx`: the same test
 * names and behavioral assertions, rendered with a real Svelte 5 mount (jsdom)
 * and the mocked ClassMap. Node-valued props are snippets, as in any Svelte
 * consumer.
 *
 * @module
 */
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

const { default: Timeline } = await import('../Timeline.svelte')
const { default: TimelineDate } = await import('../TimelineDate.svelte')
const { default: TimelineEvent } = await import('../TimelineEvent.svelte')
const { default: TimelineRail } = await import('../TimelineRail.svelte')
import type { TimelineEventData } from '../types.js'

afterEach(async () => {
  document.body.innerHTML = ''
})

/** A snippet rendering raw markup, as a Svelte consumer would pass one. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Mounts a component into a fresh host and returns its markup. */
const render = (component: unknown, props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(component as never, { target: host, props })
  flushSync()
  const markup = host.innerHTML
  queueMicrotask(() => {
    unmount(instance)
  })
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
    const markup = render(TimelineRail, { marker: raw('<i data-marker=""></i>') })
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
      event: ev('a', { marker: raw('<span data-m=""></span>') }),
    })
    expect(markup).toContain('data-m=""')
  })

  it('forwards className', () => {
    expect(render(TimelineEvent, { event: ev('a'), className: 'evt-cls' })).toContain('evt-cls')
  })
})

describe('TimelineDate', () => {
  it('renders its children', () => {
    expect(render(TimelineDate, { children: raw('Yesterday') })).toContain('Yesterday')
  })

  it('forwards className', () => {
    expect(render(TimelineDate, { children: raw('Today'), className: 'date-cls' })).toContain(
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
      emptyState: raw('<p data-empty="">Nothing yet</p>'),
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
    const separator: Snippet<[TimelineEventData, TimelineEventData | undefined]> = createRawSnippet(
      (event, prev) => ({
        render: () => {
          const current = event()
          seen.push([current.id, prev()?.id])
          return `<hr data-sep="${current.id}">`
        },
      }),
    )
    const markup = render(Timeline, {
      events: [ev('a'), ev('b')],
      renderDateSeparator: separator,
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
