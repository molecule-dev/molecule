// @vitest-environment jsdom
/**
 * `createSvelteKitNavigation` registers kit's `afterNavigate` once. Kit's callbacks
 * cannot be removed, so an adapter that registered one per `listen` (and returned an
 * unsubscribe that did nothing) made every later subscriber hear each navigation once
 * per earlier subscribe.
 */
import { afterEach, describe, expect, it } from 'vitest'

import type { NavigationAction } from '@molecule/app-routing'

import { createSvelteKitNavigation, createSvelteKitRouter } from '../provider.js'
import type { SvelteKitNavigation } from '../types.js'
import { createKitClient, type KitClient } from './kit-client.js'

let client: KitClient | undefined

afterEach(() => {
  client?.destroy()
  client = undefined
})

/**
 * Subscribes, unsubscribes and subscribes again, then counts what one link click delivers.
 *
 * @param navigation - The navigation pieces the router is built over.
 * @returns The actions the second subscriber heard.
 */
async function heardAfterResubscribe(
  navigation: SvelteKitNavigation,
): Promise<(NavigationAction | undefined)[]> {
  const router = createSvelteKitRouter(navigation)
  router.subscribe(() => {})()
  const heard: (NavigationAction | undefined)[] = []
  router.subscribe((_location, action) => heard.push(action))
  await client!.link('/next')
  await new Promise((resolve) => setTimeout(resolve, 0))
  router.destroy()
  return heard
}

describe('createSvelteKitNavigation', () => {
  it('registers one afterNavigate callback however often the router listens', async () => {
    client = createKitClient({ initialPath: '/start', routes: [{ path: '*' }] })
    const navigation = createSvelteKitNavigation({
      goto: client.goto,
      replaceState: client.replaceState,
      page: client.page,
      afterNavigate: client.afterNavigate,
    })
    expect(client.callbackCount()).toBe(1)
    expect(await heardAfterResubscribe(navigation)).toEqual(['push'])
    expect(client.callbackCount()).toBe(1)
  })

  it('is what keeps a resubscribed router from hearing a navigation twice', async () => {
    client = createKitClient({ initialPath: '/start', routes: [{ path: '*' }] })
    const kit = client
    // The adapter an app would write by hand: one kit callback per listen, no real unsubscribe.
    const handWritten: SvelteKitNavigation = {
      goto: kit.goto,
      page: kit.page,
      onNavigate: (listener) => {
        kit.afterNavigate(listener)
        return () => {}
      },
    }
    expect(await heardAfterResubscribe(handWritten)).toEqual(['push', 'push'])
  })
})
