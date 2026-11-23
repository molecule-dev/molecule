// @vitest-environment jsdom
/**
 * The loaded-data region of `QueryContent` in real Angular pages — the
 * counterpart of `query-react`'s query-content.test: status content never
 * mounts a record's actions, cached data stays mounted through a failed
 * refresh, and a completed null is missing rather than pending.
 *
 * @module
 */
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type OnInit,
  signal,
  type Type,
} from '@angular/core'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent, useQuery } from '../index.js'
import { type ComponentMount, drain, hostOf, mountComponent } from './harness.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())

/**
 * An edit form's own state: it starts from the record it mounted with and only
 * its own Edit click changes the draft, the way the React package's form does.
 */
class ScheduleFormComponent implements OnInit {
  title = ''
  readonly draft = signal('')
  ngOnInit(): void {
    this.draft.set(this.title)
  }
  edit(): void {
    this.draft.set('Unsaved')
  }
}
const ScheduleForm = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-schedule-form',
  standalone: true,
  inputs: ['title'],
  template: `
    <form>
      <input [value]="draft()" readonly />
      <button type="button" (click)="edit()">Edit</button>
    </form>
  `,
})(ScheduleFormComponent)

const mounts: ComponentMount<object>[] = []
const mounted = async <M extends object>(view: Promise<ComponentMount<M>>) => {
  const result = await view
  mounts.push(result as ComponentMount<object>)
  return result
}
afterEach(async () => {
  for (const view of mounts.splice(0)) await view.destroy()
})

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await drain()
}

/** Host selectors minted so far (each page defines its own component). */
let pageCount = 0

/**
 * Builds a standalone page component.
 *
 * @param template - The page's template.
 * @param body - The class the template binds.
 * @param imports - Extra standalone components the template uses.
 * @returns The component type.
 */
function page(
  template: string,
  body: new () => object,
  imports: Type<unknown>[] = [],
): Type<object> {
  return Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-page-${++pageCount}`,
    standalone: true,
    imports: [QueryContent, ...imports],
    template,
  })(body) as Type<object>
}

it('keeps loading status outside a list: the first item is always real data', async () => {
  let resolve!: (value: string[]) => void
  const request = new Promise<string[]>((r) => {
    resolve = r
  })
  const selected = vi.fn()
  const Sidebar = page(
    `<mol-query-content [query]="query" [children]="content" [pending]="pending"></mol-query-content>
    <ng-template #pending><p role="status">Loading…</p></ng-template>
    <ng-template #content let-items>
      <ul>
        @for (item of items; track item) {
          <li><button [attr.data-category-pill]="item" (click)="selected(item)">{{ item }}</button></li>
        }
      </ul>
    </ng-template>`,
    class SidebarPage {
      readonly selected = selected
      readonly query = useQuery({ key: ['categories'], fetch: async () => request })
    },
  )
  const view = await mounted(mountComponent<{ selected: unknown }>(Sidebar))
  expect(view.host.querySelector('ul, [data-category-pill]')).toBeNull()
  expect(view.host.querySelector('[role="status"]')?.textContent).toBe('Loading…')
  resolve(['Books'])
  await view.settle()
  view.host.querySelector<HTMLButtonElement>('ul > li:first-child button')!.click()
  expect(selected).toHaveBeenCalledExactlyOnceWith('Books')
})

it('does not expose a follow-like toggle before its target exists; the first click saves once', async () => {
  type Repository = { id: string; watched: boolean }
  let resolve!: (value: Repository) => void
  const request = new Promise<Repository>((r) => {
    resolve = r
  })
  const commit = vi.fn()
  const RepositoryPage = page(
    `<mol-query-content [query]="query" [children]="content"></mol-query-content>
    <ng-template #content let-repository>
      <button (click)="commit(repository.id, !repository.watched)">
        {{ repository.watched ? 'Unwatch' : 'Watch' }}
      </button>
    </ng-template>`,
    class FollowPage {
      readonly commit = commit
      readonly query = useQuery({ key: ['repository', 'a'], fetch: async () => request })
    },
  )
  const view = await mounted(mountComponent<object>(RepositoryPage))
  expect(view.host.querySelector('button')).toBeNull()
  resolve({ id: 'a', watched: false })
  await view.settle()
  view.host.querySelector('button')!.click()
  expect(commit).toHaveBeenCalledExactlyOnceWith('a', true)
})

it('drops old record actions immediately when a new key has no data', async () => {
  getQueryClient().set(['repository', 'a'], { id: 'a' })
  const Page = page(
    `<mol-query-content [query]="query" [children]="content"></mol-query-content>
    <ng-template #content let-record><button data-record>{{ record.id }}</button></ng-template>`,
    class RecordPage {
      readonly id = signal('a')
      readonly query = useQuery(
        computed(() => ({
          key: ['repository', this.id()],
          fetch: async () => new Promise<{ id: string }>(() => {}),
        })),
      )
    },
  )
  const view = await mounted(mountComponent<{ id: ReturnType<typeof signal<string>> }>(Page))
  expect(view.host.textContent).toBe('a')
  view.component.id.set('b')
  // The change-detection pass that follows the state change: the loaded region
  // must drop the old record before the new key has any data.
  view.tick()
  expect(view.host.querySelector('button')).toBeNull()
  await flush()
})

