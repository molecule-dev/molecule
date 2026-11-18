// @vitest-environment jsdom
/**
 * Unit tests for the Solid generic admin table — a port of
 * `@molecule/app-admin-table-react/src/__tests__/admin-table.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Solid in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap: each accessed member echoes its own name as the "class", so a
// test can assert *which* cm.* member produced a class (e.g. `card`, `surface`,
// `textError`) independent of the Tailwind bond's real strings — the same mock
// the React package's own tests use.
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

/** The props the table hands the UI Button. */
interface MockButtonProps {
  /** The kebab glyph. */
  children?: JSX.Element
  /** Click handler forwarded onto the native button. */
  onClick?: (event: MouseEvent) => void
  /** Accessible label. */
  'aria-label'?: string
  /** Menu-popup marker. */
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  /** Expanded state. */
  'aria-expanded'?: boolean | 'false' | 'true'
  /** Test/automation selector. */
  'data-mol-id'?: string
}

// Forward onClick + pass-through attrs onto a native <button> so the kebab
// popover can be opened and its data-mol-id / aria-* asserted.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: MockButtonProps) => (
    <button
      onClick={props.onClick}
      aria-label={props['aria-label']}
      aria-haspopup={props['aria-haspopup']}
      aria-expanded={props['aria-expanded']}
      data-mol-id={props['data-mol-id']}
    >
      {props.children}
    </button>
  ),
}))

const { AdminTable } = await import('../AdminTable.jsx')
const { AdminTableRowActions } = await import('../AdminTableRowActions.jsx')

interface Row {
  id: string
  name: string
}

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to mount.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Dispatches a bubbling click on an element, as a user click does.
 *
 * @param element - The element to click.
 */
function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

/**
 * Dispatches a bubbling keydown on an element.
 *
 * @param element - The element to type on.
 * @param key - The key.
 */
function keydown(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
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
const columns = [{ id: 'name', header: 'Name', render: (r: Row) => r.name }]

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
    const container = mount(() => <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} />)
    const cls = container.firstElementChild?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('rounded-xl')
  })

  it('styles the header row from surfaceSecondary + textMuted, not slate literals', () => {
    const container = mount(() => <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} />)
    const headRow = container.querySelector('thead tr')
    const cls = headRow?.getAttribute('class') ?? ''
    expect(cls).toContain('surfaceSecondary')
    expect(cls).toContain('textMuted')
    expect(cls).not.toContain('slate')
  })

  it('gives header cells the uppercase + trackingWide tokens (not raw tracking-wide)', () => {
    const container = mount(() => <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} />)
    const th = container.querySelector('thead th')
    const cls = th?.getAttribute('class') ?? ''
    expect(cls).toContain('uppercase')
    expect(cls).toContain('trackingWide')
  })

  it('renders data rows from the cm.tableRow token and marks clickable rows', () => {
    const container = mount(() => (
      <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={() => {}} />
    ))
    const dataRow = container.querySelector('tbody tr')
    const cls = dataRow?.getAttribute('class') ?? ''
    expect(cls).toContain('tableRow')
    expect(cls).toContain('tableRowClickable')
    // data-mol-id present for automation/AI.
    expect(dataRow?.getAttribute('data-mol-id')).toBe('admin-table-row-a')
  })

  it('styles the bulk-select checkbox from cm.checkbox() with a data-mol-id, no green/gray literals', () => {
    const container = mount(() => (
      <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} bulkSelect />
    ))
    const box = container.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('class')).toContain('checkbox')
    expect(box?.getAttribute('data-mol-id')).toBe('admin-table-select-a')
    expect(box?.getAttribute('class') ?? '').not.toContain('green')
  })

  it('renders skeleton bars from cm.skeleton(), not bg-gray/animate-pulse literals', () => {
    const container = mount(() => (
      <AdminTable rows={[]} columns={columns} rowKey={(r) => r.id} loading skeletonRowCount={2} />
    ))
    const classes = allClasses(container)
    expect(classes).toContain('skeleton')
    expect(classes).not.toContain('bg-gray')
    expect(classes).not.toContain('animate-pulse')
  })

  it('emits no raw Tailwind / light-only class anywhere (full table variant)', () => {
    const container = mount(() => (
      <AdminTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        bulkSelect
        onRowClick={() => {}}
      />
    ))
    const classes = allClasses(container)
    for (const raw of RAW_TAILWIND) expect(classes).not.toContain(raw)
  })
})

