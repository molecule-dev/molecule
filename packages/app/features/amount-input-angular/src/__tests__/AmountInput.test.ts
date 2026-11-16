// @vitest-environment jsdom
/**
 * Unit tests of `AmountInput` — the port of
 * `@molecule/app-amount-input-react`'s own suite. The React suite renders the
 * component in jsdom and asserts the markup; this port mounts the same tree
 * through Angular's real renderer (the `createApplication` + JIT host approach
 * the conformance kit's Angular adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
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
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AmountInput } from '../amount-input.component.js'

const noop = (): void => {}

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The host template every test mounts the component with. */
const TEMPLATE = `<div
  mol-amount-input
  [amount]="p['amount']"
  [onAmountChange]="p['onAmountChange']"
  [type]="p['type']"
  [onTypeChange]="p['onTypeChange']"
  [typeOptions]="p['typeOptions']"
  [typeLabels]="p['typeLabels']"
  [currencySymbol]="p['currencySymbol']"
  [ariaLabel]="p['ariaLabel']"
  [size]="p['size']"
  [className]="p['className']"
></div>`

/**
 * Mounts one standalone component through a JIT host template, written the
 * way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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

/** Every mount in the current test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

/**
 * Mounts an {@link AmountInput} and remembers it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(AmountInput as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AmountInput i18n', () => {
  it('renders the default English toggle labels via t() defaultValue', async () => {
    const m = await render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(m.host.textContent).toContain('Income')
    expect(m.host.textContent).toContain('Expense')
  })

  it('renders the default English aria-label via t() defaultValue', async () => {
    const m = await render({ amount: '', onAmountChange: noop })
    expect(m.host.querySelector('input')?.getAttribute('aria-label')).toBe('Amount')
  })

  it('lets a locale bond override the toggle labels + aria-label', async () => {
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            'amountInput.type.income': 'Ingreso',
            'amountInput.type.expense': 'Gasto',
            'amountInput.ariaLabel': 'Importe',
          },
        },
      ]),
    )
    const m = await render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
    })
    expect(m.host.textContent).toContain('Ingreso')
    expect(m.host.textContent).toContain('Gasto')
    expect(m.host.textContent).not.toContain('Income')
    expect(m.host.querySelector('input')?.getAttribute('aria-label')).toBe('Importe')
  })

  it('lets the typeLabels + ariaLabel props win over t() (prop > t() > default)', async () => {
    // A locale bond is registered, yet the explicit props must still take
    // precedence — proving the prop > t() ordering, not just prop-vs-default.
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            'amountInput.type.income': 'Ingreso',
            'amountInput.ariaLabel': 'Importe',
          },
        },
      ]),
    )
    const m = await render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense'],
      typeLabels: { income: 'Money In', expense: 'Money Out' },
      ariaLabel: 'Transaction amount',
    })
    expect(m.host.textContent).toContain('Money In')
    expect(m.host.textContent).toContain('Money Out')
    expect(m.host.textContent).not.toContain('Ingreso')
    expect(m.host.querySelector('input')?.getAttribute('aria-label')).toBe('Transaction amount')
  })

  it('passes every type option its literal key through t (marker provider)', async () => {
    // A provider whose `t` returns the key it was asked for: the toggle must
    // ask `t` for each option's LITERAL key — `amountInput.type.<value>` — so
    // a locale bond can override the label; a label rendered from an inline
    // English string (or a key the bond cannot name) would never show up here.
    setProvider({ ...createSimpleI18nProvider('en'), t: (key: string) => `[${key}]` })
    const m = await render({
      amount: 0,
      onAmountChange: noop,
      type: 'income',
      onTypeChange: noop,
      typeOptions: ['income', 'expense', 'transfer', 'other'],
    })
    expect(m.host.textContent).toContain('[amountInput.type.income]')
    expect(m.host.textContent).toContain('[amountInput.type.expense]')
    expect(m.host.textContent).toContain('[amountInput.type.transfer]')
    expect(m.host.textContent).toContain('[amountInput.type.other]')
    expect(m.host.querySelector('input')?.getAttribute('aria-label')).toBe(
      '[amountInput.ariaLabel]',
    )
    // The marker provider carries no translations: no English fallback may leak.
    expect(m.host.textContent).not.toContain('Income')
    expect(m.host.textContent).not.toContain('Amount')
  })
})
