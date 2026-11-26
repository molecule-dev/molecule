import type { Context, ReactElement, ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { LinkProps } from '@molecule/app-react/link'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Flex: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-flex': '' }, children),
  ThemeToggle: () => createElement('button', { 'data-theme-toggle': '' }),
  // UserMenu takes its settings panel as CHILDREN (the real API) — render them
  // so the documented @example composition can be exercised through AppHeader.
  UserMenu: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-user-menu': '' }, children),
}))

// Real React contexts so the header's default theme-toggle can probe for
// provider presence. `useContext` returns `null` when a Provider is absent
// (it does NOT throw), which is exactly what makes the header degrade
// gracefully instead of crashing the real hook-calling ThemeToggle.
vi.mock('@molecule/app-react', async (importOriginal) => {
  const { createContext } = await import('react')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    ThemeContext: createContext<unknown>(null),
    I18nContext: createContext<unknown>(null),
  }
})

vi.mock('@molecule/app-react/link', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Link: ({ to, ...props }: LinkProps) =>
    createElement('a', { ...props, href: String(to), 'data-link': '' }),
}))

const { AppHeader } = await import('../AppHeader.js')
const { ThemeContext, I18nContext } = (await import('@molecule/app-react')) as unknown as {
  ThemeContext: Context<unknown>
  I18nContext: Context<unknown>
}
const { UserMenu } = (await import('@molecule/app-ui-react')) as unknown as {
  UserMenu: (props: { children?: ReactNode }) => ReactElement
}

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Wrap a node in both Theme + I18n providers (the state a real wired app has). */
const withProviders = (node: ReactNode): ReactElement =>
  createElement(
    ThemeContext.Provider,
    { value: {} },
    createElement(I18nContext.Provider, { value: {} }, node),
  )

describe('AppHeader', () => {
  it('renders the brand and each declared destination as links in the primary navigation landmark', () => {
    const markup = html(
      createElement(AppHeader, {
        appName: 'Field Notes',
        brandClassName: 'wordmark',
        navigation: {
          label: 'Site',
          className: 'site-navigation',
          listClassName: 'site-links',
          itemClassName: 'site-link-item',
          links: {
            '/': { children: 'Home' },
            '/notebooks/42': {
              className: 'account-link',
              'aria-current': 'page',
              children: createElement(
                'span',
                null,
                createElement('img', { src: '/avatar.png', alt: '' }),
                'My notebook',
              ),
            },
          },
        },
        extraActions: createElement('button', { type: 'button' }, 'Preferences'),
      }),
    )
    const nav = markup.match(/<nav\b[^>]*aria-label="Site"[^>]*>([\s\S]+?)<\/nav>/)?.[1]
    expect(nav).toBeDefined()
    expect(markup).toMatch(/<nav[^>]*class="[^"]*site-navigation"/)
    expect(nav).toMatch(/<a[^>]*class="wordmark"[^>]*href="\/"/)
    expect(nav).toContain('<ul class="site-links">')
    expect(nav?.match(/<li class="site-link-item">/g)).toHaveLength(2)
    expect(nav?.match(/href="\/notebooks\/42"/g)).toHaveLength(1)
    expect(nav).toMatch(
      /<a[^>]*class="account-link"[^>]*aria-current="page"[^>]*>.*avatar\.png.*My notebook.*<\/a>/,
    )
    expect(nav?.match(/href="\/"/g)).toHaveLength(2)
    expect(nav).toContain('Preferences')
  })

  it('keeps a brand-and-actions header without a primary navigation landmark', () => {
    const markup = html(
      createElement(AppHeader, {
        appName: 'Field Notes',
        extraActions: createElement('button', { type: 'button' }, 'Preferences'),
      }),
    )
    expect(markup).toContain('Field Notes')
    expect(markup).toContain('Preferences')
    expect(markup).not.toContain('<nav')
  })

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

  it('mounts without Theme/I18n providers WITHOUT throwing', () => {
    expect(() => html(createElement(AppHeader, { appName: 'Acme' }))).not.toThrow()
    // The header still renders (brand is present) — it just degrades the toggle.
    expect(html(createElement(AppHeader, { appName: 'Acme' }))).toContain('Acme')
  })

  it('omits the default theme toggle when Theme/I18n providers are absent', () => {
    expect(html(createElement(AppHeader, { appName: 'Acme' }))).not.toContain('data-theme-toggle')
  })

  it('omits the default toggle when only ONE of the two providers is present', () => {
    const onlyTheme = html(
      createElement(
        ThemeContext.Provider,
        { value: {} },
        createElement(AppHeader, { appName: 'Acme' }),
      ),
    )
    expect(onlyTheme).not.toContain('data-theme-toggle')
    const onlyI18n = html(
      createElement(
        I18nContext.Provider,
        { value: {} },
        createElement(AppHeader, { appName: 'Acme' }),
      ),
    )
    expect(onlyI18n).not.toContain('data-theme-toggle')
  })

  it('renders the default theme toggle once BOTH providers are mounted', () => {
    expect(html(withProviders(createElement(AppHeader, { appName: 'Acme' })))).toContain(
      'data-theme-toggle=""',
    )
  })

  it('hides the toggle when themeToggle is null even with providers, and honours a custom node', () => {
    expect(
      html(withProviders(createElement(AppHeader, { appName: 'Acme', themeToggle: null }))),
    ).not.toContain('data-theme-toggle')
    expect(
      html(
        createElement(AppHeader, {
          appName: 'Acme',
          themeToggle: createElement('span', { 'data-custom-toggle': '' }),
        }),
      ),
    ).toContain('data-custom-toggle=""')
  })

  it('renders the documented UserMenu-as-userMenu composition (children API, no renderPanel)', () => {
    // Mirrors the module @example: UserMenu receives its settings panel as
    // CHILDREN — proving the documented prop shape is the real one.
    const markup = html(
      createElement(AppHeader, {
        appName: 'Bearing',
        userMenu: createElement(UserMenu, {
          children: createElement('div', { 'data-settings-panel': '' }, 'Settings'),
        }),
      }),
    )
    expect(markup).toContain('data-user-menu=""')
    expect(markup).toContain('data-settings-panel=""')
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
