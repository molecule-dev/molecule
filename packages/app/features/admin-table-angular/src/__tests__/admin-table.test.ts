// @vitest-environment jsdom
/**
 * Unit tests of the Angular generic admin table — the port of
 * `@molecule/app-admin-table-react`'s own suite: the same test names and the
 * same behavioral assertions, mounted through Angular's real renderer (the
 * same JIT host approach the conformance kit's Angular adapter uses) and
 * asserted on the markup the components produce.
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

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.flex({...})`) and also usable bare
// (`cm.textMuted`). `cn(...)` joins tokens, calling any function-valued args
// first — the same mock the React package's own tests use.
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

const { AdminTable } = await import('../admin-table.component.js')
const { AdminTableRowActions } = await import('../admin-table-row-actions.component.js')

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
 * the way an Angular app would write it.
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
    changeDetection: ChangeDetectionStrategy.Eager,
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

/**
 * Mounts the component under test and keeps it for teardown.
 *
 * @param template - The host template.
 * @param component - The component class.
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
async function render(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const mountedHost = await mount(template, component, props)
  mounted.push(mountedHost)
  return mountedHost
}

/**
 * Dispatches a bubbling click on an element, then flushes change detection.
 *
 * @param m - The mounted host.
 * @param element - The element to click.
 */
function click(m: Mounted, element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  m.tick()
}

/**
 * Dispatches a bubbling keydown on an element, then flushes change detection.
 *
 * @param m - The mounted host.
 * @param element - The element to type on.
 * @param key - The key.
 */
function keydown(m: Mounted, element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  m.tick()
}

