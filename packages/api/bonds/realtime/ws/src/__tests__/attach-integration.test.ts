import http from 'node:http'
import net from 'node:net'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'

import type { RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/**
 * REAL (un-mocked) integration tests for the port-binding contract audit
 * fix: `createProvider()` must never bind a standalone network port as a
 * side effect when the caller asked to defer, and a bind failure on a
 * standalone port must be logged with an actionable, bond-named message
 * instead of crashing the process with a bare, unattributed `EADDRINUSE`.
 * Uses a real `ws` server + a real `ws` client over real TCP sockets, with
 * full teardown so no listener leaks.
 *
 * @module
 */
describe('@molecule/api-realtime-ws — real port-binding contract', () => {
  let server: http.Server | undefined
  let provider: RealtimeProvider | undefined
  let secondProvider: RealtimeProvider | undefined

  afterEach(async () => {
    await provider?.close()
    provider = undefined
    await secondProvider?.close()
    secondProvider = undefined
    await new Promise<void>((resolve) => {
      if (!server) {
        resolve()
        return
      }
      server.close(() => resolve())
    })
    server = undefined
  })

  it('deferAttach: attachHttpServer serves real WebSocket upgrades on the given HTTP server', async () => {
    provider = createProvider({ deferAttach: true })
    server = http.createServer()
    // Deferred → no transport bound until we attach to the real server.
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)

    const socket = new WebSocket(`ws://127.0.0.1:${String(port)}/`)
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve)
        socket.once('error', reject)
      })
      expect(socket.readyState).toBe(socket.OPEN)
    } finally {
      socket.terminate()
    }
  })

  it('CONTRACT: zero-config createProvider() opens NO listening socket (the exact port the old default would have bound)', async () => {
    // Pin PORT so the env-aware resolution is deterministic: pre-fix, a
    // zero-config createProvider() would have eagerly bound PORT + 1000 as a
    // side effect. Prove that port is NOT listening after creation.
    const previousPort = process.env.PORT
    process.env.PORT = '47000'
    try {
      provider = createProvider()
      // Give any accidental async bind time to happen before probing.
      await new Promise((resolve) => setTimeout(resolve, 50))
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect(48000, '127.0.0.1')
        socket.once('connect', () => {
          socket.destroy()
          reject(new Error('unexpectedly connected — a listening socket was opened'))
        })
        socket.once('error', () => resolve())
      })
    } finally {
      if (previousPort === undefined) delete process.env.PORT
      else process.env.PORT = previousPort
    }
  })

  it('CONTRACT: zero-config createProvider() + attachHttpServer still serves real WebSocket upgrades', async () => {
    // Zero-config must behave exactly like `{ deferAttach: true }` — proving
    // the deferred path still works when NEITHER option is passed at all.
    provider = createProvider()
    server = http.createServer()
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)

    const socket = new WebSocket(`ws://127.0.0.1:${String(port)}/`)
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve)
        socket.once('error', reject)
      })
      expect(socket.readyState).toBe(socket.OPEN)
    } finally {
      socket.terminate()
    }
  })

  it('CONTRACT: an explicit port still opens a real listening socket (back-compat for standalone callers)', async () => {
    const fixedPort = 58215
    provider = createProvider({ port: fixedPort })
    await new Promise((resolve) => setTimeout(resolve, 20))

    const socket = new WebSocket(`ws://127.0.0.1:${String(fixedPort)}/`)
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve)
        socket.once('error', reject)
      })
      expect(socket.readyState).toBe(socket.OPEN)
    } finally {
      socket.terminate()
    }
  })

  it('CONSUMER PROPERTY: a standalone bind failure (port already in use) is logged with the bond name and port, not an unattributed crash', async () => {
    const fixedPort = 58211

    // Bind the first provider on a real, fixed port so a second standalone
    // provider can deliberately collide on the SAME port (EADDRINUSE).
    provider = createProvider({ port: fixedPort })
    await new Promise((resolve) => setTimeout(resolve, 20))

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      secondProvider = createProvider({ port: fixedPort })
      // Give the async EADDRINUSE 'error' event time to fire — with no
      // listener this would otherwise crash the process with a bare,
      // unattributed uncaught exception instead of a logged, actionable message.
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(errorSpy).toHaveBeenCalled()
      const loggedMessages = errorSpy.mock.calls.map((call) => String(call[0]))
      expect(loggedMessages.some((message) => message.includes('Realtime ws'))).toBe(true)
      expect(loggedMessages.some((message) => message.includes(String(fixedPort)))).toBe(true)
    } finally {
      errorSpy.mockRestore()
    }
  })
})
