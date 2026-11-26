// @vitest-environment jsdom
/**
 * AdminTable's and AdminTableRowActions' own text goes through `t()`, and the
 * icon-font glyph is hidden from assistive technology. Found by the
 * pseudo-locale check: the kebab trigger's glyph text `more_vert` was announced
 * as words, and the trigger's English default `Row actions` bypassed i18n
 * (a hardcoded fallback the check could not see, because every recorded case
 * passes an explicit label). A provider whose `t` marks every string proves a
 * default that bypassed `t()`.
 *
 * @module
 */

import { act, createElement, type ReactNode, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))

// Forward onClick + pass-through attrs onto a native <button>, so the
// trigger's aria-* is assertable.
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({
    children,
    onClick,
    ...attrs
  }: {
    children?: ReactNode
    onClick?: (e: unknown) => void
  } & Record<string, unknown>) => createElement('button', { onClick, ...attrs }, children),
}))

// The provider's locale, switchable from the tests (the hook re-renders
// through the store subscription, the way the real useTranslation does).
const i18n = vi.hoisted(() => ({ locale: 'en', listeners: new Set<() => void>() }))

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => {
    useSyncExternalStore(
      (onChange) => {
        i18n.listeners.add(onChange)
        return () => {
          i18n.listeners.delete(onChange)
        }
      },
      () => i18n.locale,
      () => i18n.locale,
    )
    return { t: (key: string) => `«${i18n.locale}:${key}»` }
  },
}))

const { AdminTable } = await import('../AdminTable.js')
const { AdminTableRowActions } = await import('../AdminTableRowActions.js')

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

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  i18n.locale = 'en'
})

/**
 * Mounts a component in jsdom, kept until the test's cleanup so a locale
 * switch re-renders in place.
 *
 * @param element - The element to render.
 * @returns The container.
 */
async function mount(element: React.ReactElement): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(element)
  })
  return host
}

/**
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  await act(async () => {
    i18n.locale = locale
    i18n.listeners.forEach((listener) => listener())
  })
}

describe('AdminTableRowActions i18n', () => {
  it('names the trigger through t when no aria label is given', async () => {
    const container = await mount(
      createElement(AdminTableRowActions<Row>, { row: rows[0], actions: rowActions }),
    )
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('lets an explicit ariaLabel prop override the translated default', async () => {
    const container = await mount(
      createElement(AdminTableRowActions<Row>, {
        row: rows[0],
        actions: rowActions,
        ariaLabel: 'Row actions',
      }),
    )
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('keeps the icon glyph out of the accessibility tree', async () => {
    const container = await mount(
      createElement(AdminTableRowActions<Row>, {
        row: rows[0],
        actions: rowActions,
        ariaLabel: 'Row actions',
      }),
    )
    const glyph = container.querySelector('span[data-icon="more_vert"]')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the trigger label in the locale the provider switches to', async () => {
    const container = await mount(
      createElement(AdminTableRowActions<Row>, { row: rows[0], actions: rowActions }),
    )
    const trigger = () => container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
    await switchLocale('de')
    expect(trigger()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.rowActions»')
  })
})

describe('AdminTable i18n', () => {
  it('labels the actions-column trigger through t when no per-row label is given', async () => {
    const container = await mount(
      createElement(AdminTable<Row>, { rows, columns, rowKey, rowActions }),
    )
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('keeps a per-row label over the translated default', async () => {
    const container = await mount(
      createElement(AdminTable<Row>, {
        rows,
        columns,
        rowKey,
        rowActions,
        rowActionsAriaLabel: (row: Row) => `Actions for ${row.name}`,
      }),
    )
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions for Alpha')
  })

  it('renders the checkbox label and both column names in the locale the provider switches to', async () => {
    const container = await mount(
      createElement(AdminTable<Row>, { rows, columns, rowKey, bulkSelect: true, rowActions }),
    )
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
