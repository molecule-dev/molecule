import { once } from 'node:events'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import {
  createDrainHeaderMiddleware,
  installExpressLifecycle,
  mountLifecycleRoutes,
} from '../express.js'
import { createProcessLifecycleProvider } from '../lifecycle.js'

/** Wait until `predicate` is true, polling briefly (avoids fixed sleeps). */
async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('timed out waiting for condition')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

/** The listening port of a started server. */
function portOf(server: http.Server): number {
  return (server.address() as AddressInfo).port
}

/** Servers created by a test, closed afterwards. */
const openServers: http.Server[] = []

afterEach(() => {
  for (const server of openServers.splice(0)) server.close()
})

describe('lifecycle health routes', () => {
  it('answers /health/live 200 and /health/ready 200 once ready', async () => {
    const app = express()
    const lifecycle = installExpressLifecycle({
      app,
      // One passing probe: the consecutive-probe gate is covered by its own test.
      provider: createProcessLifecycleProvider({ consecutiveReadyPasses: 1 }),
      wireProvider: false,
      signals: [],
      exit: () => {},
    })
    app.get('/api/ping', (_req, res) => res.json({ ok: true }))

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    lifecycle.markReady()

    const base = `http://127.0.0.1:${portOf(server)}`
    const live = await fetch(`${base}/health/live`)
    expect(live.status).toBe(200)
    expect(await live.json()).toMatchObject({ status: 'live' })

    const ready = await fetch(`${base}/health/ready`)
    expect(ready.status).toBe(200)
    expect(await ready.json()).toMatchObject({ status: 'ready', state: 'ready' })
    expect(ready.headers.get('cache-control')).toBe('no-store')
  })

  it('reports not_ready while critical checks fail', async () => {
    const app = express()
    const lifecycle = installExpressLifecycle({
      app,
      provider: createProcessLifecycleProvider(),
      wireProvider: false,
      signals: [],
      exit: () => {},
    })
    lifecycle.provider.registerReadinessCheck({ name: 'db', check: () => false })
    lifecycle.markReady()

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')

    const ready = await fetch(`http://127.0.0.1:${portOf(server)}/health/ready`)
    expect(ready.status).toBe(503)
    expect(await ready.json()).toMatchObject({ status: 'not_ready', state: 'ready' })
  })

  it('flips /health/ready to 503 while draining, keeps /health/live at 200, and sends Connection: close', async () => {
    const app = express()
    const lifecycle = installExpressLifecycle({
      app,
      provider: createProcessLifecycleProvider(),
      wireProvider: false,
      signals: [],
      exit: () => {},
    })
    lifecycle.markReady()

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    const port = portOf(server)

    lifecycle.provider.startDraining('SIGTERM')

    const ready = await fetch(`http://127.0.0.1:${port}/health/ready`)
    expect(ready.status).toBe(503)
    expect(await ready.json()).toMatchObject({ status: 'draining', state: 'draining' })

    const live = await fetch(`http://127.0.0.1:${port}/health/live`)
    expect(live.status).toBe(200)

    // `Connection` is a hop-by-hop header: read it from a raw http response,
    // where Node does not let the client's undici layer consume it.
    const connection = await new Promise<string | undefined>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/health/ready' }, (res) => {
          res.resume()
          resolve(res.headers.connection)
        })
        .on('error', reject)
    })
    expect(connection).toBe('close')
  })

  it('keeps /health/ready at 503 while the boot warm-up runs and reports warm: false', async () => {
    const app = express()
    let release: () => void = () => {}
    const warmupWork = new Promise<void>((resolve) => {
      release = resolve
    })
    const provider = createProcessLifecycleProvider()
    provider.registerWarmupStep({ name: 'module-graph', run: () => warmupWork })
    const lifecycle = installExpressLifecycle({
      app,
      provider,
      wireProvider: false,
      signals: [],
      exit: () => {},
    })

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    lifecycle.markReady()

    const base = `http://127.0.0.1:${portOf(server)}`
    const warming = await fetch(`${base}/health/ready`)
    expect(warming.status).toBe(503)
    expect(await warming.json()).toMatchObject({ status: 'not_ready', warm: false })

    release()
    await provider.runWarmup()
    // First passing probe after the warm-up: still 503.
    expect((await fetch(`${base}/health/ready`)).status).toBe(503)
    // Second consecutive pass: routable.
    const ready = await fetch(`${base}/health/ready`)
    expect(ready.status).toBe(200)
    expect(await ready.json()).toMatchObject({ status: 'ready', warm: true })
  })

  it('createDrainHeaderMiddleware marks every response Connection: close while draining', async () => {
    const provider = createProcessLifecycleProvider()
    const app = express()
    app.use(createDrainHeaderMiddleware(provider))
    app.get('/api/ping', (_req, res) => res.json({ ok: true }))

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    const port = portOf(server)

    const serving = await new Promise<string | undefined>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/api/ping' }, (res) => {
          res.resume()
          resolve(res.headers.connection)
        })
        .on('error', reject)
    })
    expect(serving).not.toBe('close')

    provider.startDraining('SIGTERM')

    const draining = await new Promise<string | undefined>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/api/ping' }, (res) => {
          res.resume()
          resolve(res.headers.connection)
        })
        .on('error', reject)
    })
    expect(draining).toBe('close')
  })

  it('mountLifecycleRoutes is callable on its own', async () => {
    const app = express()
    const provider = createProcessLifecycleProvider({ consecutiveReadyPasses: 1 })
    provider.markReady()
    mountLifecycleRoutes(app, provider)

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')

    const response = await fetch(`http://127.0.0.1:${portOf(server)}/health/ready`)
    expect(response.status).toBe(200)
  })
})

