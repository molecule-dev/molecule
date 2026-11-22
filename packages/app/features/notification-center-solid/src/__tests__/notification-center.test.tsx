// @vitest-environment jsdom
/**
 * Unit tests for the Solid `NotificationCenter` — a port of
 * `@molecule/app-notification-center-react/src/__tests__/notification-center.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-alert` markers the React tests mock the UI package
// with. The mock Button forwards `onClick` to the native button so a real
// dispatch reaches the handler, as React's DOM button does.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    onClick?: (event: MouseEvent) => void
    'data-mol-id'?: string
  }) => (
    <button data-button="" data-mol-id={props['data-mol-id']} onClick={props.onClick}>
      {props.children}
    </button>
  ),
  Alert: (props: { children?: JSX.Element; status?: string }) => (
    <div data-alert={props.status ?? ''}>{props.children}</div>
  ),
}))

import { NotificationCenter } from '../NotificationCenter.jsx'

const items = [
  { id: '1', title: 'New comment', body: 'on your post', timestamp: '2m', read: false },
  { id: '2', title: 'Build passed', read: true },
]

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('NotificationCenter', () => {
  it('renders the default title and a custom title', () => {
    expect(mount(() => <NotificationCenter items={items} />).innerHTML).toContain('Notifications')
    expect(mount(() => <NotificationCenter items={items} title="Alerts" />).innerHTML).toContain(
      'Alerts',
    )
  })

  it('renders an item per notification with title and body', () => {
    const markup = mount(() => <NotificationCenter items={items} />).innerHTML
    expect(markup).toContain('New comment')
    expect(markup).toContain('on your post')
    expect(markup).toContain('Build passed')
  })

  it('renders the unread dot + tint only on unread items', () => {
    const markup = mount(() => <NotificationCenter items={items} />).innerHTML
    // one unread item → one tinted row and one dot
    expect(markup.split('bgPrimarySubtle').length - 1).toBe(1)
    expect(markup.split('roundedFull').length - 1).toBe(1)
    expect(markup).not.toContain('rgba(96')
  })

  it("an unread row is tinted with the theme's primary, not a fixed colour", () => {
    const markup = mount(() => <NotificationCenter items={items} />).innerHTML
    // the theme token, not an inline background
    expect(markup).toContain('bgPrimarySubtle')
    expect(markup).not.toContain('background:')
    // a read row is unchanged: no tint
    const read = mount(() => (
      <NotificationCenter items={[{ id: '2', title: 'Build passed', read: true }]} />
    )).innerHTML
    expect(read).not.toContain('bgPrimarySubtle')
  })

  it('an unread row announces Unread to screen readers', () => {
    const markup = mount(() => <NotificationCenter items={items} />).innerHTML
    // the sr-only label through t(), announced before the title
    expect(markup).toContain('srOnly')
    expect(markup).toContain('Unread')
    // absent on a read row
    const read = mount(() => (
      <NotificationCenter items={[{ id: '2', title: 'Build passed', read: true }]} />
    )).innerHTML
    expect(read).not.toContain('srOnly')
    expect(read).not.toContain('Unread')
  })

  it('renders the default empty message when there are no items', () => {
    const markup = mount(() => <NotificationCenter items={[]} />).innerHTML
    expect(markup).toContain('No notifications')
  })

  it('renders a custom emptyState when supplied', () => {
    const markup = mount(() => (
      <NotificationCenter items={[]} emptyState={<p data-empty="">All caught up</p>} />
    )).innerHTML
    expect(markup).toContain('data-empty=""')
  })

  it('renders mark-all-read and view-all only when their handlers + items exist', () => {
    const full = mount(() => (
      <NotificationCenter items={items} onMarkAllRead={() => {}} onViewAll={() => {}} />
    )).innerHTML
    expect(full).toContain('Mark all as read')
    expect(full).toContain('View all')
    const empty = mount(() => (
      <NotificationCenter items={[]} onMarkAllRead={() => {}} onViewAll={() => {}} />
    )).innerHTML
    expect(empty).not.toContain('Mark all as read')
    expect(empty).not.toContain('View all')
  })

  it('forwards className', () => {
    const markup = mount(() => <NotificationCenter items={items} className="ncn-cls" />).innerHTML
    expect(markup).toContain('ncn-cls')
  })

  describe('error banner (lastError)', () => {
    it('renders no banner when lastError is unset', () => {
      const markup = mount(() => <NotificationCenter items={items} />).innerHTML
      expect(markup).not.toContain('data-alert')
    })

    it('renders an error banner with retry text when lastError is set, even though items are already loaded', () => {
      const markup = mount(() => (
        <NotificationCenter items={items} lastError={new Error('Network error')} />
      )).innerHTML
      expect(markup).toContain('data-alert="error"')
      expect(markup).toContain('Could not load notifications.')
      expect(markup).toContain('Retry')
      // The banner must not replace the (stale-but-populated) list.
      expect(markup).toContain('New comment')
      expect(markup).toContain('Build passed')
    })

    it('renders the banner alongside the empty state when there are no items yet', () => {
      const markup = mount(() => (
        <NotificationCenter items={[]} lastError={new Error('boom')} />
      )).innerHTML
      expect(markup).toContain('data-alert="error"')
      expect(markup).toContain('No notifications')
    })

    it('clicking the retry button invokes onRetry (wired to refresh())', () => {
      const onRetry = vi.fn()
      const container = mount(() => (
        <NotificationCenter items={items} lastError={new Error('x')} onRetry={onRetry} />
      ))
      const retryButton = container.querySelector('[data-mol-id="notification-center-retry"]')
      expect(retryButton).not.toBeNull()
      ;(retryButton as HTMLElement).click()
      expect(onRetry).toHaveBeenCalledOnce()
    })
  })
})
