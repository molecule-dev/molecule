// @vitest-environment jsdom
/**
 * The Angular `Sparkline`'s own text goes through i18n — a port of
 * `@molecule/app-sparkline-react/src/__tests__/sparkline-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real
 * renderer in jsdom. A `useTranslation` whose `t` returns a marker proves
 * the default aria-label went through `t()` with its key; a default that
 * bypassed `t()` would show up as plain English.
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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { Sparkline } = await import('../sparkline.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the Sparkline through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-i18n-host',
    standalone: true,
    imports: [Sparkline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<mol-sparkline [values]="p['values']" [variant]="p['variant']" [width]="p['width']" [height]="p['height']" [color]="p['color']" [ariaLabel]="p['ariaLabel']" [className]="p['className']" />`,
  })(
    class I18nSpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('Sparkline i18n', () => {
  it('renders the default aria-label through t with its key', async () => {
    const m = await render({ values: [1, 2, 3] })
    expect(m.host.innerHTML).toContain('aria-label="«sparkline.aria.trendSparkline»"')
  })

  it('lets an explicit ariaLabel override the translated default', async () => {
    const m = await render({ values: [1, 2], ariaLabel: 'Sales trend' })
    expect(m.host.innerHTML).toContain('aria-label="Sales trend"')
    expect(m.host.innerHTML).not.toContain('«sparkline.aria.trendSparkline»')
  })
})
