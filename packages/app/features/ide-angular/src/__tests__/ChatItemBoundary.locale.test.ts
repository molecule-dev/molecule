// @vitest-environment jsdom
/**
 * Locale test for the Angular `ChatItemBoundary`: after a language switch the
 * failed item's inline notice is in the new language. The conformance kit
 * cannot record the errored branch (React logs every caught render error and
 * the kit refuses recording cases whose React reference logs), so this
 * property is pinned here, the way `RootErrorBoundary`'s locale test is.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppLogger from '@molecule/app-logger'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatItemBoundary } from '../parts/chat-item-boundary.component.js'

// The real i18n provider logs through the same package, so only the boundary's report is stubbed.
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof AppLogger>()),
  error: vi.fn(),
}))

/** A child that fails while it is created, so the boundary shows its notice. */
const Broken = Component({
  selector: 'mol-broken',
  standalone: true,
  template: `<span>never rendered</span>`,
})(
  class BrokenClass {
    constructor() {
      throw new Error('render exploded')
    }
  },
)

const mounted: Array<() => void> = []
afterEach(() => {
  for (const destroy of mounted.splice(0)) destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ChatItemBoundary after a language switch', () => {
  it('shows the failed item notice in the new language', async () => {
    // Angular reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const provider = createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'ide.chat.itemRenderError': "This message couldn't be displayed." },
      },
      {
        code: 'fr',
        name: 'Français',
        translations: { 'ide.chat.itemRenderError': "Ce message n'a pas pu être affiché." },
      },
    ])
    setProvider(provider)
    setClassMap(classMap)
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [ChatItemBoundary, Broken],
      changeDetection: ChangeDetectionStrategy.Default,
      host: { 'data-parity-host': 'chat-item-boundary-locale' },
      template: `<mol-chat-item-boundary [render]="itemTpl"><ng-template #itemTpl><mol-broken /></ng-template></mol-chat-item-boundary>`,
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
    mounted.push(() => {
      appRef.destroy()
      host.remove()
    })
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')?.textContent).toBe(
      "This message couldn't be displayed.",
    )

    await provider.setLocale('fr')
    appRef.tick()

    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')?.textContent).toBe(
      "Ce message n'a pas pu être affiché.",
    )
  })
})
