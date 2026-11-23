// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-weather-card-angular` — a port of
 * `@molecule/app-weather-card-react/src/__tests__/smoke.test.ts`: the same
 * test names and the same assertions, with the Angular binding standing in for
 * the React one.
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
import { describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, p) =>
          typeof p === 'string' && p === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (...args: unknown[]) => `mock-${String(p)}-${args.join('-')}`,
      },
    ),
}))
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_k: string, _v: unknown, opts: { defaultValue?: string }) => opts?.defaultValue ?? '',
  }),
}))

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})

describe('WeatherCard', () => {
  /**
   * Mounts the card through a JIT host template that projects a consumer list
   * into the eyebrow slot.
   *
   * @param props - The props the template reads as `p['name']`.
   * @returns The mounted host and a props setter.
   */
  async function mount(props: Record<string, unknown>): Promise<{
    host: HTMLElement
    setProps: (next: Record<string, unknown>) => Promise<void>
    destroy: () => void
  }> {
    const { WeatherCard } = await import('../weather-card.component.js')
    const Host = Component({
      selector: 'mol-weather-host',
      standalone: true,
      imports: [WeatherCard as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Default,
      template: `<div mol-weather-card [locationName]="'Here'" [alertLevel]="p['alertLevel']">@for (x of p['xs']; track x) {<b slot="eyebrow">{{ x }}</b>}</div>`,
    })(
      class WeatherHost {
        /** The props the template binds. */
        p: Record<string, unknown> = props
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    return {
      host,
      setProps: async (next: Record<string, unknown>) => {
        ref.instance.p = { ...ref.instance.p, ...next }
        ref.changeDetectorRef.markForCheck()
        appRef.tick()
      },
      destroy: () => {
        appRef.destroy()
        host.remove()
      },
    }
  }

  it('keeps a consumer list in order when an item is inserted in the middle of the eyebrow slot', async () => {
    const m = await mount({ xs: ['a', 'c'] })
    try {
      const shown = (): (string | null)[] =>
        Array.from(m.host.querySelectorAll('p b')).map((el) => el.textContent)
      expect(shown()).toEqual(['a', 'c'])
      await m.setProps({ xs: ['a', 'b', 'c'] })
      expect(shown()).toEqual(['a', 'b', 'c'])
      await m.setProps({ xs: ['a', 'c'] })
      expect(shown()).toEqual(['a', 'c'])
    } finally {
      m.destroy()
    }
  })
})
