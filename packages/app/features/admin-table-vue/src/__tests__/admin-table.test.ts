// @vitest-environment jsdom
/**
 * Unit tests for the Vue generic admin table — a port of
 * `@molecule/app-admin-table-react/src/__tests__/admin-table.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

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

// Forward onClick + pass-through attrs onto a native <button> so the kebab
// popover can be opened and its data-mol-id / aria-* asserted.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'MButton',
      inheritAttrs: false,
      props: {
        variant: String,
        size: String,
        onClick: Function,
      },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              onClick: (event: MouseEvent) => (props.onClick as (e: MouseEvent) => void)?.(event),
            },
            slots.default?.(),
          )
      },
    }),
  }
})

const { AdminTable } = await import('../AdminTable.js')
const { AdminTableRowActions } = await import('../AdminTableRowActions.js')

interface Row {
  id: string
  name: string
}

interface Mounted {
  app: ReturnType<typeof createApp>
  host: HTMLElement
}

/**
 * Mounts one component with the given props and slots.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its slots.
 * @returns The mounted app and its host element.
 */
function render(
  component: unknown,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  return { app, host }
}

/**
 * Mounts one component and returns just its host element.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its slots.
 * @returns The host element.
 */
function mount(
  component: unknown,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement {
  return render(component, props, slots).host
}

/**
 * Dispatches a bubbling click on an element, as a user click does, then lets
 * Vue flush the render it causes.
 *
 * @param element - The element to click.
 */
async function click(element: Element): Promise<void> {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

/**
 * Dispatches a bubbling keydown on an element, then lets Vue flush the render.
 *
 * @param element - The element to type on.
 * @param key - The key.
 */
async function keydown(element: Element, key: string): Promise<void> {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await nextTick()
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

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AdminTable (theme-aware surfaces)', () => {
  it('wraps in the cm.card() surface token, not bg-white/rounded-xl/shadow-sm', () => {
    const host = mount(AdminTable, { rows, columns, rowKey: (r: Row) => r.id })
    const cls = host.firstElementChild?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('rounded-xl')
  })

  it('styles the header row from surfaceSecondary + textMuted, not slate literals', () => {
    const host = mount(AdminTable, { rows, columns, rowKey: (r: Row) => r.id })
    const headRow = host.querySelector('thead tr')
    const cls = headRow?.getAttribute('class') ?? ''
    expect(cls).toContain('surfaceSecondary')
    expect(cls).toContain('textMuted')
    expect(cls).not.toContain('slate')
  })

  it('gives header cells the uppercase + trackingWide tokens (not raw tracking-wide)', () => {
    const host = mount(AdminTable, { rows, columns, rowKey: (r: Row) => r.id })
    const th = host.querySelector('thead th')
    const cls = th?.getAttribute('class') ?? ''
    expect(cls).toContain('uppercase')
    expect(cls).toContain('trackingWide')
  })

  it('renders data rows from the cm.tableRow token and marks clickable rows', () => {
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
      onRowClick: () => {},
    })
    const dataRow = host.querySelector('tbody tr')
    const cls = dataRow?.getAttribute('class') ?? ''
    expect(cls).toContain('tableRow')
    expect(cls).toContain('tableRowClickable')
    // data-mol-id present for automation/AI.
    expect(dataRow?.getAttribute('data-mol-id')).toBe('admin-table-row-a')
  })

  it('styles the bulk-select checkbox from cm.checkbox() with a data-mol-id, no green/gray literals', () => {
    const host = mount(AdminTable, { rows, columns, rowKey: (r: Row) => r.id, bulkSelect: true })
    const box = host.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('class')).toContain('checkbox')
    expect(box?.getAttribute('data-mol-id')).toBe('admin-table-select-a')
    expect(box?.getAttribute('class') ?? '').not.toContain('green')
  })

  it('renders skeleton bars from cm.skeleton(), not bg-gray/animate-pulse literals', () => {
    const host = mount(AdminTable, {
      rows: [],
      columns,
      rowKey: (r: Row) => r.id,
      loading: true,
      skeletonRowCount: 2,
    })
    const classes = allClasses(host)
    expect(classes).toContain('skeleton')
    expect(classes).not.toContain('bg-gray')
    expect(classes).not.toContain('animate-pulse')
  })

  it('emits no raw Tailwind / light-only class anywhere (full table variant)', () => {
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
      bulkSelect: true,
      onRowClick: () => {},
    })
    const classes = allClasses(host)
    for (const raw of RAW_TAILWIND) expect(classes).not.toContain(raw)
  })
})

