// @vitest-environment jsdom
/**
 * Locale-default behaviour of the Angular trace waterfall's duration labels —
 * a port of `@molecule/app-trace-waterfall-react`'s
 * `duration-labels-locale.test.tsx`: the same test name and assertion.
 *
 * The tick and badge labels format their number with `Intl.NumberFormat` in
 * the app's active locale (`useLocale()`), so a switch of the provider's
 * locale re-formats them at once (`2.5ms` → `2,5ms` in German).
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

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import type { Span } from '../types.js'

const { TraceWaterfall } = await import('../trace-waterfall.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `useLocale()` reads. */
let provider: I18nProvider

/** The mounted app, so a test can tick change detection after a locale switch. */
let appRef: ApplicationRef | undefined
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'de', name: 'German', translations: {} },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = undefined
  appRef = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // switch registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders the waterfall the way an app would: through a JIT host template.
 *
 * @param spans - The spans input.
 * @returns The host element.
 */
async function render(spans: Span[]): Promise<HTMLElement> {
  const Host = Component({
    selector: 'mol-locale-host',
    standalone: true,
    imports: [TraceWaterfall as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<mol-trace-waterfall [spans]="p['spans']"></mol-trace-waterfall>`,
  })(
    class LocaleHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { spans }
    },
  )
  const mountedApp: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  appRef = mountedApp
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  teardown = async () => {
    await mountedApp.destroy()
    host.remove()
  }
  return host
}

/** The last axis tick (the trace's total duration). */
const lastTick = (el: HTMLElement): string =>
  el.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')[4]?.textContent ?? ''

/** The row's duration badge. */
const badge = (el: HTMLElement): string =>
  el.querySelector('[data-mol-id="trace-waterfall-duration"]')?.textContent ?? ''

/** The axis's total-duration label (the left column). */
const total = (el: HTMLElement): string =>
  el.querySelector('[data-mol-id="trace-waterfall-axis"]')?.firstElementChild?.textContent ?? ''

/** The row's `aria-label`, which names the same duration as the badge. */
const rowAria = (el: HTMLElement): string =>
  el.querySelector('[data-mol-id="trace-waterfall-row"]')?.getAttribute('aria-label') ?? ''

const spans: Span[] = [{ id: 's', name: 'lone', startTime: 0, duration: 2.5 }]

describe('TraceWaterfall duration labels locale', () => {
  it('switching the provider locale reformats the duration labels', async () => {
    const host = await render(spans)
    // The trace runs 0..2.5 ms, so the last tick is 2.5ms in English.
    expect(lastTick(host)).toBe('2.5ms')
    expect(badge(host)).toBe('2.5ms')

    // The switch itself: the numbers must re-format in German (decimal comma).
    await provider.setLocale('de')
    appRef!.tick()
    expect(lastTick(host)).toBe('2,5ms')
    expect(badge(host)).toBe('2,5ms')
  })

  it('the total label and the row aria name the duration in the active locale', async () => {
    const host = await render(spans)
    expect(total(host)).toBe('Total: 2.5ms')
    expect(rowAria(host)).toBe(' · lone · 2.5ms')

    // The `{{duration}}` placeholders carry the same localized number as the badge.
    await provider.setLocale('de')
    appRef!.tick()
    expect(total(host)).toBe('Total: 2,5ms')
    expect(rowAria(host)).toBe(' · lone · 2,5ms')
  })
})
