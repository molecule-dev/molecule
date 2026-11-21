// @vitest-environment jsdom
/**
 * The Svelte shells' own visible text goes through `t()` — a port of
 * `@molecule/app-nav-chrome-react/src/__tests__/nav-chrome-i18n.test.tsx`:
 * the same test names and assertions. The four `<nav>` landmark names are
 * user-visible text a screen reader announces, so each must reach the screen
 * through `t('navChrome.aria.<key>', undefined, { defaultValue })`. The test
 * mocks `useTranslation()` from `@molecule/app-svelte` with a `t` that echoes
 * its key, so a label that bypassed `t` would render as plain English instead
 * of the marked key.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import AppShellBottomNav from '../AppShellBottomNav.svelte'
import AppShellFooter from '../AppShellFooter.svelte'
import AppShellSideNav from '../AppShellSideNav.svelte'
import AppShellTopNav from '../AppShellTopNav.svelte'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a component and returns its container's markup. */
const render = (component: unknown, props: Record<string, unknown> = {}): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.push(mount(component as never, { target: container, props }))
  flushSync()
  return container.innerHTML
}

const nav = (id: string): { id: string; label: string } => ({ id, label: `label-${id}` })

describe('AppShellBottomNav', () => {
  it('labels the bottom nav region through t()', () => {
    const markup = render(AppShellBottomNav, { items: [nav('a')] })
    expect(markup).toContain('aria-label="«navChrome.aria.bottom»"')
  })
})

describe('AppShellFooter', () => {
  it('labels the footer links region through t()', () => {
    const markup = render(AppShellFooter, { links: [{ label: 'Privacy', to: '/privacy' }] })
    expect(markup).toContain('aria-label="«navChrome.aria.footer»"')
  })
})

describe('AppShellSideNav', () => {
  it('labels the side nav region through t()', () => {
    const markup = render(AppShellSideNav, { items: [nav('a')] })
    expect(markup).toContain('aria-label="«navChrome.aria.sidebar»"')
  })
})

describe('AppShellTopNav', () => {
  it('labels the top nav region through t()', () => {
    const markup = render(AppShellTopNav, { items: [nav('a')] })
    expect(markup).toContain('aria-label="«navChrome.aria.main»"')
  })
})
