// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NotificationFeed` and `fmtRelativeShort` — a port of
 * `@molecule/app-notification-feed-react/src/__tests__/notification-feed.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings, every other access
// yields its key as a string token, so emitted classNames are inspectable —
// the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// The marker the React tests mock `react-router`'s `Link` with: an `<a href>`
// carrying `data-link`.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: defineComponent({
      name: 'Link',
      props: { to: { type: String, required: true } },
      setup(props, { slots }) {
        return () => h('a', { href: props.to, 'data-link': '' }, slots.default?.())
      },
    }),
  }
})

import type { VNodeChild } from 'vue'
import { createApp, defineComponent, h } from 'vue'

const { NotificationFeed } = await import('../NotificationFeed.js')
const { fmtRelativeShort } = await import('../fmtRelativeShort.js')
import type { FeedItem, NotificationFeedProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link NotificationFeed} and returns the markup it produced. */
const render = (
  props: NotificationFeedProps,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(NotificationFeed, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/** One feed row, with optional field overrides. */
const item = (id: string, over: Partial<FeedItem> = {}): FeedItem => ({
  id,
  icon: 'check_circle',
  title: `title-${id}`,
  body: `body-${id}`,
  createdAt: new Date(0).toISOString(),
  ...over,
})

describe('fmtRelativeShort', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(10 * 86_400_000)) // 10 days past epoch
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "0m" for future timestamps', () => {
    expect(fmtRelativeShort(new Date(11 * 86_400_000).toISOString())).toBe('0m')
  })

  it('returns minutes under an hour', () => {
    expect(fmtRelativeShort(new Date(10 * 86_400_000 - 12 * 60_000).toISOString())).toBe('12m')
  })

  it('returns hours under a day', () => {
    expect(fmtRelativeShort(new Date(10 * 86_400_000 - 3 * 3_600_000).toISOString())).toBe('3h')
  })

  it('returns days otherwise', () => {
    expect(fmtRelativeShort(new Date(10 * 86_400_000 - 5 * 86_400_000).toISOString())).toBe('5d')
  })
})

describe('NotificationFeed', () => {
  it('renders each item title, body, and icon', () => {
    const markup = render({ items: [item('a'), item('b')] })
    expect(markup).toContain('title-a')
    expect(markup).toContain('body-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('check_circle')
  })

  it('wraps a row in a <Link> when the item has an href, plain otherwise', () => {
    const withHref = render({ items: [item('a', { href: '/n/a' })] })
    expect(withHref).toContain('data-link=""')
    expect(withHref).toContain('href="/n/a"')
    const without = render({ items: [item('a')] })
    expect(without).not.toContain('data-link')
  })

  it('applies the unread accent class only on unread rows', () => {
    const unread = render({ items: [item('a', { unread: true })] })
    expect(unread).toContain('notificationFeedUnreadAccent')
    const read = render({ items: [item('a')] })
    expect(read).not.toContain('notificationFeedUnreadAccent')
  })

  it('sets the aria-label on the <ul> and the data-mol-id', () => {
    const markup = render({
      items: [item('a')],
      ariaLabel: 'Notifications',
      dataMolId: 'feed-x',
    })
    expect(markup).toContain('aria-label="Notifications"')
    expect(markup).toContain('data-mol-id="feed-x"')
  })

  it('forwards className onto the <ul>', () => {
    const markup = render({ items: [item('a')], className: 'feed-cls' })
    expect(markup).toContain('feed-cls')
  })
})
