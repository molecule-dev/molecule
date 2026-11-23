// @vitest-environment jsdom
/**
 * Component tests of the Angular `RelativeTime`'s locale handling — the port
 * of `@molecule/app-relative-time-react/src/__tests__/RelativeTime.test.tsx`
 * (the same test names): without a `locale` input the label formats in the
 * app's active i18n locale and follows a locale switch; an explicit `locale`
 * still wins. Mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) against the bonded provider.
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
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../app-relative-time.component.js'

/** Five minutes before the real clock — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60_000).toISOString()

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
])
setProvider(provider)

/** A mounted spec host: its text, a change-detection pass and a teardown. */
interface Mounted {
  /** The `<time>` element's text. */
  readonly label: string | null
  /** Refreshes the view after a bonded provider change. */
  refresh(): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** The hosts mounted during one test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) m.destroy()
  await provider.setLocale('en')
})

/**
 * Mounts `RelativeTime` through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The props the template binds (`date`, `locale`).
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RelativeTime],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<time mol-relative-time [date]="p['date']" [locale]="p['locale']"></time>`,
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
  return {
    get label(): string | null {
      return host.querySelector('time')?.textContent ?? null
    },
    refresh: (): void => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: (): void => {
      appRef.destroy()
      host.remove()
    },
  }
}

describe('RelativeTime locale', () => {
  it('formats in the active app locale when no locale prop is given', async () => {
    const m = await mount({ date: FIVE_MINUTES_AGO })
    mounted.push(m)
    expect(m.label).toBe('5 minutes ago')
  })

  it('switching the provider locale changes the formatted label', async () => {
    const m = await mount({ date: FIVE_MINUTES_AGO })
    mounted.push(m)
    expect(m.label).toBe('5 minutes ago')
    await provider.setLocale('fr')
    m.refresh()
    expect(m.label).toBe('il y a 5 minutes')
  })

  it('an explicit locale prop still wins over the active app locale', async () => {
    const m = await mount({ date: FIVE_MINUTES_AGO, locale: 'en-US' })
    mounted.push(m)
    expect(m.label).toBe('5 minutes ago')
    await provider.setLocale('fr')
    m.refresh()
    expect(m.label).toBe('5 minutes ago')
  })
})
