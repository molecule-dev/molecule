// @vitest-environment jsdom
/**
 * Unit tests for `NotificationCenter`, ported from
 * `@molecule/app-notification-center-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom), the bonded ClassMap and the
 * bonded i18n provider.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NotificationCenter from '../NotificationCenter.svelte'
import type { NotificationCenterProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const items = [
  { id: '1', title: 'New comment', body: 'on your post', timestamp: '2m', read: false },
  { id: '2', title: 'Build passed', read: true },
]

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/** Mounts a `NotificationCenter` and returns the target element. */
const host = (props: NotificationCenterProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(NotificationCenter, { target, props }))
  flushSync()
  return target
}

/** Renders a `NotificationCenter` with the given props, returning the host markup. */
const render = (props: NotificationCenterProps): string => host(props).innerHTML

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('NotificationCenter', () => {
  it('renders the default title and a custom title', () => {
    expect(render({ items })).toContain('Notifications')
    expect(render({ items, title: 'Alerts' })).toContain('Alerts')
  })

  it('renders an item per notification with title and body', () => {
    const markup = render({ items })
    expect(markup).toContain('New comment')
    expect(markup).toContain('on your post')
    expect(markup).toContain('Build passed')
  })

  it('renders the unread dot + tint only on unread items', () => {
    const markup = render({ items })
    // one unread item → one tinted row and one dot (the bonded classes)
    expect(markup.split('bg-primary/10').length - 1).toBe(1)
    expect(markup.split('rounded-full').length - 1).toBe(1)
    expect(markup).not.toContain('rgba(96')
  })

  it("an unread row is tinted with the theme's primary, not a fixed colour", () => {
    const markup = render({ items })
    // the theme token, not an inline background
    expect(markup).toContain('bg-primary/10')
    expect(markup).not.toContain('background:')
    // a read row is unchanged: no tint
    const read = render({ items: [{ id: '2', title: 'Build passed', read: true }] })
    expect(read).not.toContain('bg-primary/10')
  })

  it('an unread row announces Unread to screen readers', () => {
    const markup = render({ items })
    // the sr-only label through t(), announced before the title
    expect(markup).toContain('sr-only')
    expect(markup).toContain('Unread')
    // absent on a read row
    const read = render({ items: [{ id: '2', title: 'Build passed', read: true }] })
    expect(read).not.toContain('sr-only')
    expect(read).not.toContain('Unread')
  })

  it('renders the default empty message when there are no items', () => {
    const markup = render({ items: [] })
    expect(markup).toContain('No notifications')
  })

  it('renders a custom emptyState when supplied', () => {
    const markup = render({ items: [], emptyState: raw('<p data-empty="">All caught up</p>') })
    expect(markup).toContain('data-empty=""')
  })

  it('renders mark-all-read and view-all only when their handlers + items exist', () => {
    const full = render({ items, onMarkAllRead: () => {}, onViewAll: () => {} })
    expect(full).toContain('Mark all as read')
    expect(full).toContain('View all')
    const empty = render({ items: [], onMarkAllRead: () => {}, onViewAll: () => {} })
    expect(empty).not.toContain('Mark all as read')
    expect(empty).not.toContain('View all')
  })

  it('forwards className', () => {
    const markup = render({ items, className: 'ncn-cls' })
    expect(markup).toContain('ncn-cls')
  })

  describe('error banner (lastError)', () => {
    it('renders no banner when lastError is unset', () => {
      const markup = render({ items })
      expect(markup).not.toContain('role="alert"')
    })

    it('renders an error banner with retry text when lastError is set, even though items are already loaded', () => {
      const markup = render({ items, lastError: new Error('Network error') })
      expect(markup).toContain('role="alert"')
      expect(markup).toContain('Could not load notifications.')
      expect(markup).toContain('Retry')
      // The banner must not replace the (stale-but-populated) list.
      expect(markup).toContain('New comment')
      expect(markup).toContain('Build passed')
    })

    it('renders the banner alongside the empty state when there are no items yet', () => {
      const markup = render({ items: [], lastError: new Error('boom') })
      expect(markup).toContain('role="alert"')
      expect(markup).toContain('No notifications')
    })

    it('clicking the retry button invokes onRetry (wired to refresh())', () => {
      const onRetry = vi.fn()
      const target = host({ items, lastError: new Error('x'), onRetry })
      const retryButton = target.querySelector('[data-mol-id="notification-center-retry"]')
      expect(retryButton).not.toBeNull()
      ;(retryButton as HTMLElement).click()
      expect(onRetry).toHaveBeenCalledOnce()
    })
  })
})
