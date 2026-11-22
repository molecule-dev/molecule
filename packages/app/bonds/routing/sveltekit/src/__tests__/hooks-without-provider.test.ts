/**
 * The React bond's `hooks-without-provider` titles, carried to the SvelteKit bond.
 *
 * React's file mounts its `Settings` component — the four molecule hooks and the buttons
 * that drive them — under each of React Router's routers and reads the rendered answers.
 * The SvelteKit port mounts the same component (`kit-app/src/lib/HookReaders.svelte`) in
 * the test app's root layout, below the bond's `MoleculeRouterProvider`, and reads its
 * output over kit's real client router. What each React-only phrase means here:
 *
 * - "MemoryRouter" is React Router's own memory history. SvelteKit has one client router,
 *   over the browser's history; every case runs under it, and the suite's three projects
 *   run that same client over the root, a base path and hash routing.
 * - "without MoleculeRouterProvider" is the provider being MANDATORY in SvelteKit, not
 *   optional: kit's client router cannot be reached without the app's `$app/*` modules, so
 *   there is no fallback router to isolate. The last case mounts a component outside any
 *   provider and asserts the bond's `I18nError`.
 * - `useMoleculeRouter` / `useMoleculeQuery` / `useMoleculeNavigate` / `useIsActive` are the
 *   bond's own hooks, which read the provider's context (Svelte has no render-phase hook
 *   result to re-read); the reactive ones return `Readable` stores, the shape
 *   `@molecule/app-svelte`'s hooks return.
 * - `MoleculeRouterProvider`'s `onRouterReady` is supplied by the test app's root layout
 *   (`onRouterReady`), so "drives the bonded router" reads the router that callback
 *   received.
 *
 * @module
 */
import { flushSync, mount as mountComponent, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { getRouter, type RouteDefinition, setRouter } from '@molecule/app-routing'

import { createSvelteKitRouter } from '../index.js'
import {
  clearProviderProbe,
  providerReadyCalls,
  setHooksProbe,
  setProviderRoutes,
} from './kit-app/src/lib/probe.js'
import OutsideProvider from './OutsideProvider.svelte'
import { awaitNavigation, documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

const initialPath = '/settings/team?tab=billing#payment'
const originalBond = getRouter()

let kit: StartedKit | undefined
let container: HTMLElement | undefined
let outsider: HTMLElement | undefined
let mountedOutside: Record<string, unknown> | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  clearProviderProbe()
  setRouter(originalBond)
})

afterEach(() => {
  if (mountedOutside) {
    void unmount(mountedOutside)
    mountedOutside = undefined
  }
  outsider?.remove()
  outsider = undefined
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
  setRouter(originalBond)
})

/**
 * Starts the test app at `path`, with the hook readers mounted below the provider, as an
 * app's root layout starts kit.
 *
 * @param path - The in-app path the app opens on.
 * @returns The started app, once kit has rendered it.
 */
const mount = async (path = initialPath): Promise<StartedKit> => {
  setHooksProbe()
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(path), container)
  await settle(kit.app)
  return kit
}

/** The text of the hook readers' output labelled `name`. */
const output = (name: string): string => {
  const node = container?.querySelector<HTMLElement>(`[aria-label="${name}"]`)
  if (!node) throw new Error(`no [aria-label="${name}"] in the started app`)
  return node.textContent ?? ''
}

/** Clicks the hook readers' button with `id`. */
const click = (id: string): void => {
  const node = container?.querySelector<HTMLButtonElement>(`#${id}`)
  if (!node) throw new Error(`no #${id} in the started app`)
  node.click()
}

