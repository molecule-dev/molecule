/**
 * The React bond's `hooks-without-provider` titles, carried to the SvelteKit bond.
 *
 * SvelteKit's bond has no hooks of its own: the app builds ONE router from kit's
 * client router in its root layout (`createSvelteKitRouter`) and hands it to
 * `@molecule/app-svelte`'s `setMoleculeContext({ router })`, and every molecule
 * consumer reads that router. So the cases drive the router the app mounted — the
 * four readers React's hooks wrap are its `getQuery()`, `navigate()`,
 * `isActive()` and `getLocation()/getParams()` — over kit's real client, with no
 * molecule provider mounted (there is none to mount; React needed none either).
 *
 * Framework-forced translations:
 *
 * - "MemoryRouter" is React Router's own memory history. SvelteKit has one client
 *   router, over the browser's history; every case runs under it, and the suite's
 *   projects run that same client over the root, a base path and hash routing.
 * - `useIsActive`/`useMoleculeRouter` become the router's own `isActive` and the
 *   router object; there is no per-component fallback router to isolate.
 * - `MoleculeRouterProvider`'s `onRouterReady` has no counterpart — the layout
 *   that builds the router IS the ready signal — so the case asserts the bonded
 *   identity React asserted through it.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getRouter,
  navigate as coreNavigate,
  type RouteDefinition,
  type Router,
  setRouter,
} from '@molecule/app-routing'

import { createSvelteKitRouter } from '../provider.js'
import { documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

const initialPath = '/settings/team?tab=billing#payment'
const originalBond = getRouter()

let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
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
 * Starts the test app at `path`, as an app's root layout starts kit.
 *
 * @param path - The in-app path the app opens on.
 * @returns The started app, once kit has rendered it.
 */
const mount = async (path = initialPath): Promise<StartedKit> => {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(path), container)
  await settle(kit.app)
  return kit
}

describe('routing readers without a molecule provider', () => {
  it('reads a settings page query under MemoryRouter', async () => {
    const started = await mount()

    expect(started.app.router.getQuery()).toEqual({ tab: 'billing' })
  })

  it('navigates with useMoleculeNavigate under MemoryRouter', async () => {
    const started = await mount()

    await started.app.router.navigate('/preferences?tab=profile')
    await settle(started.app)

    expect(started.app.router.getLocation().pathname).toBe('/preferences')
    expect(started.app.router.getLocation().search).toBe('?tab=profile')
  })

  it('checks exact and partial active paths under MemoryRouter', async () => {
    const started = await mount()
    const router = started.app.router

    expect([
      router.isActive('/settings', false),
      router.isActive('/settings', true),
      router.isActive('/other'),
    ]).toEqual([true, false, false])
  })

  it('creates a router with the current location and working navigate under MemoryRouter', async () => {
    const started = await mount()
    const router = started.app.router

    expect(router.getQuery()).toEqual({ tab: 'billing' })
    expect(router.getHash()).toBe('#payment')
    expect(router.getParams()).toEqual({ account: 'team' })
    await router.navigate('/settings/personal?tab=security', { state: { source: 'tabs' } })
    await settle(started.app)
    expect(router.getLocation().pathname).toBe('/settings/personal')
    expect(router.getQuery()).toEqual({ tab: 'security' })
    expect(router.getParams()).toEqual({ account: 'personal' })
    expect(router.getLocation().state).toEqual({ source: 'tabs' })
  })

  /** The client routers the four-reader case runs over (kit has one per app). */
  const routers = [{ name: 'SvelteKit client router' }] as const

  it.each(routers)('switches settings tabs under $name with all four hooks', async () => {
    const started = await mount()
    const router = started.app.router
    /** The committed `pathname + search + hash`, as React's `useLocation()` reads it. */
    const location = (): string => {
      const { pathname, search, hash } = router.getLocation()
      return pathname + search + hash
    }

    expect(router.getQuery()).toEqual({ tab: 'billing' })
    expect(router.isActive('/settings', false)).toBe(true)
    expect(location()).toBe(initialPath)

    await router.navigate('?tab=profile', { state: { source: 'tabs' } })
    await settle(started.app)
    expect(router.getQuery()).toEqual({ tab: 'profile' })
    expect(router.getLocation().state).toEqual({ source: 'tabs' })
    expect(location()).toBe('/settings/team?tab=profile')
    expect(router.isActive('/settings', false)).toBe(true)

    await router.navigate('/preferences?tab=notifications#email')
    await settle(started.app)
    expect(router.getQuery()).toEqual({ tab: 'notifications' })
    expect(router.isActive('/settings', false)).toBe(false)
    expect(location()).toBe('/preferences?tab=notifications#email')
  })

  it('does not replace the global bond when several fallback consumers mount or navigate', async () => {
    const started = await mount()
    const bonded = createSvelteKitRouter(started.app.navigation)
    setRouter(bonded)
    const first = createSvelteKitRouter(started.app.navigation)
    const second = createSvelteKitRouter(started.app.navigation)
    expect(first).not.toBe(second)
    expect(first).not.toBe(bonded)
    expect(getRouter()).toBe(bonded)

    await first.navigate('/settings?tab=profile')
    await settle(started.app)

    expect(first.getQuery()).toEqual({ tab: 'profile' })
    // Kit keeps one page state for the app, so every router built over the same
    // navigation reads the committed location; what React's isolation asserted —
    // that the navigation did not go through, or replace, the global bond — holds.
    expect(second.getQuery()).toEqual({ tab: 'profile' })
    expect(getRouter()).toBe(bonded)
    first.destroy()
    second.destroy()
    expect(getRouter()).toBe(bonded)
  })

  it('returns the exact bonded router with named routes and onRouterReady', async () => {
    const routes: RouteDefinition[] = [{ name: 'settings', path: '/settings/:account' }]
    const started = await mount()
    const router = createSvelteKitRouter(started.app.navigation, { routes })
    // The root layout builds the router and the app bonds it: React's provider did
    // both, and `onRouterReady` fired with the router it bonded.
    setRouter(router)

    expect(getRouter()).toBe(router)
    expect(router.getRoutes()).toEqual(routes)
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await router.navigateTo('settings', { account: 'personal' }, { tab: 'security' })
    await settle(started.app)
    expect(getRouter()).toBe(router)
    expect(router.getLocation().pathname).toBe('/settings/personal')
    expect(router.getQuery()).toEqual({ tab: 'security' })
    expect(router.getRoutes()).toEqual(routes)

    coreNavigate('/settings/work?tab=profile')
    await settle(started.app)
    expect(router.getLocation().pathname).toBe('/settings/work')
    expect(router.getQuery()).toEqual({ tab: 'profile' })
    expect(getRouter()).toBe(router)
  })
})

describe('routing readers outside the mounted router', () => {
  it.each([
    ['useMoleculeRouter', (router: Router) => router],
    ['useMoleculeQuery', (router: Router) => router.getQuery],
    ['useMoleculeNavigate', (router: Router) => router.navigate],
    ['useIsActive', (router: Router) => router.isActive],
  ] as const)('%s names the router to mount', async (_name, read) => {
    const started = await mount()
    const mounted = started.app.router

    // React's hooks throw when no router is mounted. SvelteKit has no provider
    // layer to throw from: the reader belongs to the router the app's root layout
    // builds from kit's navigation, and until the app bonds that one, the global
    // bond is core's own fallback — a different router with its own readers.
    const fallback = getRouter()
    expect(fallback).not.toBe(mounted)
    expect(read(fallback)).not.toBe(read(mounted))

    setRouter(mounted)
    expect(read(getRouter())).toBe(read(mounted))
  })
})
