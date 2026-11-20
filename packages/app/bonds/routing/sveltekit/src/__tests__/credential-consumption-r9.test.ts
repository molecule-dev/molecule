/**
 * The React bond's `credential-consumption-r9` title, carried to SvelteKit's real
 * client router and the bond's own `useConsumedSearchParam`.
 *
 * The `/reset-password` page calls the hook and publishes its tuple through
 * `credential-probe.ts`; the case reads the value there. The hook connects on mount, so
 * the first credential is consumed without the case calling anything.
 *
 * React's back/forward is `useNavigate()(-1)`; the router's own `go(-1)` moves the
 * browser's history, which kit follows through popstate, and the case waits for the
 * navigation kit commits.
 *
 * @module
 */
import { afterEach, beforeEach, expect, it } from 'vitest'

import { credentialProbe } from './kit-app/src/lib/credential-probe.js'
import { awaitNavigation, documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

it('associates consumed values with their cleaned entries through Back and Forward', async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl('/reset-password?token=token-A&link=A'), container)
  const router = kit.app.router
  await settle(kit.app)
  const consumed = credentialProbe()
  expect(consumed.value()).toBe('token-A')

  await router.navigate('/reset-password?token=token-B&link=B')
  await settle(kit.app)
  expect(consumed.value()).toBe('token-B')

  await awaitNavigation(kit.app, () => router.go(-1))
  expect(router.getLocation().search).toBe('?link=A')
  expect(consumed.value()).toBe('token-A')

  await awaitNavigation(kit.app, () => router.go(1))
  expect(router.getLocation().search).toBe('?link=B')
  expect(consumed.value()).toBe('token-B')
})
