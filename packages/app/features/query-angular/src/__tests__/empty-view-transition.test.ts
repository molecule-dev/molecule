// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent, useQuery } from '../index.js'
import { type ComponentMount, mountComponent } from './harness.js'

type Page = { rows: string[] }

const pages: ComponentMount<object>[] = []

beforeEach(() => {
  resetQueryClient()
  setProvider(provider)
})
afterEach(async () => {
  for (const page of pages.splice(0)) await page.destroy()
})

it.each(['populated', 'empty', 'error'] as const)(
  'does not advertise a previous empty collection while the new view is pending (%s)',
  async (outcome) => {
    // An empty archived view is seeded; switching to another view must not show its
    // empty-state action while the new view is still loading.
    getQueryClient().set(['inventory', 'archived'], { rows: [] })
    let resolve!: (value: Page) => void
    let reject!: (error: Error) => void
    const request = new Promise<Page>((yes, no) => {
      resolve = yes
      reject = no
    })
    const Inventory = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-parity-inventory-pending',
      standalone: true,
      imports: [QueryContent],
      template: `
        <main>
          <nav><a href="/inventory/new">New item</a></nav>
          <mol-query-content
            [query]="query"
            [pending]="pending"
            [error]="error"
            [empty]="{when: when, render: empty}"
            [children]="content"
          ></mol-query-content>
        </main>
        <ng-template #pending><p role="status">Loading</p></ng-template>
        <ng-template #error><p role="alert">Failed</p></ng-template>
        <ng-template #empty><section><a href="/inventory/new">Add item</a></section></ng-template>
        <ng-template #content let-page>
          <ul>
            @for (row of page.rows; track row) {
              <li>{{ row }}</li>
            }
          </ul>
        </ng-template>
      `,
    })(
      class InventoryPage {
        readonly view = signal<'archived' | 'active'>('archived')
        readonly query = useQuery<Page>(
          computed(() => ({
            key: ['inventory', this.view()] as const,
            principal: 'operator-1',
            keepPreviousData: true,
            fetch: async () => request,
          })),
        )
        readonly when = (page: Page): boolean => page.rows.length === 0
      },
    ) as Type<object>
    const view = await mountComponent<{ view: WritableSignal<'archived' | 'active'> }>(Inventory)
    pages.push(view)
    // A genuinely empty collection can have the same destination as its navbar.
    expect(view.host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(2)
    view.component.view.set('active')
    await view.settle()
    expect(view.host.querySelector('section')).toBeNull()
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe('Loading')
    expect(view.host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(1)
    if (outcome === 'error') reject(new Error('Offline'))
    else resolve({ rows: outcome === 'empty' ? [] : ['Bolt'] })
    await view.settle()
    expect(view.host.querySelector('[role="status"]')).toBeNull()
    if (outcome === 'error')
      expect(view.host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
    else if (outcome === 'empty')
      expect(view.host.querySelector('section')?.textContent).toBe('Add item')
    else expect(view.host.querySelector('li')?.textContent).toBe('Bolt')
  },
)

it('waits for the initial collection before offering an empty-state action', async () => {
  let resolve!: (value: Page) => void
  const request = new Promise<Page>((yes) => {
    resolve = yes
  })
  const Inventory = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-parity-inventory',
    standalone: true,
    imports: [QueryContent],
    template: `
      <mol-query-content
        [query]="query"
        [pending]="pending"
        [empty]="{when: when, render: empty}"
        [children]="content"
      ></mol-query-content>
      <ng-template #pending><p>Loading</p></ng-template>
      <ng-template #empty><a href="/inventory/new">Add item</a></ng-template>
      <ng-template #content let-page><p>{{ page.rows.join(', ') }}</p></ng-template>
    `,
  })(
    class InventoryPage {
      readonly query = useQuery<Page>({ key: ['inventory'], fetch: async () => request })
      readonly when = (page: Page): boolean => page.rows.length === 0
    },
  ) as Type<object>
  const view = await mountComponent(Inventory)
  pages.push(view)
  expect(view.host.textContent).toBe('Loading')
  expect(view.host.querySelector('a')).toBeNull()
  resolve({ rows: ['Bolt'] })
  await view.settle()
  expect(view.host.textContent).toBe('Bolt')
  expect(view.host.querySelector('a')).toBeNull()
})