describe('AdminTable (accessible names and row keys)', () => {
  const editAction = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

  it('gives each row checkbox the translated Select row name', () => {
    const host = mount(AdminTable, { rows, columns, rowKey: (r: Row) => r.id, bulkSelect: true })
    const box = host.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('aria-label')).toBe('Select row')
  })

  it('names the checkbox and actions column headers for screen readers', () => {
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
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
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
      onRowClick: () => {},
    })
    const row = host.querySelector('tbody tr')
    expect(row?.hasAttribute('role')).toBe(false)
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('Space on a row checkbox toggles it without opening the row', async () => {
    const onRowClick = vi.fn()
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
      bulkSelect: true,
      onRowClick,
    })
    const box = host.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!box) throw new Error('checkbox not found')
    // Space on a native checkbox: the keydown bubbles to the row, the browser
    // then toggles the box, which fires the click the component sees.
    await keydown(box, ' ')
    await click(box)
    expect(box.checked).toBe(true)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('opens and selects a row action without opening the row', async () => {
    const onRowClick = vi.fn()
    const onSelect = vi.fn()
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
      onRowClick,
      rowActions: editAction.map((action) => ({ ...action, onSelect })),
    })
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    // Enter on a native button: the keydown bubbles to the row, then the
    // browser produces the click the trigger handles.
    await keydown(trigger, 'Enter')
    await click(trigger)
    const item = host.querySelector('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('action not found')
    await click(item)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(rows[0])
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('Enter on the focused row opens it', async () => {
    const onRowClick = vi.fn()
    const host = mount(AdminTable, {
      rows,
      columns,
      rowKey: (r: Row) => r.id,
      onRowClick,
    })
    const row = host.querySelector('tbody tr')
    if (!row) throw new Error('row not found')
    await keydown(row, 'Enter')
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
  async function renderOpen(): Promise<HTMLElement> {
    const host = mount(AdminTableRowActions, {
      row: rows[0],
      actions,
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    await click(trigger)
    return host
  }

  it('gives the trigger a data-mol-id and marks it a menu popup', () => {
    const host = mount(AdminTableRowActions, {
      row: rows[0],
      actions,
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger).not.toBeNull()
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('styles the popover from surface + border tokens, not bg-white / ring-black', async () => {
    const host = await renderOpen()
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

  it('renders a destructive item in the theme error color; a normal item does not', async () => {
    const host = await renderOpen()
    const del = host.querySelector('[data-mol-id="row-action-delete"]')
    const edit = host.querySelector('[data-mol-id="row-action-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('uses a theme hover token on items, not hover:bg-gray-100', async () => {
    const host = await renderOpen()
    const edit = host.querySelector('[data-mol-id="row-action-edit"]')
    expect(edit?.getAttribute('class')).toContain('tableRowHoverable')
    expect(allClasses(host)).not.toContain('hover:bg-')
    expect(allClasses(host)).not.toContain('text-gray')
  })

  it('runs the action and closes the menu when an item is activated', async () => {
    const onSelect = vi.fn()
    const host = mount(AdminTableRowActions, {
      row: rows[0],
      actions: [{ label: 'Edit', onSelect, dataMolIdFor: () => 'row-action-edit' }],
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    await click(trigger)
    const edit = host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Native <button>: this click is what Enter/Space produce on it.
    await click(edit)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('keeps the menu open for clicks inside the popover; an outside click closes it', async () => {
    const host = await renderOpen()
    // Click on the menu surface itself (padding/text) — must NOT close.
    const item = host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('edit item not found')
    const surface = item.parentElement
    if (!surface) throw new Error('menu body not found')
    await click(surface)
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    // A click outside the popover (e.g. elsewhere on the page) closes it.
    await click(document.body)
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('closes the menu on Escape, from inside the menu and from the trigger', async () => {
    const host = await renderOpen()
    const edit = host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Keydown bubbles to the document-level listener, so Escape works while
    // keyboard focus is on a menu item…
    await keydown(edit, 'Escape')
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
    // …and after reopening, while focus is still on the trigger.
    const trigger = host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    await click(trigger)
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    await keydown(trigger, 'Escape')
    expect(host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })
})
