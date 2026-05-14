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

const { AnnouncementBar } = await import('../AnnouncementBar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('AnnouncementBar', () => {
  it('renders the message with role="status" and the kind data attribute', () => {
    const markup = html(createElement(AnnouncementBar, { children: 'New feature!', kind: 'promo' }))
    expect(markup).toContain('role="status"')
    expect(markup).toContain('data-kind="promo"')
    expect(markup).toContain('New feature!')
  })

  it('defaults the kind to "info"', () => {
    const markup = html(createElement(AnnouncementBar, { children: 'X' }))
    expect(markup).toContain('data-kind="info"')
  })

  it('renders the icon slot', () => {
    const markup = html(
      createElement(AnnouncementBar, {
        children: 'X',
        icon: createElement('span', { 'data-icon': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('renders an action as a link when href is given, a button otherwise', () => {
    const asLink = html(
      createElement(AnnouncementBar, {
        children: 'X',
        action: { label: 'Learn more', href: '/more' },
      }),
    )
    expect(asLink).toContain('href="/more"')
    expect(asLink).toContain('Learn more')
    const asButton = html(
      createElement(AnnouncementBar, {
        children: 'X',
        action: { label: 'Do it', onClick: () => {} },
      }),
    )
    expect(asButton).toContain('Do it')
    expect(asButton).not.toContain('href=')
  })

  it('renders the dismiss button by default and hides it when dismissible is false', () => {
    const withDismiss = html(createElement(AnnouncementBar, { children: 'X' }))
    expect(withDismiss).toContain('aria-label="Dismiss"')
    const without = html(createElement(AnnouncementBar, { children: 'X', dismissible: false }))
    expect(without).not.toContain('aria-label="Dismiss"')
  })

  it('renders nothing when controlled visible is false', () => {
    const markup = html(createElement(AnnouncementBar, { children: 'X', visible: false }))
    expect(markup).toBe('')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(AnnouncementBar, { children: 'X', dataMolId: 'ann-x', className: 'ab-cls' }),
    )
    expect(markup).toContain('data-mol-id="ann-x"')
    expect(markup).toContain('ab-cls')
  })
})
