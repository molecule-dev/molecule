// @vitest-environment jsdom
/**
 * The Solid port of
 * `@molecule/app-admin-table-react/src/__tests__/i18n.test.tsx` (the same test
 * names): the admin table's own text goes through `t()`, and the icon-font
 * glyph is hidden from assistive technology. A provider whose `t` marks every
 * string proves a default that bypassed `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other Solid tests use.
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
// component reads (a real signal, so Solid re-renders on a switch).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-solid', async () => {
  const { createSignal } = await import('solid-js')
  const [locale, setLocale] = createSignal(i18n.locale)
  return {
    useTranslation: (): { t: (key: string) => string } => ({
      // Reading the signal here (inside the JSX attribute expression) tracks it.
      t: (key: string) => `«${locale()}:${key}»`,
    }),
    __setLocale: (next: string): void => {
      i18n.locale = next
      setLocale(next)
    },
  }
})

import type * as Binding from '@molecule/app-solid'

import { AdminTable } from '../AdminTable.jsx'
import { AdminTableRowActions } from '../AdminTableRowActions.jsx'

/** The mocked binding, with the locale setter the tests switch. */
type MockedBinding = typeof Binding & { __setLocale: (locale: string) => void }

interface Row {
  id: string
  name: string
}
const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const columns = [{ id: 'name', header: 'Name', render: (r: Row) => r.name }]
const rowKey = (r: Row): string => r.id
const rowActions = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

const disposers: Array<() => void> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  const binding = (await import('@molecule/app-solid')) as MockedBinding
  binding.__setLocale('en')
})

/**
 * Mounts one already-built view, kept until the test's cleanup so a locale
 * switch re-renders in place.
 *
 * @param view - The component element to render.
 * @returns The container.
 */
function mountView(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Switches the mock provider's locale.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  const binding = (await import('@molecule/app-solid')) as MockedBinding
  binding.__setLocale(locale)
}

describe('AdminTableRowActions i18n', () => {
  it('names the trigger through t when no aria label is given', () => {
    const container = mountView(() => <AdminTableRowActions row={rows[0]} actions={rowActions} />)
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('lets an explicit ariaLabel prop override the translated default', () => {
    const container = mountView(() => (
      <AdminTableRowActions row={rows[0]} actions={rowActions} ariaLabel="Row actions" />
    ))
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('keeps the icon glyph out of the accessibility tree', () => {
    const container = mountView(() => (
      <AdminTableRowActions row={rows[0]} actions={rowActions} ariaLabel="Row actions" />
    ))
    const glyph = container.querySelector('span[data-icon="more_vert"]')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the trigger label in the locale the provider switches to', async () => {
    const container = mountView(() => <AdminTableRowActions row={rows[0]} actions={rowActions} />)
    const trigger = () => container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
    await switchLocale('de')
    expect(trigger()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.rowActions»')
  })
})

describe('AdminTable i18n', () => {
  it('labels the actions-column trigger through t when no per-row label is given', () => {
    const container = mountView(() => (
      <AdminTable rows={rows} columns={columns} rowKey={rowKey} rowActions={rowActions} />
    ))
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('keeps a per-row label over the translated default', () => {
    const container = mountView(() => (
      <AdminTable
        rows={rows}
        columns={columns}
        rowKey={rowKey}
        rowActions={rowActions}
        rowActionsAriaLabel={(row: Row): string => `Actions for ${row.name}`}
      />
    ))
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions for Alpha')
  })

  it('renders the checkbox label and both column names in the locale the provider switches to', async () => {
    const container = mountView(() => (
      <AdminTable
        rows={rows}
        columns={columns}
        rowKey={rowKey}
        bulkSelect
        rowActions={rowActions}
      />
    ))
    const checkbox = () => container.querySelector('input[type="checkbox"]')
    const heads = () => Array.from(container.querySelectorAll('thead th'))
    expect(checkbox()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«en:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«en:adminTable.aria.actionsColumn»')
    await switchLocale('de')
    expect(checkbox()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«de:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«de:adminTable.aria.actionsColumn»')
  })
})
