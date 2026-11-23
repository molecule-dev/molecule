// @vitest-environment jsdom
/**
 * i18n tests of `PresenceDot` — the port of
 * `@molecule/app-presence-indicator-react/src/__tests__/presence-indicator-i18n.test.tsx`:
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

const { PresenceDot } = await import('../presence-dot.component.js')

/** The English values the real provider of the switch test carries. */
const EN = {
  'presenceIndicator.aria.presence': 'Presence: {{status}}',
  'presenceIndicator.status.online': 'online',
  'presenceIndicator.status.away': 'away',
  'presenceIndicator.status.busy': 'busy',
  'presenceIndicator.status.offline': 'offline',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'presenceIndicator.aria.presence': 'Anwesenheit: {{status}}',
  'presenceIndicator.status.online': 'online',
  'presenceIndicator.status.away': 'abwesend',
  'presenceIndicator.status.busy': 'beschäftigt',
  'presenceIndicator.status.offline': 'offline',
}

/** The real `en`/`de` provider, set inside the switch test. */
let locales: I18nProvider

beforeEach(() => {
  // A provider whose `t` marks every string with its key, so a default that
  // bypassed t() would show up as plain English.
  setProvider({
    ...createSimpleI18nProvider('en'),
    t: (key, values) =>
      values?.status === undefined ? `«en:${key}»` : `«en:${key}»⟨${String(values.status)}⟩`,
  })
})

afterEach(() => {
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

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
    changeDetection: ChangeDetectionStrategy.Eager,
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

/** Mounts a `PresenceDot` with the given inputs. */
const renderDot = (props: Record<string, unknown> = {}): Promise<Mounted> =>
  render(
    PresenceDot as Type<unknown>,
    `<span mol-presence-dot [status]="p['status']" [size]="p['size']" [position]="p['position']" [corner]="p['corner']" [ariaLabel]="p['ariaLabel']" [className]="p['className']"></span>`,
    props,
  )

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('PresenceDot i18n', () => {
  it('takes the presence label through t when no ariaLabel is given', async () => {
    const { host } = await renderDot({ status: 'online' })
    const dot = host.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe(
      '«en:presenceIndicator.aria.presence»⟨«en:presenceIndicator.status.online»⟩',
    )
  })

  it('lets an explicit ariaLabel prop override the translated default', async () => {
    const { host } = await renderDot({ status: 'busy', ariaLabel: 'Do not disturb' })
    const dot = host.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe('Do not disturb')
    expect(dot?.getAttribute('aria-label')).not.toContain('«')
  })

  it('renders each status word through its own key', async () => {
    for (const status of ['online', 'away', 'busy', 'offline']) {
      const { host } = await renderDot({ status })
      expect(host.innerHTML).toContain(`«en:presenceIndicator.status.${status}»`)
    }
  })

  it('renders the label in the locale the provider switches to', async () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const view = await renderDot({ status: 'away' })
    const dot = view.host.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe('Presence: away')

    // The switch itself: the label must re-render in German. Against the old
    // template literal this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    view.tick()
    expect(dot?.getAttribute('aria-label')).toBe('Anwesenheit: abwesend')
  })
})
