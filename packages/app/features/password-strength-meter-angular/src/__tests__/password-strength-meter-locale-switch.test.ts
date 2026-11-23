// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular meter's strength label.
 *
 * `useTranslation()` from `@molecule/app-angular` returns a `t` that reads the
 * provider's notification signal, so a template that calls it re-renders on a
 * switch the way React's render-time `t` calls do. This test bonds a provider
 * with an `en` and a `fr` value for a key the component renders, renders it in
 * `en`, switches to `fr`, and asserts the DOM now shows the French value.
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

// Proxy ClassMap echoing each accessed member back as its token — the same
// mock the React suite uses (`setClassMap(buildStubClassMap())`).
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

const { PasswordStrengthMeter } = await import('../password-strength-meter.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** A mounted spec host: its DOM, a change-detection flush, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection, as a signal write would. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The mounted hosts of one test. */
const mounted: Mounted[] = []

/**
 * Mounts a meter through a JIT host template, the way an Angular app writes it.
 *
 * @param props - The meter's props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [PasswordStrengthMeter as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-password-strength-meter [password]="p['password']"></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'passwordStrengthMeter.label.0': 'Very weak' } },
    {
      code: 'fr',
      name: 'French',
      translations: { 'passwordStrengthMeter.label.0': 'Très faible' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('PasswordStrengthMeter locale switch', () => {
  it('renders the strength label in French after setLocale', async () => {
    // An empty password scores 0, whose label key is `passwordStrengthMeter.label.0`.
    const m = await render({ password: '' })
    mounted.push(m)
    const label = (): string | null =>
      m.host.querySelector('[data-mol-id="password-strength-meter-label"]')?.textContent ?? null
    expect(label()).toBe('Very weak')

    // The switch itself: the meter must re-render in French. A label read from
    // the static `t` would stay 'Very weak' — nothing would subscribe it.
    await provider.setLocale('fr')
    m.flush()
    expect(label()).toBe('Très faible')
  })
})