describe('routing readers without a molecule provider', () => {
  it('reads a settings page query under MemoryRouter', async () => {
    await mount()

    expect(output('query')).toBe('{"tab":"billing"}')
  })

  it('navigates with useMoleculeNavigate under MemoryRouter', async () => {
    const started = await mount()

    await awaitNavigation(started.app, () => click('preferences-profile'))
    await settle(started.app)

    expect(output('location')).toBe('/preferences?tab=profile')
  })

  it('checks exact and partial active paths under MemoryRouter', async () => {
    await mount()

    expect(JSON.parse(output('active-paths'))).toEqual([true, false, false])
    expect(output('active')).toBe('true')
  })

  it('creates a router with the current location and working navigate under MemoryRouter', async () => {
    const started = await mount()

    // `useMoleculeRouter()` returned the provider's router at the readers' initialisation,
    // and every reader below answers for the location kit opened on.
    expect(output('query')).toBe('{"tab":"billing"}')
    expect(output('hash')).toBe('#payment')
    expect(JSON.parse(output('params'))).toEqual({ account: 'team' })

    await awaitNavigation(started.app, () => click('to-settings-personal'))
    await settle(started.app)

    expect(output('location')).toBe('/settings/personal?tab=security')
    expect(output('query')).toBe('{"tab":"security"}')
    expect(JSON.parse(output('params'))).toEqual({ account: 'personal' })
    expect(JSON.parse(output('state'))).toEqual({ source: 'tabs' })
  })

  /** The client routers the four-reader case runs over (kit has one per app). */
  const routers = [{ name: 'SvelteKit client router' }] as const

  it.each(routers)('switches settings tabs under $name with all four hooks', async () => {
    const started = await mount()

    expect(output('query')).toBe('{"tab":"billing"}')
    expect(output('active')).toBe('true')
    expect(output('location')).toBe(initialPath)

    await awaitNavigation(started.app, () => click('profile-tab'))
    await settle(started.app)
    expect(output('query')).toBe('{"tab":"profile"}')
    expect(output('state')).toBe('{"source":"tabs"}')
    expect(output('location')).toBe('/settings/team?tab=profile')
    expect(output('active')).toBe('true')

    await awaitNavigation(started.app, () => click('preferences'))
    await settle(started.app)
    expect(output('query')).toBe('{"tab":"notifications"}')
    expect(output('active')).toBe('false')
    expect(output('location')).toBe('/preferences?tab=notifications#email')
  })

  it('does not replace the global bond when several fallback consumers mount or navigate', async () => {
    const started = await mount()
    const bonded = createSvelteKitRouter(started.app.navigation)
    // Bond in the APP's module graph — the one the provider's `setRouter` wrote — so this
    // case reads the same global bond the mounted readers live beside.
    started.app.bond(bonded)
    const first = createSvelteKitRouter(started.app.navigation)
    const second = createSvelteKitRouter(started.app.navigation)
    expect(first).not.toBe(second)
    expect(first).not.toBe(bonded)
    expect(started.app.bonded()).toBe(bonded)

    await first.navigate('/settings?tab=profile')
    await settle(started.app)

    expect(first.getQuery()).toEqual({ tab: 'profile' })
    // Kit keeps one page state for the app, so every router built over the same
    // navigation reads the committed location; what React's isolation asserted —
    // that the navigation did not go through, or replace, the global bond — holds.
    expect(second.getQuery()).toEqual({ tab: 'profile' })
    // And the mounted readers still read the provider's router, not the bond this case
    // just made.
    expect(output('query')).toBe('{"tab":"profile"}')
    expect(started.app.bonded()).toBe(bonded)
    first.destroy()
    second.destroy()
    expect(started.app.bonded()).toBe(bonded)
  })

  it('drives the bonded router with its named routes and onRouterReady', async () => {
    const routes: RouteDefinition[] = [{ name: 'settings', path: '/settings/:account' }]
    setProviderRoutes(routes)
    const started = await mount()

    // The root layout passed `routes` to the provider and `onRouterReady` received the
    // router it bonded; the readers' `useMoleculeRouter()` returned the same object.
    expect(providerReadyCalls()).toHaveLength(1)
    expect(providerReadyCalls()[0]).toBe(started.app.router)
    expect(started.app.bonded()).toBe(started.app.router)
    expect(started.app.router.getRoutes()).toEqual(routes)
    expect(started.app.router.generatePath('settings', { account: 'personal' })).toBe(
      '/settings/personal',
    )

    await started.app.router.navigateTo('settings', { account: 'personal' }, { tab: 'security' })
    await settle(started.app)
    expect(started.app.bonded()).toBe(started.app.router)
    expect(output('location')).toBe('/settings/personal?tab=security')
    expect(output('query')).toBe('{"tab":"security"}')
    expect(started.app.router.getRoutes()).toEqual(routes)

    // Core navigation in the app's own module graph reaches the provider's router.
    started.app.navigate('/settings/work?tab=profile')
    await settle(started.app)
    expect(output('location')).toBe('/settings/work?tab=profile')
    expect(output('query')).toBe('{"tab":"profile"}')
    expect(started.app.bonded()).toBe(started.app.router)
  })
})

describe('routing readers outside the mounted router', () => {
  it.each(['useMoleculeRouter', 'useMoleculeQuery', 'useMoleculeNavigate', 'useIsActive'] as const)(
    '%s names the router to mount',
    (hook) => {
      outsider = document.createElement('div')
      document.body.appendChild(outsider)
      let thrown: unknown
      try {
        mountedOutside = mountComponent(OutsideProvider, { target: outsider, props: { hook } })
        flushSync()
      } catch (error) {
        thrown = error
      }

      // React's hooks threw a React Router message; the port throws the bond's `I18nError`,
      // whose key travels with the English default naming what to mount.
      const failure = thrown instanceof I18nError ? thrown : undefined
      expect(failure).toBeInstanceOf(I18nError)
      expect(failure?.i18nKey).toBe('routing.sveltekit.error.useMoleculeRouterOutsideRouter')
      expect(failure?.message).toContain('MoleculeRouterProvider')
    },
  )
})