it('counterexample: cached data stays actionable through a pending and failed refresh', async () => {
  const client = getQueryClient()
  client.set(['book'], { id: 'one' })
  client.invalidate(['book'])
  let reject!: (error: Error) => void
  const request = new Promise<{ id: string }>((_, r) => {
    reject = r
  })
  const error = vi.fn(() => 'Failed')
  const Page = page(
    `<mol-query-content [query]="query" [error]="failed" [children]="content"></mol-query-content>
    <ng-template #failed let-failure><p role="alert">{{ error(failure) }}</p></ng-template>
    <ng-template #content let-book><button>{{ book.id }}</button></ng-template>`,
    class BookPage {
      readonly error = error
      readonly query = useQuery({ key: ['book'], fetch: async () => request })
    },
  )
  const view = await mounted(mountComponent<object>(Page))
  expect(view.host.querySelector('button')?.textContent).toBe('one')
  reject(new Error('Offline'))
  await flush()
  await view.settle()
  expect(view.host.querySelector('button')?.textContent).toBe('one')
  expect(error).not.toHaveBeenCalled()
})

it('an initial failure never mounts its resource actions and can recover on retry', async () => {
  let fail = true
  const Page = page(
    `<mol-query-content [query]="query" [error]="failed" [children]="content"></mol-query-content>
    <ng-template #failed><p role="alert">Failed</p></ng-template>
    <ng-template #content let-book><button>{{ book.id }}</button></ng-template>`,
    class RetryPage {
      readonly query = useQuery({
        key: ['book'],
        fetch: async () => {
          if (fail) throw Error('Offline')
          return { id: 'one' }
        },
      })
    },
  )
  const view = await mounted(mountComponent<{ query: { refetch: () => Promise<unknown> } }>(Page))
  await view.settle()
  expect(view.host.querySelector('button')).toBeNull()
  expect(view.host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
  fail = false
  await view.component.query.refetch()
  await view.settle()
  expect(view.host.querySelector('button')?.textContent).toBe('one')
})

// Each case is wrapped: it.each spreads an array case into arguments, so a bare
// `[]` would pass no argument and test `undefined` instead of an empty array.
it.each([[false], [0], [''], [[]]])(
  'counterexample: valid empty or false data reaches the loaded branch (%j)',
  async (data) => {
    const render = vi.fn(() => 'Ready')
    const Host = hostOf(
      `<mol-query-content [query]="model.query" [children]="content"></mol-query-content>
      <ng-template #content let-value>{{ model.render(value) }}</ng-template>`,
      { query: { data, status: 'success', error: undefined }, render },
      [QueryContent],
    )
    const view = await mounted(mountComponent<object>(Host))
    expect(render).toHaveBeenCalledWith(data)
    expect(view.host.textContent).toBe('Ready')
  },
)

it('follows a replaced query prop when the new observer answers', async () => {
  const first = new Promise<{ id: string }>(() => {})
  let resolveSecond!: (value: { id: string }) => void
  const second = new Promise<{ id: string }>((resolve) => {
    resolveSecond = resolve
  })
  const Page = page(
    `<button data-flip (click)="showSecond.set(true)">flip</button>
    <mol-query-content [query]="showSecond() ? other : query" [children]="content"></mol-query-content>
    <ng-template #content let-record><button data-record>{{ record.id }}</button></ng-template>`,
    class ReplacedQueryPage {
      readonly showSecond = signal(false)
      readonly query = useQuery({ key: ['replaced', 'first'], fetch: async () => first })
      readonly other = useQuery({ key: ['replaced', 'second'], fetch: async () => second })
    },
  )
  const view = await mounted(
    mountComponent<{ showSecond: ReturnType<typeof signal<boolean>> }>(Page),
  )
  expect(view.host.querySelector('button[data-record]')).toBeNull()
  view.host.querySelector<HTMLButtonElement>('button[data-flip]')!.click()
  await view.settle()
  resolveSecond({ id: 'second' })
  await flush()
  await view.settle()
  // The new observer's answer arrives without the parent changing again: the
  // region must still re-render, the way React re-renders it through the prop.
  expect(view.host.querySelector('button[data-record]')?.textContent).toBe('second')
})

it('a loaded null is missing rather than pending or actionable', async () => {
  const render = vi.fn(() => 'Act')
  const Host = hostOf(
    `<mol-query-content [query]="model.query" [children]="content" [missing]="missing"></mol-query-content>
    <ng-template #content let-record>{{ model.render(record) }}</ng-template>
    <ng-template #missing><p>Not found</p></ng-template>`,
    { query: { data: null, status: 'success', error: undefined }, render },
    [QueryContent],
  )
  const view = await mounted(mountComponent<object>(Host))
  expect(render).not.toHaveBeenCalled()
  expect(view.host.textContent).toBe('Not found')
})

it('mounts the form with loaded values and resets it when an already cached record opens', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'b'], { title: 'Thursday' })
  let resolve!: (value: { title: string }) => void
  const request = new Promise<{ title: string }>((done) => {
    resolve = done
  })
  const Page = page(
    `<mol-query-content [query]="query" [recordKey]="id()" [pending]="pending" [children]="content"></mol-query-content>
    <ng-template #pending><p role="status">Loading schedule</p></ng-template>
    <ng-template #content let-record>
      <mol-schedule-form [title]="record.title"></mol-schedule-form>
    </ng-template>`,
    class SchedulePage {
      readonly id = signal('a')
      readonly query = useQuery(
        computed(() => ({
          key: ['schedule', this.id()],
          fetch: async () => request,
        })),
      )
    },
    [ScheduleForm],
  )
  const view = await mounted(mountComponent<{ id: ReturnType<typeof signal<string>> }>(Page))
  expect(view.host.querySelector('form')).toBeNull()
  resolve({ title: 'Tuesday' })
  await flush()
  await view.settle()
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  view.host.querySelector<HTMLButtonElement>('button')!.click()
  view.tick()
  client.set(['schedule', 'a'], { title: 'Tuesday, revised' })
  await flush()
  view.tick()
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  view.component.id.set('b')
  view.tick()
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
})

