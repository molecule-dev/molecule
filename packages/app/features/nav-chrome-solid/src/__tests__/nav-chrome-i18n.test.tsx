// @vitest-environment jsdom
/**
 * The Solid shells' own visible text goes through `t()` — a port of
 * `@molecule/app-nav-chrome-react/src/__tests__/nav-chrome-i18n.test.tsx`:
 * the same test names and assertions. The four `<nav>` landmark names are
 * user-visible text a screen reader announces, so each must reach the screen
 * through `t('navChrome.aria.<key>', undefined, { defaultValue })`. The test
 * mocks `useTranslation()` from `@molecule/app-solid` with a `t` that echoes
 * its key, so a label that bypassed `t` would render as plain English instead
 * of the marked key.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name, so the assertion reads the attribute alone.
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
// A `t` that echoes its key: a label that bypassed t() would show as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { AppShellBottomNav } = await import('../AppShellBottomNav.jsx')
const { AppShellFooter } = await import('../AppShellFooter.jsx')
const { AppShellSideNav } = await import('../AppShellSideNav.jsx')
const { AppShellTopNav } = await import('../AppShellTopNav.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders with Solid's browser renderer and disposes after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const nav = (id: string): { id: string; label: string } => ({ id, label: `label-${id}` })

describe('AppShellBottomNav', () => {
  it('labels the bottom nav region through t()', () => {
    const markup = mount(() => <AppShellBottomNav items={[nav('a')]} />).innerHTML
    expect(markup).toContain('aria-label="«navChrome.aria.bottom»"')
  })
})

describe('AppShellFooter', () => {
  it('labels the footer links region through t()', () => {
    const markup = mount(() => (
      <AppShellFooter links={[{ label: 'Privacy', to: '/privacy' }]} />
    )).innerHTML
    expect(markup).toContain('aria-label="«navChrome.aria.footer»"')
  })
})

describe('AppShellSideNav', () => {
  it('labels the side nav region through t()', () => {
    const markup = mount(() => <AppShellSideNav items={[nav('a')]} />).innerHTML
    expect(markup).toContain('aria-label="«navChrome.aria.sidebar»"')
  })
})

describe('AppShellTopNav', () => {
  it('labels the top nav region through t()', () => {
    const markup = mount(() => <AppShellTopNav items={[nav('a')]} />).innerHTML
    expect(markup).toContain('aria-label="«navChrome.aria.main»"')
  })
})
