// @vitest-environment jsdom
/**
 * The React bond's `credential-consumption-r9` title, ported to Vue Router. React runs it
 * under `StrictMode`; the port runs the same Back/Forward sequence on a normal Vue mount
 * over the native browser history and NO molecule provider.
 */
import { afterEach, expect, it } from 'vitest'
import { type ComputedRef, defineComponent, h, type VNode } from 'vue'

import type { Router } from '@molecule/app-routing'

import { useMoleculeRouter } from '../composables.js'
import { useConsumedSearchParam } from '../useConsumedSearchParam.js'
import { flush, type MountedView, mountView, settle } from './routing-harness.js'

let consumed!: ComputedRef<readonly [string, (value: string) => void]>
let molecule!: Router
let view: MountedView | undefined

const Probe = defineComponent({
  setup() {
    molecule = useMoleculeRouter().value
    consumed = useConsumedSearchParam('token')
    return (): VNode => h('output', molecule.getLocation().search)
  },
})

/** React's `useLocation().search`: the router's committed query string. */
const search = (): string => molecule.getLocation().search

/**
 * Waits until `condition` holds, letting jsdom's popstate task and the router settle.
 *
 * @param condition - What to wait for.
 */
const waitUntil = async (condition: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (condition()) return
    await flush()
  }
  throw new Error('the condition was not reached')
}

afterEach(() => {
  view?.unmount()
  view = undefined
})

it('associates consumed values with their cleaned entries through Back and Forward', async () => {
  window.history.replaceState({}, '', '/reset-password?token=token-A&link=A')
  view = await mountView(
    Probe,
    '/reset-password?token=token-A&link=A',
    [{ path: '/:rest(.*)*', component: Probe }],
    { browser: true },
  )
  await settle()
  expect(consumed.value[0]).toBe('token-A')

  await molecule.navigate('/reset-password?token=token-B&link=B')
  await settle()
  expect(consumed.value[0]).toBe('token-B')

  molecule.go(-1)
  await waitUntil(() => search() === '?link=A')
  expect(consumed.value[0]).toBe('token-A')

  molecule.go(1)
  await waitUntil(() => search() === '?link=B')
  expect(consumed.value[0]).toBe('token-B')
})
