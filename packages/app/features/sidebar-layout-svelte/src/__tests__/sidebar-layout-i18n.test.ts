// @vitest-environment jsdom
/**
 * i18n tests for the Svelte sidebar layout — a port of
 * `@molecule/app-sidebar-layout-react/src/__tests__/sidebar-layout-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount (jsdom)
 * inside the conformance host's Molecule context. A provider whose `t` marks
 * every string proves a default that bypassed `t()`; a real `en`/`de` provider
 * proves the label follows a locale switch.
 *
 * @module
 */

import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Svelte suite uses.
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

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'

import type SidebarLayout from '../SidebarLayout.svelte'
import RoutedViewMock from './RoutedViewMock.svelte'
import SidebarLayoutHost from './SidebarLayoutHost.svelte'

/** The English values the real provider of the switch test carries. */
const EN = {
  'sidebarLayout.aria.primaryNavigation': 'Primary navigation',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'sidebarLayout.aria.primaryNavigation': 'Hauptnavigation',
}

/** The real `en`/`de` provider, set inside the switch test. */
let locales: I18nProvider

beforeEach(() => {
  // A provider whose `t` marks every string with its key, so a default that
  // bypassed t() would show up as plain English.
  setProvider({
    ...createSimpleI18nProvider('en'),
    t: (key) => `«en:${key}»`,
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** The one plain nav item every test renders. */
const navItems = [{ to: '/dashboard', key: 'dashboard', label: 'Dashboard' }]

/** A mounted component: its host element and the mount's teardown. */
interface Mounted {
  /** The element the Host rendered into. */
  readonly host: HTMLElement
  /** Unmounts the component and removes the host. */
  dispose(): void
}

/**
 * Mounts the sidebar inside the conformance host's router + Molecule context,
 * kept until the test disposes it so a locale switch re-renders in place.
 *
 * @param props - The component props.
 * @returns The mount.
 */
function mountHost(props: ComponentProps<typeof SidebarLayout>): Mounted {
  // The router every mount sits inside (React's react-router requirement).
  const router = createMemoryRouter({ initialEntries: ['/dashboard'] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(SidebarLayoutHost, {
    target: host,
    props: { config: { router }, props, routedView: RoutedViewMock },
  })
  flushSync()
  return {
    host,
    dispose: () => {
      unmount(instance)
      host.remove()
    },
  }
}

/** Mounts the sidebar and returns its markup. */
function render(props: ComponentProps<typeof SidebarLayout>): string {
  const mounted = mountHost(props)
  const markup = mounted.host.innerHTML
  mounted.dispose()
  return markup
}

describe('SidebarLayout i18n', () => {
  it('takes the nav region label through t with its key', () => {
    const markup = render({ appName: 'Acme', navItems })
    expect(markup).toContain('aria-label="«en:sidebarLayout.aria.primaryNavigation»"')
  })

  it('lets an explicit navAriaLabel prop override the translated default', () => {
    const markup = render({ appName: 'Acme', navItems, navAriaLabel: 'Nav override' })
    expect(markup).toContain('aria-label="Nav override"')
    expect(markup).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const mounted = mountHost({ appName: 'Acme', navItems })
    const nav = mounted.host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Primary navigation')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    void locales.setLocale('de')
    flushSync()
    expect(nav?.getAttribute('aria-label')).toBe('Hauptnavigation')

    mounted.dispose()
  })
})
