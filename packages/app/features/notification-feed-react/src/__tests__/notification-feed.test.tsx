import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
}))

const { NotificationFeed } = await import('../NotificationFeed.js')
const { fmtRelativeShort } = await import('../fmtRelativeShort.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const item = (
  id: string,
  over: Partial<Parameters<typeof NotificationFeed>[0]['items'][number]> = {},
) => ({
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
    const markup = html(createElement(NotificationFeed, { items: [item('a'), item('b')] }))
    expect(markup).toContain('title-a')
    expect(markup).toContain('body-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('check_circle')
  })

  it('wraps a row in a <Link> when the item has an href, plain otherwise', () => {
    const withHref = html(createElement(NotificationFeed, { items: [item('a', { href: '/n/a' })] }))
    expect(withHref).toContain('data-link=""')
    expect(withHref).toContain('href="/n/a"')
    const without = html(createElement(NotificationFeed, { items: [item('a')] }))
    expect(without).not.toContain('data-link')
  })

  it('applies the unread accent class only on unread rows', () => {
    const unread = html(createElement(NotificationFeed, { items: [item('a', { unread: true })] }))
    expect(unread).toContain('border-l-4')
    const read = html(createElement(NotificationFeed, { items: [item('a')] }))
    expect(read).not.toContain('border-l-4')
  })

  it('sets the aria-label on the <ul> and the data-mol-id', () => {
    const markup = html(
      createElement(NotificationFeed, {
        items: [item('a')],
        ariaLabel: 'Notifications',
        dataMolId: 'feed-x',
      }),
    )
    expect(markup).toContain('aria-label="Notifications"')
    expect(markup).toContain('data-mol-id="feed-x"')
  })

  it('forwards className onto the <ul>', () => {
    const markup = html(
      createElement(NotificationFeed, { items: [item('a')], className: 'feed-cls' }),
    )
    expect(markup).toContain('feed-cls')
  })
})
