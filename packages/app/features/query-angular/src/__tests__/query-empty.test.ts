// @vitest-environment jsdom
import '@angular/compiler'
import { computed, signal } from '@angular/core'
import { afterEach, expect, it, vi } from 'vitest'

import { QueryContent } from '../index.js'
import { type ComponentMount, hostOf, mountComponent } from './harness.js'
const mounts: ComponentMount<object>[] = []
const mounted = async <M extends object>(view: Promise<ComponentMount<M>>) => {
  const result = await view
  mounts.push(result as ComponentMount<object>)
  return result
}
afterEach(async () => {
  for (const view of mounts.splice(0)) await view.destroy()
})
it('selects one view-specific empty state and switches to populated content', async () => {
  const render = vi.fn((rows: string[]) => rows.join(', '))
  const rows = signal<string[]>([])
  const model = {
    query: computed(() => ({ data: rows(), status: 'success' as const, error: undefined })),
    when: (rows: string[]) => rows.length === 0,
    render,
  }
  const Host = hostOf(
    `<mol-query-content [query]="model.query()" [children]="content" [empty]="{when: model.when, render: empty}"></mol-query-content>
    <ng-template #content let-rows>{{ model.render(rows) }}</ng-template>
    <ng-template #empty><p class="empty"><a href="/inventory">Clear filters</a></p></ng-template>`,
    model,
    [QueryContent],
  )
  const view = await mounted(mountComponent<object>(Host))
  expect(view.host.querySelectorAll('.empty')).toHaveLength(1)
  expect(view.host.textContent).toBe('Clear filters')
  expect(render).not.toHaveBeenCalled()
  rows.set(['Bolt'])
  await view.settle()
  expect(view.host.querySelector('.empty')).toBeNull()
  expect(view.host.textContent).toBe('Bolt')
})

const viewStates = [
  {
    name: 'previous empty page while the next view loads',
    data: { rows: [] },
    status: 'loading',
    isPreviousData: true,
    expected: 'Loading',
  },
  {
    name: 'previous missing record while the next view loads',
    data: null,
    status: 'loading',
    isPreviousData: true,
    expected: 'Loading',
  },
  {
    name: 'previous empty page after a failed next read',
    data: { rows: [] },
    status: 'error',
    isPreviousData: true,
    expected: 'Failed',
  },
  {
    name: 'populated previous page stays visible',
    data: { rows: ['Bolt'] },
    status: 'loading',
    isPreviousData: true,
    expected: 'Bolt',
  },
  {
    name: 'current empty page may offer its action during refresh',
    data: { rows: [] },
    status: 'loading',
    isPreviousData: false,
    expected: 'Add item',
  },
  {
    name: 'current empty page stays visible after a failed refresh',
    data: { rows: [] },
    status: 'error',
    isPreviousData: false,
    expected: 'Add item',
  },
  {
    name: 'current successful empty page may offer its action',
    data: { rows: [] },
    status: 'success',
    isPreviousData: false,
    expected: 'Add item',
  },
] as const

it.each(viewStates)('renders the current view rather than $name', async (state) => {
  const model = {
    query: { ...state, error: new Error('Offline') },
    when: (page: { rows: string[] }) => page.rows.length === 0,
  }
  const Host = hostOf(
    `<mol-query-content [query]="model.query" [children]="content" [empty]="{when: model.when, render: empty}"
      [pending]="pending" [missing]="missing" [error]="error"></mol-query-content>
    <ng-template #content let-page>{{ page.rows.join(', ') }}</ng-template>
    <ng-template #empty><a href="/inventory/new">Add item</a></ng-template>
    <ng-template #pending>Loading</ng-template>
    <ng-template #missing>Missing</ng-template>
    <ng-template #error>Failed</ng-template>`,
    model,
    [QueryContent],
  )
  const view = await mounted(mountComponent<object>(Host))
  expect(view.host.textContent).toBe(state.expected)
  expect(view.host.querySelectorAll('a')).toHaveLength(state.expected === 'Add item' ? 1 : 0)
})
