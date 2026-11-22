/**
 * The React bond's `binding-router.test.tsx` titles, carried to the SvelteKit bond: the
 * provider gives `@molecule/app-svelte` its router. Each case runs in the test app
 * (`./kit-app`) over kit's real client router, with the bond's `MoleculeRouterProvider` in
 * its root layout. What each React-only phrase means here:
 *
 * - "where a layout route renders its page": kit gives a `+layout.svelte` its page as
 *   `children` (`kit-app/src/routes/nested`). The bond provides no routed view, so
 *   `RoutedView` throws and says so (the last case).
 * - "a provider inside another": a page that mounts the provider again over the root
 *   layout's navigation (`/probe/inner-provider`).
 * - React's re-render is an update of the page. Svelte calls a component's hooks once, so
 *   `useMoleculeRouter` returns the provider's own router.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getRouter, type RouteDefinition, setRouter } from '@molecule/app-routing'

import { resetBindingProbe } from './kit-app/src/lib/binding-probe.js'
import { clearProviderProbe, setProviderRoutes } from './kit-app/src/lib/probe.js'
import { clickLink, documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

const originalBond = getRouter()

let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  clearProviderProbe()
  setRouter(originalBond)
})

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
  setRouter(originalBond)
})

/**
 * Starts the test app at `path`.
 *
 * @param path - The in-app path the app opens on.
 * @returns The started app, once kit has rendered it.
 */
const open = async (path: string): Promise<StartedKit> => {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(path), container)
  await settle(kit.app)
  return kit
}

/**
 * Where the app renders.
 *
 * @returns The container.
 */
const host = (): HTMLElement => {
  if (!container) throw new Error('no started app')
  return container
}

/**
 * The text of the first element `selector` matches.
 *
 * @param selector - A CSS selector.
 * @returns Its text, or `undefined` when nothing matches.
 */
const text = (selector: string): string | undefined =>
  host().querySelector(selector)?.textContent ?? undefined

describe('MoleculeRouterProvider and the framework binding', () => {
  it('gives the framework binding the router it bonds', async () => {
    const probe = resetBindingProbe(true)
    const { app } = await open('/one')
    expect(probe.bindingRouters).toHaveLength(1)
    expect(probe.bindingRouters[0]).toBe(app.router)
    expect(text('[data-probe]')).toBe('/one')

    await clickLink(app, host(), '/two')
    expect(text('[data-probe]')).toBe('/two')
    expect(host().textContent).toContain('page two')
  })

  it("puts the native router's matched child route where a layout route renders its page", async () => {
    resetBindingProbe()
    const { app } = await open('/nested/one')
    expect(text('[data-layout]')).toBe('page one')

    await clickLink(app, host(), '/nested/two')
    expect(text('[data-layout]')).toBe('page two')
  })

  it('a provider inside another uses the outer router, registers its routes and calls onRouterReady once', async () => {
    const routes: RouteDefinition[] = [{ path: '/items/:id', name: 'item' }]
    const probe = resetBindingProbe()
    probe.innerRoutes = routes
    const { app } = await open('/probe/inner-provider')
    app.navigate('/probe/inner-provider?tab=2')
    await settle(app)

    expect(probe.innerReady).toHaveLength(1)
    expect(probe.innerReady[0]).toBe(app.router)
    expect(app.bonded()).toBe(app.router)
    expect(app.router.getRoutes()).toEqual(expect.arrayContaining(routes))
  })

  it('a page reads its route params through useMoleculeRouter with no route definitions', async () => {
    const probe = resetBindingProbe()
    const { app } = await open('/probe/params/team')
    expect(probe.params.at(-1)).toEqual({
      router: { account: 'team' },
      binding: { account: 'team' },
    })

    probe.params.length = 0
    await clickLink(app, host(), '/probe/params/personal')
    expect(probe.params.length).toBeGreaterThan(0)
    // No update paired the new address with the previous params.
    expect(probe.params).toEqual(
      probe.params.map(() => ({
        router: { account: 'personal' },
        binding: { account: 'personal' },
      })),
    )
  })

  it("useMoleculeRouter shares the bonded router's guards, named routes and navigation", async () => {
    const routes: RouteDefinition[] = [{ path: '/probe/shares/:account', name: 'shares' }]
    setProviderRoutes(routes)
    const probe = resetBindingProbe()
    const { app } = await open('/probe/shares/team')
    const router = probe.returned[0]
    expect(router.getRoutes()).toEqual(app.bonded().getRoutes())
    expect(router.generatePath('shares', { account: 'personal' })).toBe('/probe/shares/personal')

    await router.navigateTo('shares', { account: 'personal' })
    await settle(app)
    expect(app.bonded().getLocation().pathname).toBe('/probe/shares/personal')

    // A guard added through the component's router stops a navigation the bonded router starts.
    const removeGuard = router.addGuard((to) => !to.pathname.startsWith('/blocked'))
    await app.bonded().navigate('/blocked')
    await settle(app)
    expect(app.bonded().getLocation().pathname).toBe('/probe/shares/personal')
    removeGuard()

    host().querySelector<HTMLButtonElement>('#update-shares')?.click()
    await settle(app)
    expect(text('#update-shares')).toBe('page 1')
    expect(new Set(probe.returned).size).toBe(1)
  })

  it('RoutedView says a SvelteKit layout renders its page as children', async () => {
    const probe = resetBindingProbe()
    await open('/probe/routed-view')
    const thrown = probe.clientError
    expect(thrown).toBeInstanceOf(Error)
    expect(thrown).toMatchObject({ i18nKey: 'svelte.error.noRoutedView' })
    expect(thrown instanceof Error && thrown.message).toContain('{@render children()}')
  })
})
