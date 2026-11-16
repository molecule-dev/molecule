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
