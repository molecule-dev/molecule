/**
 * The React bond's `credential-consumption-r9` title, carried to SvelteKit's real
 * client router: the core consumer over the bond's router, as the Svelte bindings'
 * `useConsumedSearchParam` store wraps it.
 *
 * React's back/forward is `useNavigate()(-1)`; the router's own `go(-1)` moves the
 * browser's history, which kit follows through popstate, and the case waits for the
 * navigation kit commits.
 *
 * @module
 */
import { afterEach, beforeEach, expect, it } from 'vitest'

import { createConsumedSearchParam } from '@molecule/app-routing'

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
  const consumed = createConsumedSearchParam(router, 'token')
  consumed.connect()
  await settle(kit.app)
  expect(consumed.get()).toBe('token-A')

  await router.navigate('/reset-password?token=token-B&link=B')
  await settle(kit.app)
  expect(consumed.get()).toBe('token-B')

  await awaitNavigation(kit.app, () => router.go(-1))
  expect(router.getLocation().search).toBe('?link=A')
  expect(consumed.get()).toBe('token-A')

  await awaitNavigation(kit.app, () => router.go(1))
  expect(router.getLocation().search).toBe('?link=B')
  expect(consumed.get()).toBe('token-B')
})
