// @vitest-environment jsdom
/**
 * i18n tests of `SettingsSidebar` — the port of
 * `@molecule/app-settings-container-react/src/__tests__/settings-container-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the suite uses). A provider
 * whose `t` marks every string proves a default that bypassed `t()`; a real
 * `en`/`de` provider proves the label follows a locale switch.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Angular suite uses.
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

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

const { SettingsSidebar } = await import('../settings-sidebar.component.js')

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

/** A mounted spec host: its DOM, a change-detection tick and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass over the mounted app. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts one component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param component - The component class under test.
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(
  component: Type<unknown>,
  template: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

/** Mounts a `SettingsSidebar` with the given inputs. */
const renderSidebar = (props: Record<string, unknown> = {}): Promise<Mounted> =>
  render(
    SettingsSidebar as Type<unknown>,
    `<nav mol-settings-sidebar [items]="p['items']" [activeId]="p['activeId']" [onSelect]="p['onSelect']" [ariaLabel]="p['ariaLabel']"></nav>`,
    props,
  )

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SettingsSidebar i18n', () => {
  it('takes the nav region label through t when no ariaLabel is given', async () => {
    const { host } = await renderSidebar({ items, activeId: 'profile', onSelect: () => {} })
    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('«en:settingsContainer.aria.settings»')
  })

  it('lets an explicit ariaLabel prop override the translated default', async () => {
    const { host } = await renderSidebar({
      items,
      activeId: 'profile',
      onSelect: () => {},
      ariaLabel: 'Nav override',
    })
    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Nav override')
    expect(nav?.getAttribute('aria-label')).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', async () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const view = await renderSidebar({ items, activeId: 'profile', onSelect: () => {} })
    const nav = view.host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Settings')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    view.tick()
    expect(nav?.getAttribute('aria-label')).toBe('Einstellungen')
  })
})
