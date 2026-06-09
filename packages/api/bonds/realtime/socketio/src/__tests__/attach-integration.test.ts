import http from 'node:http'

import { afterEach, describe, expect, it } from 'vitest'

import type { RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/**
 * Real (un-mocked) integration test for the probe #11 fix: a deferred provider
 * must, on `attachHttpServer`, make Socket.io serve its handshake on the GIVEN
 * HTTP server (i.e. the API's server / port) — not a separate standalone port a
 * containerized sandbox never exposes. Uses real socket.io + a real http.Server,
 * with full teardown so no listener leaks.
 */
describe('socketio provider — real attachHttpServer integration', () => {
  let server: http.Server | undefined
  let provider: RealtimeProvider | undefined

  afterEach(async () => {
    await provider?.close()
    provider = undefined
    await new Promise<void>((resolve) => {
      if (!server) {
        resolve()
        return
      }
      server.close(() => resolve())
    })
    server = undefined
  })

  it('attachHttpServer serves the Socket.io handshake on the given HTTP server', async () => {
    provider = createProvider({ deferAttach: true })
    server = http.createServer()
    // Deferred → no transport bound until we attach to the real server.
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)

    // A live Socket.io server answers the EIO v4 polling handshake with HTTP 200
    // and an open ("0…") packet. A 404 here is the exact symptom of the bug.
    const res = await fetch(`http://localhost:${port}/socket.io/?EIO=4&transport=polling`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body.startsWith('0')).toBe(true)
  })
})
