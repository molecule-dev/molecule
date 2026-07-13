/**
 * Unit coverage for the deferred-attach realtime setups (`setupRealtimeWs`,
 * `setupRealtimeSse`) added alongside the pre-existing `setupRealtimeSocketio`.
 *
 * Only `@molecule/api-server-default-express`'s `registerServerCreatedHook`
 * is mocked (so the registered hook can be invoked synchronously without
 * building a real Express server + listening). The realtime providers
 * themselves are REAL (`@molecule/api-realtime`, `@molecule/api-realtime-ws`,
 * `@molecule/api-realtime-sse`) — so this also regression-guards the
 * port-bind contract at the setup layer: `setupRealtimeWs()` /
 * `setupRealtimeSse()` must never open a listening socket by themselves;
 * only invoking the registered hook with a real HTTP server may attach.
 */
import http from 'node:http'

import { afterEach, describe, expect, it, vi } from 'vitest'

const { hooks } = vi.hoisted(() => ({
  hooks: [] as Array<(server: unknown) => unknown>,
}))

vi.mock('@molecule/api-server-default-express', () => ({
  registerServerCreatedHook: (hook: (server: unknown) => unknown) => {
    hooks.push(hook)
  },
}))

import * as setup from '../setup.js'

afterEach(async () => {
  hooks.length = 0
  const { unbond } = await import('@molecule/api-bond')
  unbond('realtime')
})

describe('setupRealtimeWs / setupRealtimeSse — defer-attach port-bind contract', () => {
  it('setupRealtimeWs bonds a deferred provider that only attaches once the server-created hook fires', async () => {
    await setup.setupRealtimeWs()

    const { getProvider } = await import('@molecule/api-realtime')
    const provider = getProvider()
    expect(provider.attachHttpServer).toBeTypeOf('function')

    const attachSpy = vi.spyOn(provider, 'attachHttpServer' as never)
    expect(hooks).toHaveLength(1)

    // A real (never-listening) http.Server — attachHttpServer wires real
    // ws/sse internals that expect a genuine EventEmitter-shaped server.
    const fakeServer = http.createServer()
    await hooks[0](fakeServer)
    expect(attachSpy).toHaveBeenCalledWith(fakeServer)
  })

  it('setupRealtimeSse bonds a deferred provider that only attaches once the server-created hook fires', async () => {
    await setup.setupRealtimeSse()

    const { getProvider } = await import('@molecule/api-realtime')
    const provider = getProvider()
    expect(provider.attachHttpServer).toBeTypeOf('function')

    const attachSpy = vi.spyOn(provider, 'attachHttpServer' as never)
    expect(hooks).toHaveLength(1)

    // A real (never-listening) http.Server — attachHttpServer wires real
    // ws/sse internals that expect a genuine EventEmitter-shaped server.
    const fakeServer = http.createServer()
    await hooks[0](fakeServer)
    expect(attachSpy).toHaveBeenCalledWith(fakeServer)
  })
})
