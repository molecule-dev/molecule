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

vi.mock('@molecule/app-ui-react', () => ({
  Flex: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-flex': '' }, children),
  ThemeToggle: () => createElement('button', { 'data-theme-toggle': '' }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
}))

const { AppHeader } = await import('../AppHeader.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('AppHeader', () => {
  it('renders the appName and the logo image', () => {
    const markup = html(createElement(AppHeader, { appName: 'Acme' }))
    expect(markup).toContain('Acme')
    expect(markup).toContain('<img')
    expect(markup).toContain('src="/logo.svg"')
  })

  it('honours a custom logoSrc and logoSize', () => {
    const markup = html(
      createElement(AppHeader, { appName: 'Acme', logoSrc: '/brand.png', logoSize: 48 }),
    )
    expect(markup).toContain('src="/brand.png"')
    expect(markup).toContain('width="48"')
  })

  it('links the brand to "/" by default and to a custom brandTo', () => {
    expect(html(createElement(AppHeader, { appName: 'Acme' }))).toContain('href="/"')
    expect(html(createElement(AppHeader, { appName: 'Acme', brandTo: '/home' }))).toContain(
      'href="/home"',
    )
  })

  it('renders the default ThemeToggle and hides it when themeToggle is null', () => {
    expect(html(createElement(AppHeader, { appName: 'Acme' }))).toContain('data-theme-toggle=""')
    expect(html(createElement(AppHeader, { appName: 'Acme', themeToggle: null }))).not.toContain(
      'data-theme-toggle',
    )
  })

  it('renders the userMenu and extraActions slots', () => {
    const markup = html(
      createElement(AppHeader, {
        appName: 'Acme',
        userMenu: createElement('div', { 'data-user-menu': '' }),
        extraActions: createElement('div', { 'data-extra': '' }),
      }),
    )
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-extra=""')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(AppHeader, { appName: 'Acme', dataMolId: 'hdr-x', className: 'hdr-cls' }),
    )
    expect(markup).toContain('data-mol-id="hdr-x"')
    expect(markup).toContain('hdr-cls')
  })
})
