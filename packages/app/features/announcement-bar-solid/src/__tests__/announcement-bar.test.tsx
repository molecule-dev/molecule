// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AnnouncementBar` — a port of
 * `@molecule/app-announcement-bar-react/src/__tests__/announcement-bar.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textSize`), so tests can assert which cm.* class was applied without a real
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { AnnouncementBarProps } from '../types.js'

const { AnnouncementBar } = await import('../AnnouncementBar.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders an {@link AnnouncementBar} and returns the container's markup. */
function renderBar(props: AnnouncementBarProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <AnnouncementBar {...props} />, container))
  return container.innerHTML
}

describe('AnnouncementBar', () => {
  it('renders the message with role="status" and the kind data attribute', () => {
    const markup = renderBar({ kind: 'promo', children: 'New feature!' })
    expect(markup).toContain('role="status"')
    expect(markup).toContain('data-kind="promo"')
    expect(markup).toContain('New feature!')
  })

  it('defaults the kind to "info"', () => {
    const markup = renderBar({ children: 'X' })
    expect(markup).toContain('data-kind="info"')
  })

  it('renders the icon slot', () => {
    const markup = renderBar({ children: 'X', icon: <span data-icon="" /> })
    expect(markup).toContain('data-icon=""')
  })

  it('renders an action as a link when href is given, a button otherwise', () => {
    const asLink = renderBar({ children: 'X', action: { label: 'Learn more', href: '/more' } })
    expect(asLink).toContain('href="/more"')
    expect(asLink).toContain('Learn more')
    const asButton = renderBar({ children: 'X', action: { label: 'Do it', onClick: () => {} } })
    expect(asButton).toContain('Do it')
    expect(asButton).not.toContain('href=')
  })

  it('renders the dismiss button by default and hides it when dismissible is false', () => {
    const withDismiss = renderBar({ children: 'X' })
    expect(withDismiss).toContain('aria-label="Dismiss"')
    const without = renderBar({ children: 'X', dismissible: false })
    expect(without).not.toContain('aria-label="Dismiss"')
  })

  it('renders nothing when controlled visible is false', () => {
    const markup = renderBar({ children: 'X', visible: false })
    expect(markup).not.toContain('role="status"')
    expect(markup).toBe('')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = renderBar({ children: 'X', dataMolId: 'ann-x', className: 'ab-cls' })
    expect(markup).toContain('data-mol-id="ann-x"')
    expect(markup).toContain('ab-cls')
  })
})
