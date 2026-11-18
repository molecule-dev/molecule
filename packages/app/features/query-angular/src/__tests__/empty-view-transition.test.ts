// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import '@angular/compiler'
import { Component, type Type } from '@angular/core'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { resetQueryClient, setProvider } from '@molecule/app-query'
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

it('waits for the initial collection before offering an empty-state action', async () => {
  let resolve!: (value: Page) => void
  const request = new Promise<Page>((yes) => {
    resolve = yes
  })
  const Inventory = Component({
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