/**
 * Concatenate every element's `class` attribute (excludes inline styles).
 *
 * @param container - The mounted host.
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
const rowKey = (r: Row): string => r.id

const tableTemplate = `
  <ng-template #nameCell let-row><span data-name>{{ row.name }}</span></ng-template>
  <div
    mol-admin-table
    [rows]="p['rows']"
    [columns]="[{ id: 'name', header: 'Name', render: nameCell }]"
    [rowKey]="p['rowKey']"
    [loading]="p['loading']"
    [skeletonRowCount]="p['skeletonRowCount']"
    [onRowClick]="p['onRowClick']"
    [bulkSelect]="p['bulkSelect']"
    [selectedIds]="p['selectedIds']"
    [onSelectedIdsChange]="p['onSelectedIdsChange']"
    [rowActions]="p['rowActions']"
    [rowActionsAriaLabel]="p['rowActionsAriaLabel']"
    [className]="p['className']"
    [tbodyDataMolId]="p['tbodyDataMolId']"
  ></div>`

const actionsTemplate = `
  <div
    mol-admin-table-row-actions
    [row]="p['row']"
    [actions]="p['actions']"
    [ariaLabel]="p['ariaLabel']"
  ></div>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

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
  it('wraps in the cm.card() surface token, not bg-white/rounded-xl/shadow-sm', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, { rows, rowKey })
    const cls = m.host.firstElementChild?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('rounded-xl')
  })

  it('styles the header row from surfaceSecondary + textMuted, not slate literals', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, { rows, rowKey })
    const headRow = m.host.querySelector('thead tr')
    const cls = headRow?.getAttribute('class') ?? ''
    expect(cls).toContain('surfaceSecondary')
    expect(cls).toContain('textMuted')
    expect(cls).not.toContain('slate')
  })

  it('gives header cells the uppercase + trackingWide tokens (not raw tracking-wide)', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, { rows, rowKey })
    const th = m.host.querySelector('thead th')
    const cls = th?.getAttribute('class') ?? ''
    expect(cls).toContain('uppercase')
    expect(cls).toContain('trackingWide')
  })

  it('renders data rows from the cm.tableRow token and marks clickable rows', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      onRowClick: () => {},
    })
    const dataRow = m.host.querySelector('tbody tr')
    const cls = dataRow?.getAttribute('class') ?? ''
    expect(cls).toContain('tableRow')
    expect(cls).toContain('tableRowClickable')
    // data-mol-id present for automation/AI.
    expect(dataRow?.getAttribute('data-mol-id')).toBe('admin-table-row-a')
  })

  it('styles the bulk-select checkbox from cm.checkbox() with a data-mol-id, no green/gray literals', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      bulkSelect: true,
    })
    const box = m.host.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('class')).toContain('checkbox')
    expect(box?.getAttribute('data-mol-id')).toBe('admin-table-select-a')
    expect(box?.getAttribute('class') ?? '').not.toContain('green')
  })

  it('renders skeleton bars from cm.skeleton(), not bg-gray/animate-pulse literals', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows: [],
      rowKey,
      loading: true,
      skeletonRowCount: 2,
    })
    const classes = allClasses(m.host)
    expect(classes).toContain('skeleton')
    expect(classes).not.toContain('bg-gray')
    expect(classes).not.toContain('animate-pulse')
  })

  it('emits no raw Tailwind / light-only class anywhere (full table variant)', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      bulkSelect: true,
      onRowClick: () => {},
    })
    const classes = allClasses(m.host)
    for (const raw of RAW_TAILWIND) expect(classes).not.toContain(raw)
  })
})

describe('AdminTable (accessible names and row keys)', () => {
  const editAction = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

  it('gives each row checkbox the translated Select row name', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      bulkSelect: true,
    })
    const box = m.host.querySelector('input[type="checkbox"]')
    expect(box?.getAttribute('aria-label')).toBe('Select row')
  })

  it('names the checkbox and actions column headers for screen readers', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      bulkSelect: true,
      rowActions: editAction,
    })
    const heads = Array.from(m.host.querySelectorAll('thead th'))
    expect(heads.length).toBe(3)
    expect(heads[0]?.textContent).toBe('Select')
    expect(heads[2]?.textContent).toBe('Actions')
    // Both names are visually hidden spans, not visible header text.
    expect(heads[0]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
    expect(heads[2]?.querySelector('span')?.getAttribute('class')).toContain('srOnly')
  })

  it('a clickable row keeps the row role instead of link', async () => {
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      onRowClick: () => {},
    })
    const row = m.host.querySelector('tbody tr')
    expect(row?.hasAttribute('role')).toBe(false)
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('Space on a row checkbox toggles it without opening the row', async () => {
    const onRowClick = vi.fn()
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      bulkSelect: true,
      onRowClick,
    })
    const box = m.host.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!box) throw new Error('checkbox not found')
    // Space on a native checkbox: the keydown bubbles to the row, the browser
    // then toggles the box, which fires the click the component sees.
    keydown(m, box, ' ')
    click(m, box)
    expect(box.checked).toBe(true)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('opens and selects a row action without opening the row', async () => {
    const onRowClick = vi.fn()
    const onSelect = vi.fn()
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      onRowClick,
      rowActions: editAction.map((action) => ({ ...action, onSelect })),
    })
    const trigger = m.host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    // Enter on a native button: the keydown bubbles to the row, then the
    // browser produces the click the trigger handles.
    keydown(m, trigger, 'Enter')
    click(m, trigger)
    const item = m.host.querySelector('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('action not found')
    click(m, item)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(rows[0])
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('Enter on the focused row opens it', async () => {
    const onRowClick = vi.fn()
    const m = await render(tableTemplate, AdminTable as Type<unknown>, {
      rows,
      rowKey,
      onRowClick,
    })
    const row = m.host.querySelector('tbody tr')
    if (!row) throw new Error('row not found')
    keydown(m, row, 'Enter')
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
   * Render and click the kebab open, returning the mounted host.
   *
   * @returns The mounted host.
   */
  async function renderOpen(): Promise<Mounted> {
    const m = await render(actionsTemplate, AdminTableRowActions as Type<unknown>, {
      row: rows[0],
      actions,
      ariaLabel: 'Row actions',
    })
    const trigger = m.host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(m, trigger)
    return m
  }

  it('gives the trigger a data-mol-id and marks it a menu popup', async () => {
    const m = await render(actionsTemplate, AdminTableRowActions as Type<unknown>, {
      row: rows[0],
      actions,
      ariaLabel: 'Row actions',
    })
    const trigger = m.host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger).not.toBeNull()
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('styles the popover from surface + border tokens, not bg-white / ring-black', async () => {
    const m = await renderOpen()
    const popover = m.host
      .querySelector('[data-mol-id="row-action-edit"]')
      ?.closest('div')?.parentElement
    const cls = popover?.getAttribute('class') ?? ''
    expect(cls).toContain('surface')
    expect(cls).toContain('borderAll')
    const classes = allClasses(m.host)
    expect(classes).not.toContain('bg-white')
    expect(classes).not.toContain('ring-black')
  })

  it('renders a destructive item in the theme error color; a normal item does not', async () => {
    const m = await renderOpen()
    const del = m.host.querySelector('[data-mol-id="row-action-delete"]')
    const edit = m.host.querySelector('[data-mol-id="row-action-edit"]')
    expect(del?.getAttribute('class')).toContain('textError')
    expect(edit?.getAttribute('class')).not.toContain('textError')
  })

  it('uses a theme hover token on items, not hover:bg-gray-100', async () => {
    const m = await renderOpen()
    const edit = m.host.querySelector('[data-mol-id="row-action-edit"]')
    expect(edit?.getAttribute('class')).toContain('tableRowHoverable')
    expect(allClasses(m.host)).not.toContain('hover:bg-')
    expect(allClasses(m.host)).not.toContain('text-gray')
  })

  it('runs the action and closes the menu when an item is activated', async () => {
    const onSelect = vi.fn()
    const m = await render(actionsTemplate, AdminTableRowActions as Type<unknown>, {
      row: rows[0],
      actions: [{ label: 'Edit', onSelect, dataMolIdFor: () => 'row-action-edit' }],
      ariaLabel: 'Row actions',
    })
    const trigger = m.host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(m, trigger)
    const edit = m.host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Native <button>: this click is what Enter/Space produce on it.
    click(m, edit)
    await Promise.resolve()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(m.host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('keeps the menu open for clicks inside the popover; an outside click closes it', async () => {
    const m = await renderOpen()
    // Click on the menu surface itself (padding/text) — must NOT close.
    const item = m.host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!item) throw new Error('edit item not found')
    const surface = item.parentElement
    if (!surface) throw new Error('menu body not found')
    click(m, surface)
    expect(m.host.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    // A click outside the popover (e.g. elsewhere on the page) closes it.
    click(m, document.body)
    expect(m.host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })

  it('closes the menu on Escape, from inside the menu and from the trigger', async () => {
    const m = await renderOpen()
    const edit = m.host.querySelector<HTMLElement>('[data-mol-id="row-action-edit"]')
    if (!edit) throw new Error('edit item not found')
    // Keydown bubbles to the document-level listener, so Escape works while
    // keyboard focus is on a menu item…
    keydown(m, edit, 'Escape')
    expect(m.host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
    // …and after reopening, while focus is still on the trigger.
    const trigger = m.host.querySelector<HTMLElement>(
      '[data-mol-id="admin-table-row-actions-trigger"]',
    )
    if (!trigger) throw new Error('trigger not found')
    click(m, trigger)
    expect(m.host.querySelector('[data-mol-id="row-action-edit"]')).not.toBeNull()
    keydown(m, trigger, 'Escape')
    expect(m.host.querySelector('[data-mol-id="row-action-edit"]')).toBeNull()
  })
})
