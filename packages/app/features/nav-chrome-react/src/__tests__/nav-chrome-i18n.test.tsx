/**
 * The shells' own visible text goes through `t()`.
 *
 * The four `<nav>` landmark names are user-visible text a screen reader
 * announces ("<name> navigation"), so each must reach the screen through
 * `t('navChrome.aria.<key>', undefined, { defaultValue })` — not a JSX
 * literal. The test mocks `useTranslation()` with a `t` that echoes its key,
 * so a label that bypassed `t` would render as plain English instead of the
 * marked key.
 *
 * @module
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name, so the assertion reads the attribute alone.
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
// A `t` that echoes its key: a label that bypassed t() would show as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { AppShellBottomNav } = await import('../AppShellBottomNav.js')
const { AppShellFooter } = await import('../AppShellFooter.js')
const { AppShellSideNav } = await import('../AppShellSideNav.js')
const { AppShellTopNav } = await import('../AppShellTopNav.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const nav = (id: string): { id: string; label: string } => ({ id, label: `label-${id}` })

describe('AppShellBottomNav', () => {
  it('labels the bottom nav region through t()', () => {
    const markup = html(createElement(AppShellBottomNav, { items: [nav('a')] }))
    expect(markup).toContain('aria-label="«navChrome.aria.bottom»"')
  })
})

describe('AppShellFooter', () => {
  it('labels the footer links region through t()', () => {
    const markup = html(
      createElement(AppShellFooter, { links: [{ label: 'Privacy', to: '/privacy' }] }),
    )
    expect(markup).toContain('aria-label="«navChrome.aria.footer»"')
  })
})

describe('AppShellSideNav', () => {
  it('labels the side nav region through t()', () => {
    const markup = html(createElement(AppShellSideNav, { items: [nav('a')] }))
    expect(markup).toContain('aria-label="«navChrome.aria.sidebar»"')
  })
})

describe('AppShellTopNav', () => {
  it('labels the top nav region through t()', () => {
    const markup = html(createElement(AppShellTopNav, { items: [nav('a')] }))
    expect(markup).toContain('aria-label="«navChrome.aria.main»"')
  })
})
