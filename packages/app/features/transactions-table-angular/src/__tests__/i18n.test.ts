// @vitest-environment jsdom
/**
 * The Angular port of
 * `@molecule/app-transactions-table-react/src/__tests__/i18n.test.tsx` (the
 * same test names): TransactionsTable's own text goes through `t()`, the
 * default formatters follow the provider's active locale, and the icon-font
 * glyph is hidden from assistive technology. A provider whose `t` marks every
 * string proves a default that bypassed `t()`.
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

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other Angular tests use.
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
        // `iconGlyphFont` is a string field of the ClassMap, not a method.
        if (token === 'iconGlyphFont') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The provider's locale, switchable from the tests through the same signal the
// component reads (a real signal, so Angular marks the view dirty on a switch;
// the tests re-tick the app to flush it).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { signal } = await import('@angular/core')
  const localeSignal = signal(i18n.locale)
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useTranslation: (): { t: (key: string) => string } => ({
      t: (key: string) => `«${key}»`,
    }),
    useLocale: () => localeSignal.asReadonly(),
    __setLocale: (locale: string): void => {
      i18n.locale = locale
      localeSignal.set(locale)
    },
  }
})

import type * as Binding from '@molecule/app-angular'

import { TransactionsTable } from '../transactions-table.component.js'

/** The mocked binding, with the locale setter the tests switch. */
type MockedBinding = typeof Binding & { __setLocale: (locale: string) => void }

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const TEMPLATE = `<div
  mol-transactions-table
  [transactions]="p['transactions']"
  [loading]="p['loading']"
  [error]="p['error']"
  [retryLabel]="p['retryLabel']"
  [onRetry]="p['onRetry']"
  [categoryStyles]="p['categoryStyles']"
  [currency]="p['currency']"
  [formatAmount]="p['formatAmount']"
  [formatDate]="p['formatDate']"
  [headers]="p['headers']"
  [className]="p['className']"
  [emptyState]="p['emptyState']"
  [footer]="p['footer']"
  [onRowClick]="p['onRowClick']"
></div>`

const mountedInstances: Mounted[] = []

/**
 * Mounts the {@link TransactionsTable} host template with the given props.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const Host = Component({
    selector: 'mol-i18n-host',
    standalone: true,
    imports: [TransactionsTable],
    changeDetection: ChangeDetectionStrategy.Eager,
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
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
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
  mountedInstances.push(m)
  return m
}

afterEach(async () => {
  for (const m of mountedInstances.splice(0)) await m.destroy()
  const binding = (await import('@molecule/app-angular')) as MockedBinding
  binding.__setLocale('en')
})

/** One expense row (the neutral category style's `receipt` icon). */
const row = {
  id: 't1',
  date: '2026-03-01T00:00:00',
  description: 'Groceries',
  categoryKey: 'groceries',
  categoryLabel: 'Groceries',
  account: 'Checking',
  amount: -54.2,
}

/**
 * Switches the mock provider's locale; the view refreshes on the tests' next
 * `setProps({})` re-tick.
 *
 * @param locale - The locale to switch to.
 */
const switchLocale = async (locale: string): Promise<void> => {
  const binding = (await import('@molecule/app-angular')) as MockedBinding
  binding.__setLocale(locale)
}

describe('TransactionsTable text', () => {
  it('takes the Date column header through i18n by default', async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('«transactionsTable.header.date»')
  })

  it('takes the Description column header through i18n by default', async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('«transactionsTable.header.description»')
  })

  it('takes the Category column header through i18n by default', async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('«transactionsTable.header.category»')
  })

  it('takes the Account column header through i18n by default', async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('«transactionsTable.header.account»')
  })

  it('takes the Amount column header through i18n by default', async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('«transactionsTable.header.amount»')
  })

  it("keeps the caller's own column headers", async () => {
    const m = await render({
      transactions: [row],
      headers: { date: 'When', amount: 'Sum' },
    })
    expect(m.host.textContent).toContain('When')
    expect(m.host.textContent).toContain('Sum')
    expect(m.host.textContent).not.toContain('«transactionsTable.header.date»')
    // The headers the caller left unset still translate.
    expect(m.host.textContent).toContain('«transactionsTable.header.category»')
  })

  it('takes the retry label through i18n by default', async () => {
    const m = await render({ transactions: [row], error: 'Boom', onRetry: () => {} })
    expect(m.host.querySelector('button')?.textContent).toBe('«transactionsTable.label.retry»')
  })

  it("keeps the caller's own retry label", async () => {
    const m = await render({
      transactions: [row],
      error: 'Boom',
      onRetry: () => {},
      retryLabel: 'Reload',
    })
    expect(m.host.querySelector('button')?.textContent).toBe('Reload')
  })

  it("re-formats dates when the provider's locale switches", async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('Mar 1, 2026')
    await switchLocale('de')
    await m.setProps({})
    expect(m.host.textContent).toContain('1. März 2026')
    expect(m.host.textContent).not.toContain('Mar 1, 2026')
  })

  it("re-formats amounts when the provider's locale switches", async () => {
    const m = await render({ transactions: [row] })
    expect(m.host.textContent).toContain('$54.20')
    await switchLocale('de')
    await m.setProps({})
    // German formats before the code with a no-break space.
    expect(m.host.textContent).toContain('54,20 $')
    expect(m.host.textContent).toContain('-54,20 $')
    expect(m.host.textContent).not.toContain('$54.20')
  })

  it('formats amounts in the currency prop', async () => {
    const m = await render({ transactions: [row], currency: 'EUR' })
    expect(m.host.textContent).toContain('€54.20')
  })

  it('hides the category icon glyph from screen readers', async () => {
    const m = await render({ transactions: [row] })
    const glyph = m.host.querySelector('span[aria-hidden="true"]')
    expect(glyph?.getAttribute('class')).toBe('iconGlyphFont')
    expect(glyph?.textContent).toBe('receipt')
  })
})
