// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/record-content.test.tsx`: a record action
 * waits for a nonempty identity, the mounted record is scoped to its ID and
 * viewer, and read-only data needs no identity.
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

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../index.js'
import { type ComponentMount, drain, mountComponent } from './harness.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())

interface Notebook {
  id?: string
  pinned: boolean
}

/** The mounted pages, destroyed after every test. */
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

/** The record action's own state: a click pins the record it is mounted for. */
class PinnedButtonComponent implements OnInit {
  id = 0
  readonly pinned = signal(false)
  ngOnInit(): void {}
  pin(): void {
    this.pinned.set(true)
  }
}
const PinnedButton = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-pinned-button',
  standalone: true,
  inputs: ['id'],
  template: `<button type="button" (click)="pin()">{{ id }}: {{ pinned() }}</button>`,
})(PinnedButtonComponent)

it('withholds a record action until a nonempty ID exists, then passes that ID to the action', async () => {
  const post = vi.fn()
  const pin = (id: string): void => {
    post(`/notebooks/${encodeURIComponent(id)}/pin`)
  }
  const RecordAction = page(
    `<mol-query-content [query]="query()" [getRecordId]="getRecordId" [pending]="pending" [children]="content"></mol-query-content>
    <ng-template #pending><p role="status">Loading notebook</p></ng-template>
    <ng-template #content let-notebook let-id="a1">
      <button type="button" (click)="pin(id)">Pin notebook</button>
    </ng-template>`,
    class RecordActionPage {
      readonly state = signal<{
        data: Notebook | undefined
        status: 'loading' | 'success'
      }>({ data: undefined, status: 'loading' })
      readonly query = computed(() => ({
        data: this.state().data,
        status: this.state().status,
        error: undefined,
      }))
      readonly getRecordId = (notebook: Notebook): string | undefined => notebook.id
      readonly pin = pin
    },
  )
  const view = await mounted(
    mountComponent<{ state: ReturnType<typeof signal<unknown>> }>(RecordAction),
  )
  expect(view.host.querySelector('button')).toBeNull()
  for (const id of [undefined, '']) {
    view.component.state.set({ data: { id, pinned: false }, status: 'success' })
    view.tick()
    await flush()
    view.host.querySelector<HTMLButtonElement>('button')?.click()
    expect(post).not.toHaveBeenCalled()
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe('Loading notebook')
  }
  view.component.state.set({ data: { id: 'team/sprint 1', pinned: false }, status: 'success' })
  view.tick()
  await flush()
  view.host.querySelector<HTMLButtonElement>('button')!.click()
  expect(post).toHaveBeenCalledExactlyOnceWith('/notebooks/team%2Fsprint%201/pin')
})

it('keeps the same record mounted on refresh and scopes mounted state by viewer and record', async () => {
  const ScopedRecord = page(
    `<mol-query-content [query]="query()" [getRecordId]="getRecordId" [recordKey]="viewer()" [children]="content"></mol-query-content>
    <ng-template #content let-notebook let-id="a1">
      <mol-pinned-button [id]="id"></mol-pinned-button>
    </ng-template>`,
    class ScopedRecordPage {
      readonly viewer = signal<PropertyKey>('team-a')
      readonly recordId = signal(0)
      readonly isPreviousData = signal(false)
      readonly query = computed(() => ({
        data: { id: this.recordId() },
        status: 'success' as const,
        error: undefined,
        isPreviousData: this.isPreviousData(),
      }))
      readonly getRecordId = (notebook: { id: number }): number => notebook.id
    },
    [PinnedButton],
  )
  const view = await mounted(
    mountComponent<{
      viewer: ReturnType<typeof signal<PropertyKey>>
      recordId: ReturnType<typeof signal<number>>
      isPreviousData: ReturnType<typeof signal<boolean>>
    }>(ScopedRecord),
  )
  const first = view.host.querySelector('button')!
  expect(first.textContent).toBe('0: false')
  first.click()
  view.tick()
  expect(first.textContent).toBe('0: true')
  view.component.viewer.set('team-a')
  view.tick()
  expect(view.host.querySelector('button')).toBe(first)
  expect(first.textContent).toBe('0: true')
  view.component.viewer.set('team-b')
  view.tick()
  expect(view.host.querySelector('button')?.textContent).toBe('0: false')
  view.host.querySelector<HTMLButtonElement>('button')!.click()
  view.tick()
  expect(view.host.querySelector('button')?.textContent).toBe('0: true')
  view.component.recordId.set(1)
  view.tick()
  expect(view.host.querySelector('button')?.textContent).toBe('1: false')
  view.component.isPreviousData.set(true)
  view.tick()
  expect(view.host.querySelector('button')).toBeNull()
})

it('leaves read-only data without an identity renderable', async () => {
  const ReadOnly = page(
    `<mol-query-content [query]="query" [children]="content"></mol-query-content>
    <ng-template #content let-title><p>{{ title }}</p></ng-template>`,
    class ReadOnlyPage {
      readonly query = { data: 'Unsaved note', status: 'success' as const, error: undefined }
    },
  )
  const view = await mounted(mountComponent<object>(ReadOnly))
  expect(view.host.textContent).toBe('Unsaved note')
})
