// @vitest-environment jsdom
/**
 * Unit tests of the Angular data-table UI primitives — the port of
 * `@molecule/app-data-table-ui-react`'s own suite: the same test names and the
 * same behavioral assertions, mounted through Angular's real renderer (the same
 * JIT host approach the conformance kit's Angular adapter uses) and asserted on
 * the markup each component produces.
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
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.textCenter`).
// `cn(...)` joins tokens, calling any function-valued args first — the same mock
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

const { DataTableCard } = await import('../data-table-card.component.js')
const { RowWithActions } = await import('../row-with-actions.component.js')
const { TableEmpty } = await import('../table-empty.component.js')
const { TableFooter } = await import('../table-footer.component.js')
const { TableToolbar } = await import('../table-toolbar.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

interface Row {
  id: string
  name: string
}

const rows: Row[] = [
  { id: '1', name: 'alpha' },
  { id: '2', name: 'beta' },
]
const rowKey = (r: Row): string => r.id

let hostCount = 0

const mounted: Mounted[] = []

/** Mounts the component under test and keeps it for teardown. */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

/**
 * The `DataTableCard` host template: two column templates, every input bound,
 * and the given projected content.
 *
 * @param inside - Content projected into the card (its slots).
 * @returns The host template.
 */
const cardTemplate = (inside = ''): string => `
  <ng-template #nameCell let-row><span>cell-{{ row.name }}</span></ng-template>
  <ng-template #idCell let-row><span>id-{{ row.id }}</span></ng-template>
  <section
    mol-data-table-card
    [title]="p['title']"
    [titleAction]="p['titleAction']"
    [columns]="[{ key: 'name', header: 'Name', cell: nameCell }, { key: 'id', header: 'ID', cell: idCell }]"
    [rows]="p['rows']"
    [rowKey]="p['rowKey']"
    [loading]="p['loading']"
    [onRowClick]="p['onRowClick']"
    [emptyMessage]="p['emptyMessage']"
    [className]="p['className']"
    [dataMolId]="p['dataMolId']"
  >${inside}</section>`

/**
 * The `RowWithActions` host template.
 *
 * @param inside - The row's cells.
 * @param slots - The row's slot content.
 * @returns The host template.
 */
