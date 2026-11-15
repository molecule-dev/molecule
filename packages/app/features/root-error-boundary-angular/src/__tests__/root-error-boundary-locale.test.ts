// @vitest-environment jsdom
/**
 * Locale test for the Angular `RootErrorBoundary` — a port of
 * `@molecule/app-root-error-boundary-react/src/__tests__/root-error-boundary-locale.test.tsx`:
 * after a language switch the errored boundary's recovery message is in the
 * new language.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...classes: unknown[]) => classes.filter((c) => typeof c === 'string').join(' ')
            : () => String(prop),
      },
    ),
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

const { RootErrorBoundary } = await import('../root-error-boundary.component.js')

/** A child that fails to render, so the boundary shows its recovery alert. */
const Broken = Component({
  selector: 'mol-broken',
  standalone: true,
  template: `<span>never rendered</span>`,
})(
  class BrokenComponent {
    constructor() {
      throw new Error('render failed')
    }
  },
)

const mounted: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const destroy of mounted.splice(0)) await destroy()
  vi.restoreAllMocks()
})

describe('RootErrorBoundary after a language switch', () => {
  it('shows its recovery message in the new language', async () => {
    // Angular reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const provider = createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'error.unknown': 'An unexpected error occurred.' },
      },
      {
        code: 'fr',
        name: 'Français',
        translations: { 'error.unknown': "Une erreur inattendue s'est produite." },
      },
    ])
    setProvider(provider)
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [RootErrorBoundary, Broken],
      changeDetection: ChangeDetectionStrategy.Default,
      host: { 'data-parity-host': 'locale' },
      template: `<mol-root-error-boundary [content]="contentTpl"><ng-template #contentTpl><mol-broken /></ng-template></mol-root-error-boundary>`,
    })(class SpecHost {})
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
    mounted.push(async () => {
      appRef.destroy()
      host.remove()
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('An unexpected error occurred.')

    await provider.setLocale('fr')
    appRef.tick()

    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      "Une erreur inattendue s'est produite.",
    )
  })
})
