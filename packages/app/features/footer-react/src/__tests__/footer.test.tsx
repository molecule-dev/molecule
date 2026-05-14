import { createElement } from 'react'
import type { ReactNode } from 'react'
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
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
    locale: 'en',
    setLocale: () => {},
    locales: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
    ],
  }),
  useVersion: () => ({ state: { version: '2.0.0' } }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Icon: ({ name }: { name?: string }) => createElement('span', { 'data-icon': name }),
  Modal: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? createElement('div', { 'data-modal': '' }, children) : null,
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
}))

const { AppFooter } = await import('../AppFooter.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('AppFooter', () => {
  it('renders the About link with the interpolated app name', () => {
    const markup = html(createElement(AppFooter, { appName: 'Acme', aboutHref: '/about' }))
    expect(markup).toContain('About Acme')
  })

  it('renders an external About href as a target=_blank anchor', () => {
    const markup = html(
      createElement(AppFooter, { appName: 'Acme', aboutHref: 'https://acme.com' }),
    )
    expect(markup).toContain('href="https://acme.com"')
    expect(markup).toContain('target="_blank"')
  })

  it('renders an internal About href as a router Link', () => {
    const markup = html(createElement(AppFooter, { appName: 'Acme', aboutHref: '/about' }))
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('href="/about"')
  })

  it('renders Privacy/Terms as buttons in modal mode', () => {
    const markup = html(createElement(AppFooter, { appName: 'Acme', aboutHref: '/about' }))
    expect(markup).toContain('Privacy Policy')
    expect(markup).toContain('Terms of Service')
    expect(markup).toMatch(/<button[^>]*>Privacy Policy/)
  })

  it('renders Privacy/Terms as router Links in route mode', () => {
    const markup = html(
      createElement(AppFooter, { appName: 'Acme', aboutHref: '/about', legalMode: 'route' }),
    )
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('href="/terms"')
  })

  it('renders the language button and the version string', () => {
    const markup = html(createElement(AppFooter, { appName: 'Acme', aboutHref: '/about' }))
    expect(markup).toContain('data-icon="globe"')
    expect(markup).toContain('English')
    expect(markup).toContain('v2.0.0')
  })

  it('keeps the privacy/terms modals closed initially', () => {
    const markup = html(createElement(AppFooter, { appName: 'Acme', aboutHref: '/about' }))
    expect(markup).not.toContain('data-modal=""')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(AppFooter, {
        appName: 'Acme',
        aboutHref: '/about',
        dataMolId: 'footer-x',
        className: 'ft-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="footer-x"')
    expect(markup).toContain('ft-cls')
  })
})