it('keeps a previous query key out of the form until the new record arrives', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'a'], { title: 'Tuesday' })
  let resolve!: (value: { title: string }) => void
  const request = new Promise<{ title: string }>((done) => {
    resolve = done
  })
  const Page = page(
    `<mol-query-content [query]="query" [recordKey]="id()" [pending]="pending" [children]="content"></mol-query-content>
    <ng-template #pending><p role="status">Loading schedule</p></ng-template>
    <ng-template #content let-record>
      <mol-schedule-form [title]="record.title"></mol-schedule-form>
    </ng-template>`,
    class LoadingSchedulePage {
      readonly id = signal('a')
      readonly query = useQuery(
        computed(() => ({
          key: ['schedule', this.id()],
          fetch: async () => request,
          keepPreviousData: true,
          principal: 'public',
        })),
      )
    },
    [ScheduleForm],
  )
  const view = await mounted(mountComponent<{ id: ReturnType<typeof signal<string>> }>(Page))
  await view.settle()
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  view.component.id.set('b')
  view.tick()
  expect(view.host.querySelector('form')).toBeNull()
  expect(view.host.querySelector('[role="status"]')?.textContent).toBe('Loading schedule')
  resolve({ title: 'Thursday' })
  await flush()
  await view.settle()
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
})

it('counterexample: a form with static initial values retains its draft on rerender', async () => {
  const count = signal(0)
  const Host = hostOf(
    `<button type="button" data-rerender (click)="model.count.set(model.count() + 1)">rerender</button>
    <mol-schedule-form title="New schedule"></mol-schedule-form>
    <p data-count>{{ model.count() }}</p>`,
    { count },
    [ScheduleForm],
  )
  const view = await mounted(mountComponent<object>(Host))
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('New schedule')
  view.host.querySelector<HTMLButtonElement>('form button')!.click()
  view.tick()
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  view.host.querySelector<HTMLButtonElement>('button[data-rerender]')!.click()
  view.tick()
  expect(view.host.querySelector('[data-count]')?.textContent).toBe('1')
  expect(view.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
})

it("renders React's elements with no host or capture element of its own", async () => {
  // The query state the headless component reads: pending first, then loaded,
  // so the same mount switches from the pending template to the children one.
  // A signal marks the host for check, the way React's parent re-render does.
  const query = signal<{ data: unknown; status: string; error: undefined }>({
    data: undefined,
    status: 'pending',
    error: undefined,
  })
  const Host = hostOf(
    `<i>a</i><mol-query-content [query]="model.query()" [children]="content" [pending]="pending"></mol-query-content><i>b</i>
    <ng-template #pending><p role="status">Loading…</p></ng-template>
    <ng-template #content let-record><article data-content>{{ record }}</article></ng-template>`,
    { query },
    [QueryContent],
  )
  const view = await mounted(mountComponent<object>(Host))
  const children = (): string[] =>
    Array.from(view.host.children).map((child) => child.tagName.toLowerCase())
  expect(children()).toEqual(['i', 'p', 'i'])
  query.set({ data: 'loaded', status: 'success', error: undefined })
  await view.settle()
  expect(children()).toEqual(['i', 'article', 'i'])
})
