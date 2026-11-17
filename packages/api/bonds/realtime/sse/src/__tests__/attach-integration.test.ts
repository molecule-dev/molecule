/**
 * REAL (un-mocked) integration tests for the port-binding + CORS-default
 * audit fixes: `createProvider()` must never bind a standalone network port
 * as a side effect when the caller asked to defer, a standalone bind failure
 * must be logged with an actionable, bond-named message instead of crashing
 * the process with a bare, unattributed `EADDRINUSE`, and `corsOrigin` must
 * not silently default to `'*'` in production when an app origin is known.
 * Uses a real Node HTTP server + real `fetch`, with full teardown so no
 * listener leaks.
 *
 * @module
 */

import http from 'node:http'
import net from 'node:net'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/**
 * A port nothing listens on: bind port 0, read the port the OS chose, release it. A hard-coded
 * port can already be taken on a shared machine.
 *
 * @returns The free port.
 */
async function freePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const address = probe.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise<void>((resolve) => probe.close(() => resolve()))
  return port
}

/**
 * Wait until `check` holds, polling every 25 ms. A standalone provider binds its port
 * asynchronously and reports a bind failure asynchronously, with no event to await, so the
 * tests wait for the real condition instead of a fixed delay (20 ms was not enough on a
 * loaded machine: ECONNREFUSED in the 2026-11-17 release run).
 *
 * @param check - Resolves true once the condition holds.
 * @param what - What is awaited, for the timeout message.
 * @param timeoutMs - How long to wait.
 */
