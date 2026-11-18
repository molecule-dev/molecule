// @vitest-environment jsdom
/**
 * The Angular port of
 * `@molecule/app-admin-table-react/src/__tests__/i18n.test.tsx` (the same test
 * names): the admin table's own text goes through `t()`, and the icon-font
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
  type ComponentRef,
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
// real hook reads (the components call `t` from their template bindings, so the
// signal read marks the view dirty and a change detection pass re-renders the
// label).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-angular', async () => {
  const { signal } = await import('@angular/core')
  const locale = signal(i18n.locale)
  return {
    useTranslation: (): { t: (key: string) => string } => ({
      // Reading the signal here (inside the template binding) tracks it, the
      // way the real hook reads its notifications signal.
      t: (key: string) => `«${locale()}:${key}»`,
    }),
    __setLocale: (next: string): void => {
      i18n.locale = next
      locale.set(next)
    },
  }
})

import type * as Binding from '@molecule/app-angular'

const { AdminTable } = await import('../admin-table.component.js')
const { AdminTableRowActions } = await import('../admin-table-row-actions.component.js')

/** The mocked binding, with the locale setter the tests switch. */
type MockedBinding = typeof Binding & { __setLocale: (locale: string) => void }

interface Row {
  id: string
  name: string
}

/** A mounted spec host: its DOM, a change-detection flush, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection, as an event or a props write would. */
  tick(): void
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

let hostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it (the main suite's mount helper).
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
    // Angular derives a component id from the definition, so two hosts with the
    // same template collide (NG0912); a unique host attribute separates them.
    host: { 'data-spec-host': String(++hostCount) },
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
    tick: () => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    setProps: (next: Record<string, unknown>) => {
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

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  const binding = (await import('@molecule/app-angular')) as MockedBinding
  binding.__setLocale('en')
})

const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const rowKey = (r: Row): string => r.id
const rowActions = [
  { label: 'Edit', onSelect: (): void => {}, dataMolIdFor: () => 'row-action-edit' },
]

const tableTemplate = `
  <ng-template #nameCell let-row><span data-name>{{ row.name }}</span></ng-template>
  <div
    mol-admin-table
    [rows]="p['rows']"
    [columns]="[{ id: 'name', header: 'Name', render: nameCell }]"
    [rowKey]="p['rowKey']"
    [rowActions]="p['rowActions']"
    [rowActionsAriaLabel]="p['rowActionsAriaLabel']"
  ></div>`

const actionsTemplate = `
  <div
    mol-admin-table-row-actions
    [row]="p['row']"
    [actions]="p['actions']"
  ></div>`

/**
 * Switches the mock provider's locale and flushes change detection.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  const binding = (await import('@molecule/app-angular')) as MockedBinding
  binding.__setLocale(locale)
}

describe('AdminTableRowActions i18n', () => {
  it('names the trigger through t when no aria label is given', async () => {
    const m = await mount(actionsTemplate, AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
    })
    const trigger = m.host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('lets an explicit ariaLabel prop override the translated default', async () => {
    const m = await mount(
      `<div mol-admin-table-row-actions [row]="p['row']" [actions]="p['actions']" [ariaLabel]="p['ariaLabel']"></div>`,
      AdminTableRowActions,
      { row: rows[0], actions: rowActions, ariaLabel: 'Row actions' },
    )
    const trigger = m.host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('keeps the icon glyph out of the accessibility tree', async () => {
    const m = await mount(actionsTemplate, AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
      ariaLabel: 'Row actions',
    })
    const glyph = m.host.querySelector('span[data-icon="more_vert"]')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the trigger label in the locale the provider switches to', async () => {
    const m = await mount(actionsTemplate, AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
    })
    const trigger = () => m.host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
    await switchLocale('de')
    m.tick()
    expect(trigger()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.rowActions»')
  })
})

describe('AdminTable i18n', () => {
  it('labels the actions-column trigger through t when no per-row label is given', async () => {
    const m = await mount(tableTemplate, AdminTable, { rows, rowKey, rowActions })
    const trigger = m.host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('keeps a per-row label over the translated default', async () => {
    const m = await mount(tableTemplate, AdminTable, {
      rows,
      rowKey,
      rowActions,
      rowActionsAriaLabel: (row: Row): string => `Actions for ${row.name}`,
    })
    const trigger = m.host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions for Alpha')
  })

  it('renders the checkbox label and both column names in the locale the provider switches to', async () => {
    const m = await mount(
      `<ng-template #nameCell let-row><span data-name>{{ row.name }}</span></ng-template><div mol-admin-table [rows]="p['rows']" [columns]="[{ id: 'name', header: 'Name', render: nameCell }]" [rowKey]="p['rowKey']" [bulkSelect]="p['bulkSelect']" [rowActions]="p['rowActions']"></div>`,
      AdminTable,
      { rows, rowKey, bulkSelect: true, rowActions },
    )
    const checkbox = () => m.host.querySelector('input[type="checkbox"]')
    const heads = () => Array.from(m.host.querySelectorAll('thead th'))
    expect(checkbox()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«en:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«en:adminTable.aria.actionsColumn»')
    await switchLocale('de')
    m.tick()
    expect(checkbox()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«de:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«de:adminTable.aria.actionsColumn»')
  })
})
