/**
 * `createSvelteKitNavigation` registers kit's `afterNavigate` once. Kit takes the callback
 * only while a component initialises and returns no unsubscribe, so an adapter that
 * registered one per `listen` (with an unsubscribe that did nothing) made every later
 * subscriber hear each navigation once per earlier subscribe. Both run in the test app
 * (`./kit-app`) over kit's real client router, whose root layout subscribes,
 * unsubscribes and subscribes again a router over each.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { clickLink, documentUrl, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

/**
 * Starts the test app at `/one` and follows one kit link to `/two`.
 *
 * @returns The started app.
 */
async function followOneLink(): Promise<StartedKit> {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl('/one'), container)
  await clickLink(kit.app, container, '/two')
  return kit
}

describe('createSvelteKitNavigation', () => {
  it('registers one afterNavigate callback however often the router listens', async () => {
    const { app } = await followOneLink()
    expect(app.resubscribed.bond).toEqual(['push'])
    expect(app.afterNavigateRegistrations()).toBe(1)
  })

  it('is what keeps a resubscribed router from hearing a navigation twice', async () => {
    const { app } = await followOneLink()
    expect(app.resubscribed.handWritten).toEqual(['push', 'push'])
  })
})
