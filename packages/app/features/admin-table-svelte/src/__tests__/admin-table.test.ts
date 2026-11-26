// @vitest-environment jsdom
/**
 * Unit tests for the Svelte generic admin table — a port of
 * `@molecule/app-admin-table-react/src/__tests__/admin-table.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Svelte 5
 * in jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap: each accessed member echoes its own name as the "class", so a
// test can assert *which* cm.* member produced a class (e.g. `card`, `surface`,
// `textError`) independent of the Tailwind bond's real strings — the same mock
// the React package's own tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { default: AdminTable } = await import('../AdminTable.svelte')
const { default: AdminTableRowActions } = await import('../AdminTableRowActions.svelte')

interface Row {
  id: string
  name: string
}

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** A cell snippet: the row it is handed, rendered as text. */
const cell = <Value>(render: (row: Value) => string): Snippet<[Value]> =>
  createRawSnippet<[Value]>((row) => ({ render: () => render(row()) }))

/**
 * Mounts one component and returns its host element.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The host element.
 */
function render(component: unknown, props: Record<string, unknown> = {}): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(component as never, { target, props }))
  flushSync()
  return target
}

/**
 * Dispatches a bubbling click on an element and flushes the render it causes.
 *
 * @param element - The element to click.
 */
function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  flushSync()
}

/**
 * Dispatches a bubbling keydown on an element and flushes the render it causes.
 *
 * @param element - The element to type on.
 * @param key - The key.
 */
function keydown(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  flushSync()
}

/**
 * Concatenate every element's `class` attribute (excludes inline styles).
 *
 * @param container - The mounted root.
 * @returns The joined class attributes.
 */
function allClasses(container: HTMLElement): string {
  return Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((el) => el.getAttribute('class') ?? '')
    .join(' ')
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const columns = [{ id: 'name', header: 'Name', render: cell<Row>((r) => r.name) }]
const rowKey = (r: Row): string => r.id

// Light-only / raw Tailwind literals this migration removed. `material-symbols-outlined`
// (icon font) is intentionally not in this list.
const RAW_TAILWIND = [
  'bg-white',
  'rounded-xl',
  'shadow-sm',
  'slate',
  'bg-gray',
  'text-gray',
  'border-gray',
  'green-',
  'text-red',
  'red-6',
  'ring-black',
  'ring-1',
  'divide-',
  'animate-pulse',
  'hover:bg-',
  'tracking-wide',
  'text-left',
]

describe('AdminTable (theme-aware surfaces)', () => {
  it('wraps in the cm.card() surface token, not bg-white/rounded-xl/shadow-sm', () => {
    const host = render(AdminTable, { rows, columns, rowKey })
    const cls = host.firstElementChild?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('rounded-xl')
  })

  it('styles the header row from surfaceSecondary + textMuted, not slate literals', () => {
    const host = render(AdminTable, { rows, columns, rowKey })
    const headRow = host.querySelector('thead tr')
    const cls = headRow?.getAttribute('class') ?? ''
    expect(cls).toContain('surfaceSecondary')
    expect(cls).toContain('textMuted')
    expect(cls).not.toContain('slate')
  })

  it('gives header cells the uppercase + trackingWide tokens (not raw tracking-wide)', () => {
    const host = render(AdminTable, { rows, columns, rowKey })
    const th = host.querySelector('thead th')
    const cls = th?.getAttribute('class') ?? ''
    expect(cls).toContain('uppercase')
    expect(cls).toContain('trackingWide')
  })

  it('renders data rows from the cm.tableRow token and marks clickable rows', () => {
    const host = render(AdminTable, { rows, columns, rowKey, onRowClick: () => {} })
    const dataRow = host.querySelector('tbody tr')
    const cls = dataRow?.getAttribute('class') ?? ''
    expect(cls).toContain('tableRow')
    expect(cls).toContain('tableRowClickable')
    // data-mol-id present for automation/AI.
    expect(dataRow?.getAttribute('data-mol-id')).toBe('admin-table-row-a')
  })

  it('styles the bulk-select checkbox from cm.checkbox() with a data-mol-id, no green/gray literals', () => {
    const host = render(AdminTable, { rows, columns, rowKey, bulkSelect: true })
    const box = host.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('class')).toContain('checkbox')
    expect(box?.getAttribute('data-mol-id')).toBe('admin-table-select-a')
    expect(box?.getAttribute('class') ?? '').not.toContain('green')
  })

  it('renders skeleton bars from cm.skeleton(), not bg-gray/animate-pulse literals', () => {
    const host = render(AdminTable, {
      rows: [],
      columns,
      rowKey,
      loading: true,
      skeletonRowCount: 2,
    })
    const classes = allClasses(host)
    expect(classes).toContain('skeleton')
    expect(classes).not.toContain('bg-gray')
    expect(classes).not.toContain('animate-pulse')
  })

  it('emits no raw Tailwind / light-only class anywhere (full table variant)', () => {
    const host = render(AdminTable, {
      rows,
      columns,
      rowKey,
      bulkSelect: true,
      onRowClick: () => {},
    })
    const classes = allClasses(host)
    for (const rawClass of RAW_TAILWIND) expect(classes).not.toContain(rawClass)
  })
})

