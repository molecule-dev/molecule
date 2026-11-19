// @vitest-environment jsdom
/**
 * The React bond's `credential-consumption` titles, ported to Vue Router: the real Vue
 * Router over `createWebHistory()` (React's `BrowserRouter`) with the app mounted on it
 * and NO molecule provider. React's `navigate('?query')` resolves against the current
 * pathname; the molecule router takes a full path, so the port names the page it stays
 * on.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
 * Sets the address and its state, then mounts the app on it, as React's `begin()` and
 * `BrowserRouter` do.
 *
 * @param path - The address the app opens on.
 * @returns A promise settled after the mount's consumption navigation.
 */
const mount = async (path: string): Promise<void> => {
  view = await mountView(Probe, path, [{ path: '/:rest(.*)*', component: Probe }], {
    browser: true,
    state: { safe: 'state' },
  })
  await settle()
}

/**
 * Navigates through the molecule router, as React's `useNavigate()` navigates.
 *
 * @param path - The full path to navigate to.
 */
const navigate = async (path: string): Promise<void> => {
  await molecule.navigate(path)
  await settle()
}

/** Sets the address before the app opens, as React's `begin()` does. */
const begin = (
  path = '/reset-password?token=first-link-secret&safe=byte%20value#section',
): void => {
  window.history.replaceState({ safe: 'state' }, '', path)
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  view?.unmount()
  view = undefined
})

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', async () => {
    begin()
    await mount(window.location.pathname + window.location.search + window.location.hash)

    expect(consumed.value[0]).toBe('first-link-secret')
    expect(window.location.search).not.toContain('first-link-secret')
    expect(search()).toBe(window.location.search)
    expect(window.location.search).toContain('safe=byte+value')
    expect(window.location.hash).toBe('#section')
    expect(window.history.state.safe).toBe('state')
  })

  it('keeps the consumed credential through query-only navigation', async () => {
    begin()
    await mount(window.location.pathname + window.location.search + window.location.hash)

    await navigate('/reset-password?safe=2')

    expect(consumed.value[0]).toBe('first-link-secret')
    expect(search()).toBe('?safe=2')
    expect(window.location.search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    begin()
    await mount(window.location.pathname + window.location.search + window.location.hash)

    consumed.value[1]('pasted-token')
    await flush()
    await navigate('/reset-password?safe=2')
    expect(consumed.value[0]).toBe('pasted-token')

    await navigate('/reset-password?token=second-link-secret&safe=2')
    expect(consumed.value[0]).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    begin()
    await mount(window.location.pathname + window.location.search + window.location.hash)

    await navigate('/reset-password?token=second-link-secret&safe=2')

    expect(consumed.value[0]).toBe('second-link-secret')
    expect(window.location.search).not.toContain('second-link-secret')
    expect(search()).toBe(window.location.search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', async () => {
    begin('/search?safe=1#results')
    await mount(window.location.pathname + window.location.search + window.location.hash)

    expect(consumed.value[0]).toBe('')
    expect(search()).toBe('?safe=1')
    expect(window.location.search).toBe('?safe=1')
    expect(window.location.hash).toBe('#results')
    expect(window.history.state.safe).toBe('state')
  })
})
