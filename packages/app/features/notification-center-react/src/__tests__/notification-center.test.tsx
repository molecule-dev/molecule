import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
}))

const { NotificationCenter } = await import('../NotificationCenter.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const items = [
  { id: '1', title: 'New comment', body: 'on your post', timestamp: '2m', read: false },
  { id: '2', title: 'Build passed', read: true },
]

describe('NotificationCenter', () => {
  it('renders the default title and a custom title', () => {
    expect(html(createElement(NotificationCenter, { items }))).toContain('Notifications')
    expect(html(createElement(NotificationCenter, { items, title: 'Alerts' }))).toContain('Alerts')
  })

  it('renders an item per notification with title and body', () => {
    const markup = html(createElement(NotificationCenter, { items }))
    expect(markup).toContain('New comment')
    expect(markup).toContain('on your post')
    expect(markup).toContain('Build passed')
  })

  it('renders the unread dot + tint only on unread items', () => {
    const markup = html(createElement(NotificationCenter, { items }))
    // one unread item → one tinted background
    expect(markup.split('rgba(96,165,250,0.08)').length - 1).toBe(1)
  })

  it('renders the default empty message when there are no items', () => {
    const markup = html(createElement(NotificationCenter, { items: [] }))
    expect(markup).toContain('No notifications')
  })

  it('renders a custom emptyState when supplied', () => {
    const markup = html(
      createElement(NotificationCenter, {
        items: [],
        emptyState: createElement('p', { 'data-empty': '' }, 'All caught up'),
      }),
    )
    expect(markup).toContain('data-empty=""')
  })

  it('renders mark-all-read and view-all only when their handlers + items exist', () => {
    const full = html(
      createElement(NotificationCenter, { items, onMarkAllRead: () => {}, onViewAll: () => {} }),
    )
    expect(full).toContain('Mark all as read')
    expect(full).toContain('View all')
    const empty = html(
      createElement(NotificationCenter, {
        items: [],
        onMarkAllRead: () => {},
        onViewAll: () => {},
      }),
    )
    expect(empty).not.toContain('Mark all as read')
    expect(empty).not.toContain('View all')
  })

  it('forwards className', () => {
    const markup = html(createElement(NotificationCenter, { items, className: 'ncn-cls' }))
    expect(markup).toContain('ncn-cls')
  })
})