describe('AdminTable (accessible names and row keys)', () => {
  const editAction = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

  it('gives each row checkbox the translated Select row name', () => {
    const host = render(AdminTable, { rows, columns, rowKey, bulkSelect: true })
    const box = host.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('aria-label')).toBe('Select row')
  })

  it('names the checkbox and actions column headers for screen readers', () => {
    const host = render(AdminTable, {
      rows,
      columns,
      rowKey,
      bulkSelect: true,
      rowActions: editAction,
    })
    const heads = Array.from(host.querySelectorAll('thead th'))
    expect(heads.length).toBe(3)
    expect(heads[0]?.textContent).toBe('Select')
    expect(heads[2]?.textContent).toBe('Actions')
    // Both names are visually hidden spans, not visible header text.
    expect(heads[0]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
    expect(heads[2]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
  })

  it('a clickable row keeps the row role instead of link', () => {
    const host = render(AdminTable, { rows, columns, rowKey, onRowClick: () => {} })
    const row = host.querySelector('tbody tr')
    expect(row?.hasAttribute('role')).toBe(false)
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('Space on a row checkbox toggles it without opening the row', () => {
    const onRowClick = vi.fn()
    const host = render(AdminTable, { rows, columns, rowKey, bulkSelect: true, onRowClick })
    const box = host.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!box) throw new Error('checkbox not found')
    // Space on a native checkbox: the keydown bubbles to the row, the browser
    // then toggles the box, which fires the click the component sees.
    keydown(box, ' ')
    click(box)
    expect(box.checked).toBe(true)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('opens and selects a row action without opening the row', () => {
    const onRowClick = vi.fn()
    const onSelect = vi.fn()
    const host = render(AdminTable, {
      rows,
      columns,
      rowKey,
      onRowClick,
      rowActions: editAction.map((action) => ({ ...action, onSelect })),
    })
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    // Enter on a native button: the keydown bubbles to the row, then the
    // browser produces the click the trigger handles.
    keydown(trigger, 'Enter')
    click(trigger)
    const item = host.querySelector('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('action not found')
    click(item)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(rows[0])
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('Enter on the focused row opens it', () => {
    const onRowClick = vi.fn()
    const host = render(AdminTable, { rows, columns, rowKey, onRowClick })
    const row = host.querySelector('tbody tr')
    if (!row) throw new Error('row not found')
    keydown(row, 'Enter')
    expect(onRowClick).toHaveBeenCalledTimes(1)
  })
})

describe('AdminTableRowActions (kebab menu)', () => {
  const actions = [
    { label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' },
    {
      label: 'Delete',
      destructive: true,
      onSelect: () => {},
      dataMolIdFor: () => 'row-action-delete',
    },
  ]

  /**
   * Render and click the kebab open, returning the container.
   *
   * @returns The mounted host element.
   */
  function renderOpen(): HTMLElement {
    const host = render(AdminTableRowActions, {
      row: rows[0],
      actions,
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(trigger)
    return host
  }

  it('gives the trigger a data-mol-id and marks it a menu popup', () => {
    const host = render(AdminTableRowActions, {
      row: rows[0],
      actions,
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger).not.toBeNull()
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('styles the popover from surface + border tokens, not bg-white / ring-black', () => {
    const host = renderOpen()
    const popover = host
      .querySelector('[data-mol-id="row-action-edit"]')
      ?.closest('div')?.parentElement
    const cls = popover?.getAttribute('class') ?? ''
    expect(cls).toContain('surface')
    expect(cls).toContain('borderAll')
    const classes = allClasses(host)
    expect(classes).not.toContain('bg-white')
    expect(classes).not.toContain('ring-black')
  })

  it('renders a destructive item in the theme error color; a normal item does not', () => {
    const host = renderOpen()
    const del = host.querySelector('[data-mol-id="row-action-delete"]')
    const edit = host.querySelector('[data-mol-id="row-action-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('uses a theme hover token on items, not hover:bg-gray-100', () => {
    const host = renderOpen()
    const edit = host.querySelector('[data-mol-id="row-action-edit"]')
    expect(edit?.getAttribute('class')).toContain('tableRowHoverable')
    expect(allClasses(host)).not.toContain('hover:bg-')
    expect(allClasses(host)).not.toContain('text-gray')
  })

  it('runs the action and closes the menu when an item is activated', async () => {
    const onSelect = vi.fn()
    const host = render(AdminTableRowActions, {
      row: rows[0],
      actions: [{ label: 'Edit', onSelect, dataMolIdFor: () => 'row-action-edit' }],
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(trigger)
    const edit = host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Native <button>: this click is what Enter/Space produce on it.
    click(edit)
    await Promise.resolve()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('keeps the menu open for clicks inside the popover; an outside click closes it', () => {
    const host = renderOpen()
    // Click on the menu surface itself (padding/text) — must NOT close.
    const item = host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('edit item not found')
    const surface = item.parentElement
    if (!surface) throw new Error('menu body not found')
    click(surface)
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    // A click outside the popover (e.g. elsewhere on the page) closes it.
    click(document.body)
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('closes the menu on Escape, from inside the menu and from the trigger', () => {
    const host = renderOpen()
    const edit = host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Keydown bubbles to the document-level listener, so Escape works while
    // keyboard focus is on a menu item…
    keydown(edit, 'Escape')
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
    // …and after reopening, while focus is still on the trigger.
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(trigger)
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    keydown(trigger, 'Escape')
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })
})