describe('request tracking', () => {
  it('counts a request for its whole lifetime', async () => {
    const app = express()
    const lifecycle = installExpressLifecycle({
      app,
      provider: createProcessLifecycleProvider(),
      wireProvider: false,
      signals: [],
      exit: () => {},
    })
    lifecycle.markReady()
    app.get('/slow', async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      res.json({ ok: true })
    })

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')

    const pending = fetch(`http://127.0.0.1:${portOf(server)}/slow`)
    await waitFor(() => lifecycle.provider.inFlightRequests() === 1)

    const ready = await fetch(`http://127.0.0.1:${portOf(server)}/health/ready`)
    expect(await ready.json()).toMatchObject({ inFlightRequests: 1 })

    expect((await pending).status).toBe(200)
    await waitFor(() => lifecycle.provider.inFlightRequests() === 0)
  })
})

describe('graceful shutdown', () => {
  it('drains an in-flight request to 200, then exits 0', async () => {
    const app = express()
    const exits: number[] = []
    const lifecycle = installExpressLifecycle({
      app,
      provider: createProcessLifecycleProvider(),
      wireProvider: false,
      signals: [],
      flipWaitMs: 0,
      drainTimeoutMs: 5_000,
      exit: (code) => exits.push(code),
    })
    lifecycle.markReady()
    app.get('/slow', async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 250))
      res.json({ ok: true })
    })

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    const port = portOf(server)
    lifecycle.attachServer(server)

    const slow = fetch(`http://127.0.0.1:${port}/slow`)
    await waitFor(() => lifecycle.provider.inFlightRequests() === 1)

    await lifecycle.stop('SIGTERM')

    expect((await slow).status).toBe(200)
    expect(exits).toEqual([0])
    expect(lifecycle.provider.state()).toBe('stopped')

    // A request that arrives after `server.close()` is refused (the listener
    // is gone) — the other allowed outcome is a response told to close.
    let newRequest: 'refused' | 'connection-close' = 'refused'
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`)
      if (response.headers.get('connection') === 'close') newRequest = 'connection-close'
    } catch (_error) {
      // ECONNREFUSED: the listener is closed, which is the expected refusal.
    }
    expect(newRequest).toBe('refused')
  })

  it('force-exits 1 on a second signal instead of throwing', async () => {
    const app = express()
    const exits: number[] = []
    const lifecycle = installExpressLifecycle({
      app,
      provider: createProcessLifecycleProvider(),
      wireProvider: false,
      signals: [],
      flipWaitMs: 0,
      drainTimeoutMs: 100,
      exit: (code) => exits.push(code),
    })
    lifecycle.markReady()

    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    lifecycle.attachServer(server)

    // Hold the drain open with a request that never finishes before the timeout.
    app.get('/stuck', () => {})
    const stuck = fetch(`http://127.0.0.1:${portOf(server)}/stuck`).catch(() => undefined)
    await waitFor(() => lifecycle.provider.inFlightRequests() === 1)

    const first = lifecycle.stop('SIGTERM')
    await lifecycle.stop('SIGTERM')

    expect(exits[0]).toBe(1)
    await first
    await stuck
  })
})
