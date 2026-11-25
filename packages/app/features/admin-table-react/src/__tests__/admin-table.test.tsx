// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap: each accessed member echoes its own name as the "class", so a
// test can assert *which* cm.* member produced a class (e.g. `card`, `surface`,
// `textError`) independent of the Tailwind bond's real strings. A raw literal
// the component still hardcodes would flow through `cn` unchanged and be caught
// by the negative sweeps.
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

// Forward onClick + pass-through attrs onto a native <button> so the kebab
// popover can be opened and its data-mol-id / aria-* asserted.
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick,
    ['aria-label']: ariaLabel,
    ['aria-haspopup']: ariaHaspopup,
    ['aria-expanded']: ariaExpanded,
    ['data-mol-id']: dataMolId,
  }: {
    children?: ReactNode
    onClick?: (e: unknown) => void
    'aria-label'?: string
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
    'data-mol-id'?: string
  }) =>
    createElement(
      'button',
      {
        onClick,
        'aria-label': ariaLabel,
        'aria-haspopup': ariaHaspopup,
        'aria-expanded': ariaExpanded,
        'data-mol-id': dataMolId,
      },
      children,
    ),
}))

const { AdminTable } = await import('../AdminTable.js')
const { AdminTableRowActions } = await import('../AdminTableRowActions.js')

afterEach(() => cleanup())

interface Row {
  id: string
  name: string
}
const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const columns = [{ id: 'name', header: 'Name', render: (r: Row) => r.name }]

/** Concatenate every element's `class` attribute (excludes inline styles). */
function allClasses(container: HTMLElement): string {
  return Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((el) => el.getAttribute('class') ?? '')
    .join(' ')
}

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
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id }),
    )
    const cls = container.firstElementChild?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('rounded-xl')
  })

  it('styles the header row from surfaceSecondary + textMuted, not slate literals', () => {
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id }),
    )
    const headRow = container.querySelector('thead tr')
    const cls = headRow?.getAttribute('class') ?? ''
    expect(cls).toContain('surfaceSecondary')
    expect(cls).toContain('textMuted')
    expect(cls).not.toContain('slate')
  })

  it('gives header cells the uppercase + trackingWide tokens (not raw tracking-wide)', () => {
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id }),
    )
    const th = container.querySelector('thead th')
    const cls = th?.getAttribute('class') ?? ''
    expect(cls).toContain('uppercase')
    expect(cls).toContain('trackingWide')
  })

  it('renders data rows from the cm.tableRow token and marks clickable rows', () => {
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id, onRowClick: () => {} }),
    )
    const dataRow = container.querySelector('tbody tr')
    const cls = dataRow?.getAttribute('class') ?? ''
    expect(cls).toContain('tableRow')
    expect(cls).toContain('tableRowClickable')
    // data-mol-id present for automation/AI.
    expect(dataRow?.getAttribute('data-mol-id')).toBe('admin-table-row-a')
  })

  it('styles the bulk-select checkbox from cm.checkbox() with a data-mol-id, no green/gray literals', () => {
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id, bulkSelect: true }),
    )
    const box = container.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('class')).toContain('checkbox')
    expect(box?.getAttribute('data-mol-id')).toBe('admin-table-select-a')
    expect(box?.getAttribute('class') ?? '').not.toContain('green')
  })

  it('renders skeleton bars from cm.skeleton(), not bg-gray/animate-pulse literals', () => {
    const { container } = render(
      createElement(AdminTable<Row>, {
        rows: [],
        columns,
        rowKey: (r) => r.id,
        loading: true,
        skeletonRowCount: 2,
      }),
    )
    const classes = allClasses(container)
    expect(classes).toContain('skeleton')
    expect(classes).not.toContain('bg-gray')
    expect(classes).not.toContain('animate-pulse')
  })

  it('emits no raw Tailwind / light-only class anywhere (full table variant)', () => {
    const { container } = render(
      createElement(AdminTable<Row>, {
        rows,
        columns,
        rowKey: (r) => r.id,
        bulkSelect: true,
        onRowClick: () => {},
      }),
    )
    const classes = allClasses(container)
    for (const raw of RAW_TAILWIND) expect(classes).not.toContain(raw)
  })
})

