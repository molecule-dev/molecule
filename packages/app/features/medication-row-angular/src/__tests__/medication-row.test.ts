// @vitest-environment jsdom
/**
 * Unit tests of `MedicationRow` — the port of
 * `@molecule/app-medication-row-react`'s own suite: the same test names and
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) with the mocked ClassMap the React suite uses.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
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

const { MedicationRow } = await import('../medication-row.component.js')

/** The host template: every prop bound, with no projected content. */
const TEMPLATE = `<div mol-medication-row [name]="p['name']" [dosage]="p['dosage']" [form]="p['form']" [color]="p['color']" [instructions]="p['instructions']" [prescriber]="p['prescriber']" [supplyDays]="p['supplyDays']" [refills]="p['refills']" [actions]="p['actions']" [className]="p['className']"></div>`

/** The same host template with an action projected into `[slot=actions]`. */
const TEMPLATE_WITH_ACTIONS = `<div mol-medication-row [name]="p['name']" [dosage]="p['dosage']" [form]="p['form']" [color]="p['color']" [instructions]="p['instructions']" [prescriber]="p['prescriber']" [supplyDays]="p['supplyDays']" [refills]="p['refills']" [actions]="p['actions']" [className]="p['className']"><ng-container ngProjectAs="[slot=actions]"><button data-actions=""></button></ng-container></div>`

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
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
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The component's own host element (the Card `div`). */
const cardEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-medication-row]')
  if (!el) throw new Error('no MedicationRow host rendered')
  return el as HTMLElement
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts a {@link MedicationRow} and remembers it for teardown.
 *
 * @param props - The row props.
 * @param template - The host template (the actions case projects content).
 * @returns The mounted host.
 */
const render = async (
  props: Record<string, unknown> = {},
  template: string = TEMPLATE,
): Promise<Mounted> => {
  const m = await mount(template, MedicationRow as Type<unknown>, props)
  mounted.push(m)
  return m
}

describe('MedicationRow', () => {
  it('renders the drug name in an <h3>', async () => {
    const m = await render({ name: 'Ibuprofen' })
    const markup = m.host.innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Ibuprofen')
  })

  it('renders dosage, form, and instructions when present', async () => {
    const m = await render({
      name: 'X',
      dosage: '10mg',
      form: 'tablet',
      instructions: 'Take with food',
    })
    const markup = m.host.innerHTML
    expect(markup).toContain('10mg')
    expect(markup).toContain('tablet')
    expect(markup).toContain('Take with food')
  })

  it('renders the color pill swatch when a color is given', async () => {
    const m = await render({ name: 'X', color: '#ff8800' })
    const swatch = cardEl(m.host).querySelector<HTMLElement>('[aria-hidden="true"]')
    expect(swatch?.style.background).toBe('rgb(255, 136, 0)')
    expect(swatch?.style.width).toBe('24px')
    expect(swatch?.style.height).toBe('24px')
  })

  it('renders prescriber, supply days, and refills when present', async () => {
    const m = await render({
      name: 'X',
      prescriber: 'Dr. Smith',
      supplyDays: 30,
      refills: 2,
    })
    const markup = m.host.innerHTML
    expect(markup).toContain('Prescribed by')
    expect(markup).toContain('Dr. Smith')
    expect(markup).toContain('30 day supply')
    expect(markup).toContain('2 refills')
  })

  it('renders the actions slot', async () => {
    const m = await render({ name: 'X' }, TEMPLATE_WITH_ACTIONS)
    expect(m.host.innerHTML).toContain('data-actions')
  })

  it('forwards className onto the Card', async () => {
    const m = await render({ name: 'X', className: 'mr-cls' })
    expect(cardEl(m.host).getAttribute('class')).toContain('mr-cls')
  })
})