const rowTemplate = (inside = '<td data-cell>x</td>', slots = ''): string => `
  <tr
    mol-row-with-actions
    [actions]="p['actions']"
    [onClick]="p['onClick']"
    [selected]="p['selected']"
    [className]="p['className']"
  >${inside}${slots}</tr>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('DataTableCard', () => {
  it('renders the title and titleAction in the header row', async () => {
    const m = await render(
      cardTemplate('<a slot="titleAction" data-action></a>'),
      DataTableCard as Type<unknown>,
      { title: 'My Table', rows, rowKey },
    )
    expect(m.host.innerHTML).toContain('My Table')
    expect(m.host.innerHTML).toContain('data-action=""')
  })

  it('omits the header row when neither title nor titleAction is given', async () => {
    const m = await render(cardTemplate(), DataTableCard as Type<unknown>, { rows, rowKey })
    expect(m.host.innerHTML).not.toContain('<h3')
  })

  it('renders every column header', async () => {
    const m = await render(cardTemplate(), DataTableCard as Type<unknown>, { rows, rowKey })
    expect(m.host.innerHTML).toContain('Name')
    expect(m.host.innerHTML).toContain('ID')
  })

  it('renders each row via the column cell renderers', async () => {
    const m = await render(cardTemplate(), DataTableCard as Type<unknown>, { rows, rowKey })
    expect(m.host.innerHTML).toContain('cell-alpha')
    expect(m.host.innerHTML).toContain('cell-beta')
    expect(m.host.innerHTML).toContain('id-1')
    expect(m.host.innerHTML).toContain('id-2')
  })

  it('renders 5 aria-hidden skeleton rows when loading', async () => {
    const m = await render(cardTemplate(), DataTableCard as Type<unknown>, {
      rows,
      rowKey,
      loading: true,
    })
    expect(m.host.innerHTML.split('aria-hidden="true"').length - 1).toBe(5)
    expect(m.host.innerHTML).not.toContain('cell-alpha')
  })

  it('renders the emptyMessage in a single spanning cell when rows is empty', async () => {
    const m = await render(
      cardTemplate('<span slot="emptyMessage" data-empty>Nothing here</span>'),
      DataTableCard as Type<unknown>,
      { rows: [], rowKey },
    )
    expect(m.host.innerHTML).toContain('data-empty=""')
    expect(m.host.innerHTML).toContain('Nothing here')
    expect(m.host.innerHTML).toContain('colspan="2"')
  })

  it('marks rows clickable only when onRowClick is supplied', async () => {
    const clickable = await render(cardTemplate(), DataTableCard as Type<unknown>, {
      rows,
      rowKey,
      onRowClick: () => {},
    })
    expect(clickable.host.innerHTML).toContain('cursorPointer')
    const plain = await render(cardTemplate(), DataTableCard as Type<unknown>, { rows, rowKey })
    expect(plain.host.innerHTML).not.toContain('cursorPointer')
  })

  it('sets data-mol-id and forwards className on the outer section', async () => {
    const m = await render(cardTemplate(), DataTableCard as Type<unknown>, {
      rows,
      rowKey,
      dataMolId: 'tbl-x',
      className: 'card-cls',
    })
    expect(m.host.innerHTML).toContain('data-mol-id="tbl-x"')
    expect(m.host.innerHTML).toContain('card-cls')
  })
})

describe('RowWithActions', () => {
  it('renders the supplied row cells', async () => {
    const m = await render(rowTemplate(), RowWithActions as Type<unknown>)
    expect(m.host.innerHTML).toContain('data-cell=""')
  })

  it('renders a trailing actions cell when actions is supplied', async () => {
    const m = await render(
      rowTemplate(undefined, '<button slot="actions" data-act></button>'),
      RowWithActions as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-act=""')
  })

  it('omits the actions cell when actions is not supplied', async () => {
    const m = await render(rowTemplate(), RowWithActions as Type<unknown>)
    expect(m.host.innerHTML).not.toContain('data-act')
  })

  it('sets aria-selected when selected is true', async () => {
    const m = await render(rowTemplate(), RowWithActions as Type<unknown>, { selected: true })
    expect(m.host.innerHTML).toContain('aria-selected="true"')
  })

  it('marks the row clickable only when onClick is supplied', async () => {
    const clickable = await render(rowTemplate(), RowWithActions as Type<unknown>, {
      onClick: () => {},
    })
    expect(clickable.host.innerHTML).toContain('cursorPointer')
    const plain = await render(rowTemplate(), RowWithActions as Type<unknown>)
    expect(plain.host.innerHTML).not.toContain('cursorPointer')
  })

  it('forwards className onto the <tr>', async () => {
    const m = await render(rowTemplate(), RowWithActions as Type<unknown>, {
      className: 'row-cls',
    })
    expect(m.host.innerHTML).toContain('row-cls')
  })
})

describe('TableEmpty', () => {
  it('renders its children', async () => {
    const m = await render(
      `<tr mol-table-empty [colSpan]="3"><span data-e>empty</span></tr>`,
      TableEmpty as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-e=""')
    expect(m.host.innerHTML).toContain('empty')
  })

  it('applies the given colSpan to the cell', async () => {
    const m = await render(
      `<tr mol-table-empty [colSpan]="p['colSpan']"></tr>`,
      TableEmpty as Type<unknown>,
      { colSpan: 4 },
    )
    expect(m.host.innerHTML).toContain('colspan="4"')
  })

  it('forwards className onto the cell', async () => {
    const m = await render(
      `<tr mol-table-empty [colSpan]="2" [className]="p['className']"></tr>`,
      TableEmpty as Type<unknown>,
      { className: 'empty-cls' },
    )
    expect(m.host.innerHTML).toContain('empty-cls')
  })
})

describe('TableFooter', () => {
  it('renders the left and right slots', async () => {
    const m = await render(
      `<div mol-table-footer><span slot="left" data-left></span><span slot="right" data-right></span></div>`,
      TableFooter as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-left=""')
    expect(m.host.innerHTML).toContain('data-right=""')
  })

  it('forwards className', async () => {
    const m = await render(
      `<div mol-table-footer [className]="p['className']"></div>`,
      TableFooter as Type<unknown>,
      { className: 'foot-cls' },
    )
    expect(m.host.innerHTML).toContain('foot-cls')
  })
})

describe('TableToolbar', () => {
  it('renders the left, right, and below slots', async () => {
    const m = await render(
      `<div mol-table-toolbar><span slot="left" data-left></span><span slot="right" data-right></span><div slot="below" data-below></div></div>`,
      TableToolbar as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-left=""')
    expect(m.host.innerHTML).toContain('data-right=""')
    expect(m.host.innerHTML).toContain('data-below=""')
  })

  it('forwards className', async () => {
    const m = await render(
      `<div mol-table-toolbar [className]="p['className']"></div>`,
      TableToolbar as Type<unknown>,
      { className: 'tb-cls' },
    )
    expect(m.host.innerHTML).toContain('tb-cls')
  })
})