async function until(
  check: () => Promise<boolean> | boolean,
  what: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error(`${what} did not happen within ${timeoutMs} ms`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/**
 * Whether something accepts TCP connections on the port.
 *
 * @param port - Port on 127.0.0.1.
 * @returns True when a connection is accepted.
 */
function accepting(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

describe('@molecule/api-realtime-sse — real port-binding + CORS-default contract', () => {
  let server: http.Server | undefined
  let provider: RealtimeProvider | undefined
  let secondProvider: RealtimeProvider | undefined
  const previousNodeEnv = process.env.NODE_ENV
  const previousAppOrigin = process.env.APP_ORIGIN
  const previousSiteOrigin = process.env.SITE_ORIGIN

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
    process.env.NODE_ENV = previousNodeEnv
    if (previousAppOrigin === undefined) delete process.env.APP_ORIGIN
    else process.env.APP_ORIGIN = previousAppOrigin
    if (previousSiteOrigin === undefined) delete process.env.SITE_ORIGIN
    else process.env.SITE_ORIGIN = previousSiteOrigin
  })

  it('deferAttach: attachHttpServer serves real SSE subscriptions on the given HTTP server', async () => {
    provider = createProvider({ deferAttach: true, path: '/sse' })
    server = http.createServer()
    // Deferred → no transport bound until we attach to the real server.
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)

    const controller = new AbortController()
    try {
      const response = await fetch(`http://127.0.0.1:${String(port)}/sse`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
    } finally {
      controller.abort()
    }
  })

  it('CONTRACT: zero-config createProvider() opens NO listening socket (the exact port the old default would have bound)', async () => {
    // Pin PORT so the env-aware resolution is deterministic: pre-fix, a
    // zero-config createProvider() would have eagerly bound PORT + 1000 as a
    // side effect. Prove that port is NOT listening after creation.
    const previousPort = process.env.PORT
    process.env.PORT = '47100'
    try {
      provider = createProvider()
      // Give any accidental async bind time to happen before probing.
      await new Promise((resolve) => setTimeout(resolve, 50))
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect(48100, '127.0.0.1')
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

  it('CONTRACT: zero-config createProvider() + attachHttpServer still serves real SSE subscriptions', async () => {
    // Zero-config must behave exactly like `{ deferAttach: true }` — proving
    // the deferred path still works when NEITHER option is passed at all.
    provider = createProvider({ path: '/sse' })
    server = http.createServer()
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)

    const controller = new AbortController()
    try {
      const response = await fetch(`http://127.0.0.1:${String(port)}/sse`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
    } finally {
      controller.abort()
    }
  })

  it('CONTRACT: an explicit port still opens a real listening socket (back-compat for standalone callers)', async () => {
    const fixedPort = await freePort()
    provider = createProvider({ port: fixedPort, path: '/sse' })
    await until(() => accepting(fixedPort), `a listener on port ${String(fixedPort)}`)

    const controller = new AbortController()
    try {
      const response = await fetch(`http://127.0.0.1:${String(fixedPort)}/sse`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
    } finally {
      controller.abort()
    }
  })

  it('CONTRACT: an explicit port serves once a slow bind completes (a loaded machine)', async () => {
    // The standalone bind is asynchronous. Delay it well past the old fixed 20 ms wait: the
    // contract is that the socket opens, not how fast.
    const listen = http.Server.prototype.listen
    const spy = vi.spyOn(http.Server.prototype, 'listen').mockImplementation(function (
      this: http.Server,
      ...args: unknown[]
    ) {
      setTimeout(() => listen.apply(this, args as Parameters<typeof listen>), 300)
      return this
    })
    try {
      const fixedPort = await freePort()
      provider = createProvider({ port: fixedPort, path: '/sse' })
      expect(await accepting(fixedPort)).toBe(false)
      await until(() => accepting(fixedPort), `a listener on port ${String(fixedPort)}`)
      const controller = new AbortController()
      try {
        const response = await fetch(`http://127.0.0.1:${String(fixedPort)}/sse`, {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        })
        expect(response.status).toBe(200)
      } finally {
        controller.abort()
      }
    } finally {
      spy.mockRestore()
    }
  })

  it('CONTRACT: zero-config logs an info line naming the bond instead of silently deferring', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      provider = createProvider({ path: '/sse' })
      expect(infoSpy).toHaveBeenCalled()
      const messages = infoSpy.mock.calls.map((call) => String(call[0]))
      expect(messages.some((message) => message.includes('Realtime SSE'))).toBe(true)
      expect(messages.some((message) => message.includes('attachHttpServer'))).toBe(true)
    } finally {
      infoSpy.mockRestore()
    }
  })

  it('attachHttpServer binds once (idempotent) — a second call does not double-attach the request listener', async () => {
    provider = createProvider({ deferAttach: true, path: '/sse' })
    server = http.createServer()
    provider.attachHttpServer?.(server)
    provider.attachHttpServer?.(server)
    expect(server.listenerCount('request')).toBe(1)
  })

  it('CONSUMER PROPERTY: a standalone bind failure (port already in use) is logged with the bond name and port, not an unattributed crash', async () => {
    const fixedPort = await freePort()

    // Bind the first provider on a real port so a second standalone
    // provider can deliberately collide on the SAME port (EADDRINUSE).
    provider = createProvider({ port: fixedPort })
    await until(() => accepting(fixedPort), `a listener on port ${String(fixedPort)}`)

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      secondProvider = createProvider({ port: fixedPort })
      // Wait for the async EADDRINUSE 'error' event — with no
      // listener this would otherwise crash the process with a bare,
      // unattributed uncaught exception instead of a logged, actionable message.
      await until(() => errorSpy.mock.calls.length > 0, 'the bind failure log')

      expect(errorSpy).toHaveBeenCalled()
      const loggedMessages = errorSpy.mock.calls.map((call) => String(call[0]))
      expect(loggedMessages.some((message) => message.includes('Realtime SSE'))).toBe(true)
      expect(loggedMessages.some((message) => message.includes(String(fixedPort)))).toBe(true)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('CONSUMER PROPERTY: corsOrigin defaults to APP_ORIGIN in production instead of the wide-open "*"', async () => {
    delete process.env.SITE_ORIGIN
    process.env.NODE_ENV = 'production'
    process.env.APP_ORIGIN = 'https://app.example.com'

    server = http.createServer()
    provider = createProvider({ httpServer: server, path: '/sse' })
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0

    const controller = new AbortController()
    try {
      const response = await fetch(`http://127.0.0.1:${String(port)}/sse`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      expect(response.headers.get('access-control-allow-origin')).toBe('https://app.example.com')
    } finally {
      controller.abort()
    }
  })

  it('CONSUMER PROPERTY: corsOrigin falls back to "*" in production with a logged warning when no app origin is configured', async () => {
    delete process.env.APP_ORIGIN
    delete process.env.SITE_ORIGIN
    process.env.NODE_ENV = 'production'

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      server = http.createServer()
      provider = createProvider({ httpServer: server, path: '/sse' })
      await new Promise<void>((resolve) => server?.listen(0, resolve))
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0

      const controller = new AbortController()
      try {
        const response = await fetch(`http://127.0.0.1:${String(port)}/sse`, {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        })
        expect(response.headers.get('access-control-allow-origin')).toBe('*')
      } finally {
        controller.abort()
      }

      expect(warnSpy).toHaveBeenCalled()
      const loggedMessages = warnSpy.mock.calls.map((call) => String(call[0]))
      expect(loggedMessages.some((message) => message.includes('corsOrigin'))).toBe(true)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('CONTRACT: coexists with a pre-existing request handler on a shared server (no ERR_HTTP_HEADERS_SENT)', async () => {
    // Reproduces the Express case: `http.createServer(app)` installs a request
    // handler that answers EVERY path (404 for unmatched). Before the dispatcher
    // fix, attachHttpServer added a SECOND 'request' listener, so both responded
    // to the SSE path — our writeHead then threw ERR_HTTP_HEADERS_SENT and crashed
    // the process on request-end. The dispatcher must route our `path` to SSE and
    // delegate every other path to the pre-existing handler.
    const seen: string[] = []
    const existingHandler = (req: http.IncomingMessage, res: http.ServerResponse): void => {
      seen.push(req.url ?? '')
      if (req.url?.startsWith('/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
      }
    }
    provider = createProvider({ deferAttach: true, path: '/api/realtime' })
    server = http.createServer(existingHandler)
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server?.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0

    // The pre-existing handler still serves its own routes (delegation works).
    const health = await fetch(`http://127.0.0.1:${String(port)}/health`)
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ ok: true })

    // The SSE path is served by SSE (200 / text/event-stream), NOT 404'd by the
    // pre-existing handler, and the process does not crash on request-end.
    const controller = new AbortController()
    try {
      const sse = await fetch(`http://127.0.0.1:${String(port)}/api/realtime?room=r`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      expect(sse.status).toBe(200)
      expect(sse.headers.get('content-type')).toBe('text/event-stream')
    } finally {
      controller.abort()
    }

    // The pre-existing handler must NOT have been invoked for the SSE path.
    expect(seen.some((url) => url.startsWith('/api/realtime'))).toBe(false)
  })
})
