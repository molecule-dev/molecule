// @vitest-environment jsdom
/**
 * Component tests of the Angular `RelativeTime`'s clock — the port of
 * `@molecule/app-relative-time-react/src/__tests__/RelativeTime.tick.test.tsx`
 * (the same test names): "now" is committed state, so the label advances when
 * the refresh interval fires, and an unrelated re-render does not re-read the
 * clock (a `refreshMs={0}` label holds its mount value). Mounted through
 * Angular's real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) against the bonded provider.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../app-relative-time.component.js'

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])
setProvider(provider)

/** The fake system clock's start. */
const START = new Date('2026-11-18T12:00:00.000Z')

/** Five minutes before {@link START} — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(START.getTime() - 5 * 60_000).toISOString()

/** A mounted spec host: its text, a prop update, a change-detection pass and a teardown. */
interface Mounted {
  /** The `<time>` element's text. */
  readonly label: string | null
  /** Sets an input the way a parent re-render does (React's `rerender`), then runs CD. */
  update(patch: Record<string, unknown>): void
  /** Refreshes the view after a bonded provider or timer change. */
  refresh(): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** The hosts mounted during one test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(async () => {
  for (const m of mounted.splice(0)) m.destroy()
  vi.useRealTimers()
  await provider.setLocale('en')
})

/**
 * Mounts `RelativeTime` through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RelativeTime],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<time mol-relative-time [date]="p['date']" [locale]="p['locale']" [refreshMs]="p['refreshMs']" [className]="p['className']"></time>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
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
  const refresh = (): void => {
    ref.changeDetectorRef.markForCheck()
    appRef.tick()
  }
  return {
    get label(): string | null {
      return host.querySelector('time')?.textContent ?? null
    },
    update: (patch: Record<string, unknown>): void => {
      Object.assign(ref.instance.p, patch)
      refresh()
    },
    refresh,
    destroy: (): void => {
      appRef.destroy()
      host.remove()
    },
  }
}

describe('<RelativeTime> clock', () => {
  it('advances the label when the refresh interval fires', async () => {
    const m = await mount({ date: FIVE_MINUTES_AGO, locale: 'en', refreshMs: 60_000 })
    mounted.push(m)
    expect(m.label).toBe('5 minutes ago')
    vi.advanceTimersByTime(60_000)
    m.refresh()
    expect(m.label).toBe('6 minutes ago')
  })

  it('holds its mount value on an unrelated re-render when refreshMs is 0', async () => {
    const m = await mount({
      date: FIVE_MINUTES_AGO,
      locale: 'en',
      refreshMs: 0,
      className: 'before',
    })
    mounted.push(m)
    expect(m.label).toBe('5 minutes ago')
    vi.setSystemTime(new Date(START.getTime() + 2 * 60_000))
    m.update({ className: 'after' })
    // The unrelated prop change reached the DOM; the clock it shows is still
    // the mount value.
    expect(document.querySelector('time[mol-relative-time]')?.getAttribute('class')).toBe('after')
    expect(m.label).toBe('5 minutes ago')
  })
})
