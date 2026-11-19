// @vitest-environment jsdom
/**
 * A component that translates through `useTranslation()` re-renders in the
 * switched-to language. A port of
 * `@molecule/app-ui-react/src/__tests__/locale-switch-rerender.test.tsx`: the
 * defect it pins is the same (a component reading the static `t` from
 * `@molecule/app-i18n` stayed in the old language after `setLocale`), and the
 * Angular translation is the same too — `useTranslation()` reads the
 * provider's locale notifications signal, so a zoneless view whose binding
 * calls it is re-checked on a switch.
 *
 * Rendered through the BONDED provider (`setProvider`) — the same path the
 * static `t` read — so the test proves exactly the fixed defect.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider, LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // `cn` and the variant factories the components CALL as functions must be
    // functions; every other token is a plain string — what Angular's
    // class-map binding requires.
    const CALLABLE = new Set(['cn', 'spinner'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Spinner } = await import('../components/spinner.component.js')

const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    direction: 'ltr',
    translations: { 'ui.spinner.loading': 'Loading' },
  },
  {
    code: 'fr',
    name: 'French',
    direction: 'ltr',
    translations: { 'ui.spinner.loading': 'Chargement' },
  },
]

/** A host rendering the spinner, like an app's template does. */
const Host: Type<unknown> = Component({
  selector: 'mol-spec-spinner-host',
  standalone: true,
  imports: [Spinner],
  template: `<div mol-spinner></div>`,
})(class SpinnerHostComponent {})

/** Mounted spinner under its spec host. */
interface MountedSpinner {
  /** Runs one change-detection pass. */
  readonly tick: () => void
  /** Destroys the app and removes the host. */
  destroy(): void
}

let appRef: ApplicationRef | null = null

/**
 * Bootstraps the host (zoneless) with the bonded provider active.
 *
 * @returns The mounted spinner controls.
 */
async function mountSpinner(): Promise<MountedSpinner> {
  appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    tick: () => appRef?.tick(),
    destroy: () => {
      appRef?.destroy()
      appRef = null
      host.remove()
    },
  }
}

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
  // Reset the global i18n singleton so an override cannot bleed between tests.
  setProvider(createSimpleI18nProvider('en'))
})

describe('components re-render in the new language after a locale switch', () => {
  it('Spinner announces its loading label in the switched-to locale', async () => {
    const provider: I18nProvider = createSimpleI18nProvider('en', LOCALES)
    setProvider(provider)

    const spinner = await mountSpinner()
    expect(within(document.body).getByRole('status').getAttribute('aria-label')).toBe('Loading')

    await provider.setLocale('fr')
    spinner.tick()
    expect(within(document.body).getByRole('status').getAttribute('aria-label')).toBe('Chargement')
  })
})
