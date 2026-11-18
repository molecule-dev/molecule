// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import EmptyView from './helpers/EmptyView.svelte'
import { deferred, settle } from './helpers/harness.js'

const containers: HTMLDivElement[] = []
const unmounters: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const unmounter of unmounters.splice(0)) await unmounter()
  for (const container of containers.splice(0)) container.remove()
})

beforeEach(() => {
  resetQueryClient()
  setProvider(provider)
})

it('waits for the initial collection before offering an empty-state action', async () => {
  const request = deferred<{ rows: string[] }>()
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(EmptyView, { target: container, props: { request: request.promise } })
  flushSync()
  unmounters.push(() => unmount(instance))
  expect(container.textContent).toBe('Loading')
  expect(container.querySelector('a')).toBeNull()
  request.resolve({ rows: ['Bolt'] })
  await settle()
  expect(container.textContent).toBe('Bolt')
  expect(container.querySelector('a')).toBeNull()
})
