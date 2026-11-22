/**
 * `createSvelteKitNavigation` watches kit's `page` once and passes each change to the
 * listeners the router adds and removes. An adapter that registered kit's `afterNavigate`
 * per `listen` (kit takes it only while a component initialises and returns no
 * unsubscribe) made every later subscriber hear each navigation once per earlier subscribe.
 * Both run in the test app (`./kit-app`) over kit's real client router, whose root layout
 * subscribes, unsubscribes and subscribes again a router over each.
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
  it('tells a router that listened again about each navigation once', async () => {
    const { app } = await followOneLink()
    expect(app.resubscribed.bond).toEqual(['push'])
  })

  it('is what keeps a resubscribed router from hearing a navigation twice', async () => {
    const { app } = await followOneLink()
    expect(app.resubscribed.handWritten).toEqual(['push', 'push'])
  })
})