describe('AdminTable (accessible names and row keys)', () => {
  const editAction = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

  it('gives each row checkbox the translated Select row name', () => {
    const container = mount(() => (
      <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} bulkSelect />
    ))
    const box = container.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('aria-label')).toBe('Select row')
  })

  it('names the checkbox and actions column headers for screen readers', () => {
    const container = mount(() => (
      <AdminTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        bulkSelect
        rowActions={editAction}
      />
    ))
    const heads = Array.from(container.querySelectorAll('thead th'))
    expect(heads.length).toBe(3)
    expect(heads[0]?.textContent).toBe('Select')
    expect(heads[2]?.textContent).toBe('Actions')
    // Both names are visually hidden spans, not visible header text.
    expect(heads[0]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
    expect(heads[2]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
  })

  it('a clickable row keeps the row role instead of link', () => {
    const container = mount(() => (
      <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={() => {}} />
    ))
    const row = container.querySelector('tbody tr')
    expect(row?.hasAttribute('role')).toBe(false)
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('Space on a row checkbox toggles it without opening the row', () => {
    const onRowClick = vi.fn()
    const container = mount(() => (
      <AdminTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        bulkSelect
        onRowClick={onRowClick}
      />
    ))
    const box = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!box) throw new Error('checkbox not found')
    // Space on a native checkbox: the keydown bubbles to the row, the browser
    // then toggles the box, which fires the click the component sees.
    keydown(box, ' ')
    click(box)
    expect(box.checked).toBe(true)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('Enter on the row-actions trigger opens the menu without opening the row', () => {
    const onRowClick = vi.fn()
    const container = mount(() => (
      <AdminTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
        rowActions={editAction}
      />
    ))
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    // Enter on a native button: the keydown bubbles to the row, then the
    // browser produces the click the trigger handles.
    keydown(trigger, 'Enter')
    click(trigger)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('Enter on the focused row opens it', () => {
    const onRowClick = vi.fn()
    const container = mount(() => (
      <AdminTable rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={onRowClick} />
    ))
    const row = container.querySelector('tbody tr')
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
   * @returns The mounted container.
   */
  function renderOpen(): HTMLElement {
    const container = mount(() => (
      <AdminTableRowActions row={rows[0]!} actions={actions} ariaLabel="Row actions" />
    ))
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(trigger)
    return container
  }

  it('gives the trigger a data-mol-id and marks it a menu popup', () => {
    const container = mount(() => (
      <AdminTableRowActions row={rows[0]!} actions={actions} ariaLabel="Row actions" />
    ))
    const trigger = container.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger).not.toBeNull()
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('styles the popover from surface + border tokens, not bg-white / ring-black', () => {
    const container = renderOpen()
    const popover = container
      .querySelector('[data-mol-id="row-action-edit"]')
      ?.closest('div')?.parentElement
    const cls = popover?.getAttribute('class') ?? ''
    expect(cls).toContain('surface')
    expect(cls).toContain('borderAll')
    const classes = allClasses(container)
    expect(classes).not.toContain('bg-white')
    expect(classes).not.toContain('ring-black')
  })

  it('renders a destructive item in the theme error color; a normal item does not', () => {
    const container = renderOpen()
    const del = container.querySelector('[data-mol-id="row-action-delete"]')
    const edit = container.querySelector('[data-mol-id="row-action-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('uses a theme hover token on items, not hover:bg-gray-100', () => {
    const container = renderOpen()
    const edit = container.querySelector('[data-mol-id="row-action-edit"]')
    expect(edit?.getAttribute('class')).toContain('tableRowHoverable')
    expect(allClasses(container)).not.toContain('hover:bg-')
    expect(allClasses(container)).not.toContain('text-gray')
  })

  it('runs the action and closes the menu when an item is activated', async () => {
    const onSelect = vi.fn()
    const container = mount(() => (
      <AdminTableRowActions
        row={rows[0]!}
        actions={[{ label: 'Edit', onSelect, dataMolIdFor: () => 'row-action-edit' }]}
        ariaLabel="Row actions"
      />
    ))
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(trigger)
    const edit = container.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Native <button>: this click is what Enter/Space produce on it.
    click(edit)
    await Promise.resolve()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('keeps the menu open for clicks inside the popover; an outside click closes it', () => {
    const container = renderOpen()
    // Click on the menu surface itself (padding/text) — must NOT close.
    const item = container.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('edit item not found')
    const surface = item.parentElement
    if (!surface) throw new Error('menu body not found')
    click(surface)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    // A click outside the popover (e.g. elsewhere on the page) closes it.
    click(document.body)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('closes the menu on Escape, from inside the menu and from the trigger', () => {
    const container = renderOpen()
    const edit = container.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Keydown bubbles to the document-level listener, so Escape works while
    // keyboard focus is on a menu item…
    keydown(edit, 'Escape')
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
    // …and after reopening, while focus is still on the trigger.
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(trigger)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    keydown(trigger, 'Escape')
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })
})
