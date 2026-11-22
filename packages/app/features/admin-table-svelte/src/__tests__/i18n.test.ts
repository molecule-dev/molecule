// @vitest-environment jsdom
/**
 * The Svelte port of
 * `@molecule/app-admin-table-react/src/__tests__/i18n.test.tsx` (the same test
 * names): the admin table's own text goes through `t()`, and the icon-font
 * glyph is hidden from assistive technology. A provider whose `t` marks every
 * string proves a default that bypassed `t()`.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other Svelte tests use.
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

// The provider's locale, switchable from the tests through the same store the
// component reads (a real store behind `fromStore`, so the template re-runs on
// a switch — the way the real hook's `t` tracks the locale version).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { fromStore } = await import('svelte/store')
  const listeners = new Set<(locale: string) => void>()
  const versionStore = {
    subscribe(run: (version: string) => void): () => void {
      run(i18n.locale)
      listeners.add(run)
      return () => {
        listeners.delete(run)
      }
    },
  }
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useTranslation: (): { t: (key: string) => string } => {
      const tracked = fromStore(versionStore)
      return {
        // Reading the tracked store here (inside the template expression)
        // makes the attribute follow a switch.
        t: (key: string) => `«${tracked.current}:${key}»`,
      }
    },
    __setLocale: (locale: string): void => {
      i18n.locale = locale
      listeners.forEach((listener) => listener(locale))
    },
  }
})

import type * as Binding from '@molecule/app-svelte'

import AdminTable from '../AdminTable.svelte'
import AdminTableRowActions from '../AdminTableRowActions.svelte'

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

interface Mounted {
  /** The host element the component rendered into. */
  host: HTMLElement
  /** Tears the instance down. */
  dispose(): void
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const view of mounted.splice(0)) view.dispose()
  document.body.innerHTML = ''
  const binding = (await import('@molecule/app-svelte')) as MockedBinding
  binding.__setLocale('en')
})

/**
 * Mounts a component, kept until the test's cleanup so a locale switch
 * re-renders in place.
 *
 * @param component - The component.
 * @param props - Its props.
 * @returns The host element.
 */
function mountView(
  component: typeof AdminTableRowActions | typeof AdminTable,
  props: Record<string, unknown>,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(component as never, { target: host, props })
  flushSync()
  mounted.push({
    host,
    dispose: () => {
      unmount(instance)
      host.remove()
    },
  })
  return host
}

/**
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  const binding = (await import('@molecule/app-svelte')) as MockedBinding
  binding.__setLocale(locale)
  flushSync()
}

describe('AdminTableRowActions i18n', () => {
  it('names the trigger through t when no aria label is given', () => {
    const host = mountView(AdminTableRowActions, { row: rows[0], actions: rowActions })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('lets an explicit ariaLabel prop override the translated default', () => {
    const host = mountView(AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('keeps the icon glyph out of the accessibility tree', () => {
    const host = mountView(AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
      ariaLabel: 'Row actions',
    })
    const glyph = host.querySelector('span[data-icon="more_vert"]')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the trigger label in the locale the provider switches to', async () => {
    const host = mountView(AdminTableRowActions, { row: rows[0], actions: rowActions })
    const trigger = () => host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
    await switchLocale('de')
    expect(trigger()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.rowActions»')
  })
})

describe('AdminTable i18n', () => {
  it('labels the actions-column trigger through t when no per-row label is given', () => {
    const host = mountView(AdminTable, { rows, columns, rowKey, rowActions })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('keeps a per-row label over the translated default', () => {
    const host = mountView(AdminTable, {
      rows,
      columns,
      rowKey,
      rowActions,
      rowActionsAriaLabel: (row: Row): string => `Actions for ${row.name}`,
    })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions for Alpha')
  })

  it('renders the checkbox label and both column names in the locale the provider switches to', async () => {
    const host = mountView(AdminTable, { rows, columns, rowKey, bulkSelect: true, rowActions })
    const checkbox = () => host.querySelector('input[type="checkbox"]')
    const heads = () => Array.from(host.querySelectorAll('thead th'))
    expect(checkbox()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«en:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«en:adminTable.aria.actionsColumn»')
    await switchLocale('de')
    expect(checkbox()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«de:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«de:adminTable.aria.actionsColumn»')
  })
})