describe('AdminTable (accessible names and row keys)', () => {
  const editAction = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

  it('gives each row checkbox the translated Select row name', () => {
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id, bulkSelect: true }),
    )
    const box = container.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('aria-label')).toBe('Select row')
  })

  it('names the checkbox and actions column headers for screen readers', () => {
    const { container } = render(
      createElement(AdminTable<Row>, {
        rows,
        columns,
        rowKey: (r) => r.id,
        bulkSelect: true,
        rowActions: editAction,
      }),
    )
    const heads = Array.from(container.querySelectorAll('thead th'))
    expect(heads.length).toBe(3)
    expect(heads[0]?.textContent).toBe('Select')
    expect(heads[2]?.textContent).toBe('Actions')
    // Both names are visually hidden spans, not visible header text.
    expect(heads[0]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
    expect(heads[2]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
  })

  it('a clickable row keeps the row role instead of link', () => {
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id, onRowClick: () => {} }),
    )
    const row = container.querySelector('tbody tr')
    expect(row?.hasAttribute('role')).toBe(false)
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('Space on a row checkbox toggles it without opening the row', () => {
    const onRowClick = vi.fn()
    const { container } = render(
      createElement(AdminTable<Row>, {
        rows,
        columns,
        rowKey: (r) => r.id,
        bulkSelect: true,
        onRowClick,
      }),
    )
    const box = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!box) throw new Error('checkbox not found')
    // Space on a native checkbox: the keydown bubbles to the row, the browser
    // then toggles the box, which fires the click React sees.
    fireEvent.keyDown(box, { key: ' ' })
    fireEvent.click(box)
    expect(box.checked).toBe(true)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('opens and selects a row action without opening the row', () => {
    const onRowClick = vi.fn()
    const onSelect = vi.fn()
    const { container } = render(
      createElement(AdminTable<Row>, {
        rows,
        columns,
        rowKey: (r) => r.id,
        onRowClick,
        rowActions: editAction.map((action) => ({ ...action, onSelect })),
      }),
    )
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    // Enter on a native button: the keydown bubbles to the row, then the
    // browser produces the click the trigger handles.
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(trigger)
    const item = container.querySelector('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('action not found')
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(rows[0])
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('Enter on the focused row opens it', () => {
    const onRowClick = vi.fn()
    const { container } = render(
      createElement(AdminTable<Row>, { rows, columns, rowKey: (r) => r.id, onRowClick }),
    )
    const row = container.querySelector('tbody tr')
    if (!row) throw new Error('row not found')
    fireEvent.keyDown(row, { key: 'Enter' })
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

  /** Render and click the kebab open, returning the container. */
  function renderOpen(): HTMLElement {
    const { container } = render(
      createElement(AdminTableRowActions<Row>, { row: rows[0], actions, ariaLabel: 'Row actions' }),
    )
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    fireEvent.click(trigger)
    return container
  }

  it('gives the trigger a data-mol-id and marks it a menu popup', () => {
    const { container } = render(
      createElement(AdminTableRowActions<Row>, { row: rows[0], actions, ariaLabel: 'Row actions' }),
    )
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
    const container = render(
      createElement(AdminTableRowActions<Row>, {
        row: rows[0],
        actions: [{ label: 'Edit', onSelect, dataMolIdFor: () => 'row-action-edit' }],
        ariaLabel: 'Row actions',
      }),
    ).container
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    fireEvent.click(trigger)
    const edit = container.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Native <button>: this click is what Enter/Space produce on it.
    fireEvent.click(edit)
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
    fireEvent.click(surface)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    // A click outside the popover (e.g. elsewhere on the page) closes it.
    fireEvent.click(document.body)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('closes the menu on Escape, from inside the menu and from the trigger', () => {
    const container = renderOpen()
    const edit = container.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Keydown bubbles to the document-level listener, so Escape works while
    // keyboard focus is on a menu item…
    fireEvent.keyDown(edit, { key: 'Escape' })
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
    // …and after reopening, while focus is still on the trigger.
    const trigger = container.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    fireEvent.click(trigger)
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(container.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })
})
