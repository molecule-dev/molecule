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
  Switch: ({ checked }: { checked?: boolean }) =>
    createElement('input', { type: 'checkbox', 'data-switch': '', checked, readOnly: true }),
}))

const { CookieBanner } = await import('../CookieBanner.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('CookieBanner', () => {
  it('renders nothing when visible is false', () => {
    expect(html(createElement(CookieBanner, { visible: false }))).toBe('')
  })

  it('renders the default title and description', () => {
    const markup = html(createElement(CookieBanner, {}))
    expect(markup).toContain('We use cookies')
    expect(markup).toContain('improve your experience')
  })

  it('honours a custom title and description', () => {
    const markup = html(
      createElement(CookieBanner, { title: 'Cookies?', description: 'our own copy' }),
    )
    expect(markup).toContain('Cookies?')
    expect(markup).toContain('our own copy')
  })

  it('renders a "Learn more" policy link when policyHref is supplied', () => {
    const markup = html(createElement(CookieBanner, { policyHref: '/privacy' }))
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('Learn more')
  })

  it('always renders the accept and reject buttons', () => {
    const markup = html(createElement(CookieBanner, {}))
    expect(markup).toContain('Accept all')
    expect(markup).toContain('Reject all')
  })

  it('renders the customize button only when categories are supplied', () => {
    const withCats = html(
      createElement(CookieBanner, {
        categories: [{ id: 'analytics', label: 'Analytics' }],
      }),
    )
    expect(withCats).toContain('Customize')
    const without = html(createElement(CookieBanner, {}))
    expect(without).not.toContain('Customize')
  })

  it('exposes a labelled dialog role and forwards className', () => {
    const markup = html(createElement(CookieBanner, { className: 'cbn-cls' }))
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('cbn-cls')
  })
})
