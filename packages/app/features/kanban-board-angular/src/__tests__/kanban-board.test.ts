// @vitest-environment jsdom
/**
 * Unit tests of the Angular Kanban primitives — the port of
 * `@molecule/app-kanban-board-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React tests use.
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

const { KanbanBoard } = await import('../kanban-board.component.js')
const { KanbanCard } = await import('../kanban-card.component.js')
const { KanbanColumn } = await import('../kanban-column.component.js')
const { KanbanColumnHeader } = await import('../kanban-column-header.component.js')
import type { KanbanCardData, KanbanColumnData } from '../types.js'

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written the way
 * an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @param methods - Extra methods the template calls (e.g. a call recorder).
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
  methods: Record<string, (...args: never[]) => unknown> = {},
): Promise<Mounted> {
  class SpecHost {
    /** The props the template binds. */
    p: Record<string, unknown> = props
  }
  Object.assign(SpecHost.prototype, methods)
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(SpecHost)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<SpecHost> = createComponent(Host, {
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

const mounted: Mounted[] = []

/**
 * Mounts a component with the given host template and props.
 *
 * @param template - The host template.
 * @param component - The component class.
 * @param props - The props object.
 * @param methods - Extra host methods.
 * @returns The mounted host.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
  methods: Record<string, (...args: never[]) => unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props, methods)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * One card.
 *
 * @param id - Card id.
 * @param over - Extra fields.
 * @returns The card data.
 */
const card = (id: string, over: Partial<KanbanCardData> = {}): KanbanCardData => ({
  id,
  title: `title-${id}`,
  ...over,
})

/**
 * One column.
 *
 * @param id - Column id.
 * @param cards - The column's cards.
 * @returns The column data.
 */
const column = (id: string, cards: KanbanCardData[] = []): KanbanColumnData => ({
  id,
  title: `col-${id}`,
  cards,
})

describe('KanbanColumnHeader', () => {
  const header = (props: Record<string, unknown>, inner = ''): Promise<Mounted> =>
    render(
      `<header mol-kanban-column-header [title]="p['title']" [count]="p['count']" [className]="p['className']">${inner}</header>`,
      KanbanColumnHeader as Type<unknown>,
      props,
    )

  it('renders the title', async () => {
    const m = await header({ title: 'To do' })
    expect(m.host.innerHTML).toContain('To do')
  })

  it('renders the count in parentheses when count is a number, including 0', async () => {
    expect((await header({ title: 'T', count: 5 })).host.innerHTML).toContain('(5)')
    expect((await header({ title: 'T', count: 0 })).host.innerHTML).toContain('(0)')
  })

  it('omits the count when count is undefined', async () => {
    const m = await header({ title: 'T' })
    expect(m.host.innerHTML).not.toContain('(')
  })

  it('renders the actions slot', async () => {
    const m = await header({ title: 'T' }, '<button slot="actions" data-act></button>')
    expect(m.host.innerHTML).toContain('data-act')
  })

  it('forwards className', async () => {
    const m = await header({ title: 'T', className: 'hdr-cls' })
    expect(m.host.innerHTML).toContain('hdr-cls')
  })
})

describe('KanbanCard', () => {
  const kanbanCard = (props: Record<string, unknown>): Promise<Mounted> =>
    render(
      `<div mol-kanban-card [card]="p['card']" [onClick]="p['onClick']" [onDragStart]="p['onDragStart']" [className]="p['className']"></div>`,
      KanbanCard as Type<unknown>,
      props,
    )

  it('renders the card title', async () => {
    const m = await kanbanCard({ card: card('a') })
    expect(m.host.innerHTML).toContain('title-a')
  })

  it('renders the body when present and omits it otherwise', async () => {
    expect((await kanbanCard({ card: card('a', { body: 'body-a' }) })).host.innerHTML).toContain(
      'body-a',
    )
    expect((await kanbanCard({ card: card('a') })).host.innerHTML).not.toContain('body-')
  })

  it('renders the footer when present and omits it otherwise', async () => {
    const withFooter = await kanbanCard({ card: card('a', { footer: 'foot-a' }) })
    expect(withFooter.host.innerHTML).toContain('foot-a')
    expect((await kanbanCard({ card: card('a') })).host.innerHTML).not.toContain('foot-a')
  })

  it('wraps the card in a draggable <div> when onDragStart is supplied', async () => {
    const m = await kanbanCard({ card: card('a'), onDragStart: () => {} })
    expect(m.host.innerHTML).toContain('draggable="true"')
  })

  it('renders no draggable wrapper when onDragStart is absent', async () => {
    const m = await kanbanCard({ card: card('a') })
    expect(m.host.innerHTML).not.toContain('draggable')
  })

  it('forwards className onto the Card', async () => {
    const m = await kanbanCard({ card: card('a'), className: 'card-cls' })
    expect(m.host.innerHTML).toContain('card-cls')
  })
})

describe('KanbanColumn', () => {
  const kanbanColumn = (props: Record<string, unknown>, inner = ''): Promise<Mounted> =>
    render(
      `<section mol-kanban-column [column]="p['column']" [onCardClick]="p['onCardClick']" [onDrop]="p['onDrop']" [onCardDragStart]="p['onCardDragStart']" [className]="p['className']">${inner}</section>`,
      KanbanColumn as Type<unknown>,
      props,
    )

  it('renders the column title in its header', async () => {
    const m = await kanbanColumn({ column: column('x') })
    expect(m.host.innerHTML).toContain('col-x')
  })

  it('renders the card count derived from cards.length', async () => {
    const m = await kanbanColumn({ column: column('x', [card('a'), card('b')]) })
    expect(m.host.innerHTML).toContain('(2)')
  })

  it('renders one card per card in the column', async () => {
    const m = await kanbanColumn({ column: column('x', [card('a'), card('b')]) })
    expect(m.host.innerHTML).toContain('title-a')
    expect(m.host.innerHTML).toContain('title-b')
  })

  it('renders the headerActions slot', async () => {
    const m = await kanbanColumn(
      { column: column('x') },
      '<button slot="headerActions" data-act></button>',
    )
    expect(m.host.innerHTML).toContain('data-act')
  })

  it('renders the footer slot', async () => {
    const m = await kanbanColumn({ column: column('x') }, '<div slot="footer" data-footer></div>')
    expect(m.host.innerHTML).toContain('data-footer')
  })

  it('forwards className', async () => {
    const m = await kanbanColumn({ column: column('x'), className: 'col-cls' })
    expect(m.host.innerHTML).toContain('col-cls')
  })
})

describe('KanbanBoard', () => {
  const columns = [column('todo', [card('a')]), column('done', [card('b'), card('c')])]

  const board = (
    props: Record<string, unknown>,
    methods: Record<string, (...args: never[]) => unknown> = {},
  ): Promise<Mounted> =>
    render(
      `<div mol-kanban-board [columns]="p['columns']" [className]="p['className']" [renderHeaderActions]="hdr" [renderFooter]="ftr"></div>` +
        `<ng-template #hdr let-col="a0"><button [attr.data-hdr]="col.id"></button></ng-template>` +
        `<ng-template #ftr let-col="a0"><div [attr.data-foot]="col.id"></div></ng-template>`,
      KanbanBoard as Type<unknown>,
      props,
      methods,
    )

  it('renders one column per column with its title', async () => {
    const m = await board({ columns })
    expect(m.host.innerHTML).toContain('col-todo')
    expect(m.host.innerHTML).toContain('col-done')
  })

  it('renders the cards within their columns', async () => {
    const m = await board({ columns })
    expect(m.host.innerHTML).toContain('title-a')
    expect(m.host.innerHTML).toContain('title-b')
    expect(m.host.innerHTML).toContain('title-c')
  })

  it('invokes renderHeaderActions once per column', async () => {
    // Angular has no call to count: the template is instantiated once per
    // column, so one button carries each column's id exactly once.
    const m = await board({ columns })
    const headers = Array.from(m.host.querySelectorAll('[data-hdr]'))
    expect(headers.map((el) => el.getAttribute('data-hdr'))).toEqual(['todo', 'done'])
    expect(m.host.innerHTML).toContain('data-hdr="todo"')
    expect(m.host.innerHTML).toContain('data-hdr="done"')
  })

  it('invokes renderFooter once per column', async () => {
    // As above: one footer element per column, carrying that column's id.
    const m = await board({ columns })
    const footers = Array.from(m.host.querySelectorAll('[data-foot]'))
    expect(footers.map((el) => el.getAttribute('data-foot'))).toEqual(['todo', 'done'])
    expect(m.host.innerHTML).toContain('data-foot="todo"')
    expect(m.host.innerHTML).toContain('data-foot="done"')
  })

  it('forwards className onto the board wrapper', async () => {
    const m = await board({ columns, className: 'board-cls' })
    expect(m.host.innerHTML).toContain('board-cls')
  })
})
