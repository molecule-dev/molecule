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
})
