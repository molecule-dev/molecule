// @vitest-environment jsdom
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, expect, it } from 'vitest'

import QueryContent from '../QueryContent.svelte'
const instances: (() => Promise<void>)[] = []
const containers: HTMLDivElement[] = []
afterEach(async () => {
  for (const dispose of instances.splice(0)) await dispose()
  for (const container of containers.splice(0)) container.remove()
})
it('selects a single view-specific empty branch rather than loaded content', () => {
  const seen: unknown[] = []
  const children: Snippet<[unknown]> = createRawSnippet((getData) => {
    seen.push(getData())
    return { render: () => '<p>No items yet</p>' }
  })
  const empty: Snippet<[unknown]> = createRawSnippet(() => ({
    render: () => '<p class="empty"><a href="/inventory">Clear filters</a></p>',
  }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: {
      query: { data: [], status: 'success', error: undefined },
      children,
      empty: { when: (data) => Array.isArray(data) && data.length === 0, render: empty },
    },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.querySelectorAll('.empty')).toHaveLength(1)
  expect(container.textContent).toBe('Clear filters')
  expect(seen).toEqual([])
})
