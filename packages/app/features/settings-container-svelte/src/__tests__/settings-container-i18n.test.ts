// @vitest-environment jsdom
/**
 * i18n tests for the Svelte settings sidebar — a port of
 * `@molecule/app-settings-container-react/src/__tests__/settings-container-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount (jsdom).
 * A provider whose `t` marks every string proves a default that bypassed `t()`;
 * a real `en`/`de` provider proves the label follows a locale switch.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

import SettingsSidebar from '../SettingsSidebar.svelte'
import Host from './Host.svelte'

/** The English values the real provider of the switch test carries. */
const EN = {
  'settingsContainer.aria.settings': 'Settings',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'settingsContainer.aria.settings': 'Einstellungen',
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

/** The two plain nav items every test renders. */
const items = [
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing' },
]

/** A mounted component: its host element and the mount's teardown. */
interface Mounted {
  /** The element the Host rendered into. */
  readonly host: HTMLElement
  /** Unmounts the component and removes the host. */
  dispose(): void
}

/**
 * Mounts a component with the given props, kept until the test disposes it so
 * a locale switch re-renders in place.
 *
 * @param component - The component to mount.
 * @param props - The component props.
 * @returns The mount.
 */
function mountHost<Props extends object>(
  component: Component<Props>,
  props: NoInfer<Props>,
): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host<Props>, {
    target: host,
    props: {
      config: {},
      component,
      props,
    },
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

/**
 * Mounts a component and returns its markup (the host's inner HTML).
 *
 * @param component - The component to mount.
 * @param props - The component props.
 * @returns The markup of the mounted component.
 */
function render<Props extends object>(component: Component<Props>, props: NoInfer<Props>): string {
  const mounted = mountHost(component, props)
  const markup = mounted.host.innerHTML
  mounted.dispose()
  return markup
}

describe('SettingsSidebar i18n', () => {
  it('takes the nav region label through t when no ariaLabel is given', () => {
    const markup = render(SettingsSidebar, { items, activeId: 'profile', onSelect: () => {} })
    expect(markup).toContain('aria-label="«en:settingsContainer.aria.settings»"')
  })

  it('lets an explicit ariaLabel prop override the translated default', () => {
    const markup = render(SettingsSidebar, {
      items,
      activeId: 'profile',
      onSelect: () => {},
      ariaLabel: 'Nav override',
    })
    expect(markup).toContain('aria-label="Nav override"')
    expect(markup).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const mounted = mountHost(SettingsSidebar, { items, activeId: 'profile', onSelect: () => {} })
    const nav = mounted.host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Settings')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    void locales.setLocale('de')
    flushSync()
    expect(nav?.getAttribute('aria-label')).toBe('Einstellungen')

    mounted.dispose()
  })
})
