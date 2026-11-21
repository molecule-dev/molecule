// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NotificationCenter` — a port of
 * `@molecule/app-notification-center-react/src/__tests__/notification-center.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t` resolves
// to the inline English default.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-alert` markers the React tests mock the UI package
// with. The mock Button forwards `onClick` to the native button so a real
// dispatch reaches the handler, as React's DOM button does.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'MockButton',
      inheritAttrs: false,
      props: { variant: String, size: String },
      setup(_props, { attrs, slots }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              'data-mol-id': (attrs as Record<string, unknown>)['data-mol-id'],
              onClick: (attrs as Record<string, unknown>).onClick as undefined | (() => void),
            },
            slots.default?.(),
          )
      },
    }),
    Alert: defineComponent({
      name: 'MockAlert',
      inheritAttrs: false,
      props: { status: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-alert': props.status ?? '' }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { NotificationCenter } from '../NotificationCenter.js'
import type { NotificationCenterProps } from '../types.js'

const items = [
  { id: '1', title: 'New comment', body: 'on your post', timestamp: '2m', read: false },
  { id: '2', title: 'Build passed', read: true },
]

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts an {@link NotificationCenter} into a fresh host and returns it. */
const mount = (
  props: NotificationCenterProps,
  slots?: Record<string, () => VNodeChild[]>,
): { host: HTMLElement; app: ReturnType<typeof createApp> } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(NotificationCenter, props, slots) }))
  app.mount(host)
  return { host, app }
}

/** Renders an {@link NotificationCenter} and returns the markup it produced. */
const render = (
  props: NotificationCenterProps,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const { host, app } = mount(props, slots)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

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
    // one unread item → one tinted row and one dot
    expect(markup.split('bgPrimarySubtle').length - 1).toBe(1)
    expect(markup.split('roundedFull').length - 1).toBe(1)
    expect(markup).not.toContain('rgba(96')
  })

  it("an unread row is tinted with the theme's primary, not a fixed colour", () => {
    const markup = render({ items })
    // the theme token, not an inline background
    expect(markup).toContain('bgPrimarySubtle')
    expect(markup).not.toContain('background:')
    // a read row is unchanged: no tint
    const read = render({ items: [{ id: '2', title: 'Build passed', read: true }] })
    expect(read).not.toContain('bgPrimarySubtle')
  })

  it('an unread row announces Unread to screen readers', () => {
    const markup = render({ items })
    // the sr-only label through t(), announced before the title
    expect(markup).toContain('srOnly')
    expect(markup).toContain('Unread')
    // absent on a read row
    const read = render({ items: [{ id: '2', title: 'Build passed', read: true }] })
    expect(read).not.toContain('srOnly')
    expect(read).not.toContain('Unread')
  })

  it('renders the default empty message when there are no items', () => {
    const markup = render({ items: [] })
    expect(markup).toContain('No notifications')
  })

  it('renders a custom emptyState when supplied', () => {
    const markup = render({
      items: [],
      emptyState: h('p', { 'data-empty': '' }, 'All caught up'),
    })
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
      expect(markup).not.toContain('data-alert')
    })

    it('renders an error banner with retry text when lastError is set, even though items are already loaded', () => {
      const markup = render({ items, lastError: new Error('Network error') })
      expect(markup).toContain('data-alert="error"')
      expect(markup).toContain('Could not load notifications.')
      expect(markup).toContain('Retry')
      // The banner must not replace the (stale-but-populated) list.
      expect(markup).toContain('New comment')
      expect(markup).toContain('Build passed')
    })

    it('renders the banner alongside the empty state when there are no items yet', () => {
      const markup = render({ items: [], lastError: new Error('boom') })
      expect(markup).toContain('data-alert="error"')
      expect(markup).toContain('No notifications')
    })

    it('clicking the retry button invokes onRetry (wired to refresh())', () => {
      const onRetry = vi.fn()
      const { host, app } = mount({ items, lastError: new Error('x'), onRetry })
      const retryButton = host.querySelector('[data-mol-id="notification-center-retry"]')
      expect(retryButton).not.toBeNull()
      ;(retryButton as HTMLElement).click()
      expect(onRetry).toHaveBeenCalledOnce()
      app.unmount()
      host.remove()
    })
  })
})
