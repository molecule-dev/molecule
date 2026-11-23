// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular `HabitStreakCard`'s heatmap labels
 * — a port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-locale-switch.test.tsx`:
 * the same test name and assertion. The component reads `t` through the
 * injection-context `useTranslation()` and binds the strip's label and each
 * square's tooltip (`[attr.aria-label]`, `[attr.title]`), so a switch
 * re-renders the text. This test bonds a provider with an `en` and a `fr`
 * value for the strip label and the day tooltip the component renders, renders
 * it in `en`, switches to `fr`, and asserts the DOM now shows the French
 * values (the day tooltip re-interpolated with the same date and count).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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

import { HabitStreakCard } from '../habit-streak-card.component.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'habit.aria.recentActivity': 'Recent activity',
        'habit.cell.tooltip': '{{date}}: {{count}}',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'habit.aria.recentActivity': 'Activité récente',
        'habit.cell.tooltip': '{{date}} : {{count}}',
      },
    },
  ])
  setProvider(provider)
})

/** A mounted spec host. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass over the mounted tree. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mountedHosts: Mounted[] = []

afterEach(async () => {
  for (const m of mountedHosts.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HabitStreakCard locale switch', () => {
  it('renders the heatmap labels in French after setLocale', async () => {
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [HabitStreakCard as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div mol-habit-streak-card [name]="'M'" [currentStreak]="2" [heatmap]="p['heatmap']"></div>`,
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = {
          heatmap: [
            { date: '2026-05-01', count: 0 },
            { date: '2026-05-02', count: 3 },
          ],
        }
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection()],
    })
    const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    mountedHosts.push({
      host,
      tick: () => appRef.tick(),
      destroy: async () => {
        appRef.destroy()
        host.remove()
      },
    })

    const strip = () => host.querySelector('[aria-label]')!
    expect(strip().getAttribute('aria-label')).toBe('Recent activity')
    expect(host.querySelector('span[title="2026-05-01: 0"]')).not.toBeNull()

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')
    appRef.tick()

    expect(strip().getAttribute('aria-label')).toBe('Activité récente')
    expect(host.querySelector('span[title="2026-05-01 : 0"]')).not.toBeNull()
    expect(host.querySelector('span[title="2026-05-02 : 3"]')).not.toBeNull()
    expect(host.querySelector('span[title="2026-05-01: 0"]')).toBeNull()
  })
})
