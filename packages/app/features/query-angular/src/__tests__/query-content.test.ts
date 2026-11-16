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
import { Component, computed, signal, type Type } from '@angular/core'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent, useQuery } from '../index.js'
import { type ComponentMount, drain, hostOf, mountComponent } from './harness.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())

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
 * @returns The component type.
 */
function page(template: string, body: new () => object): Type<object> {
  return Component({
    selector: `mol-page-${++pageCount}`,
    standalone: true,
    imports: [QueryContent],
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
