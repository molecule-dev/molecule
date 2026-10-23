import { once } from 'node:events'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import net from 'node:net'

import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import {
  createDrainHeaderMiddleware,
  installExpressLifecycle,
  mountLifecycleRoutes,
} from '../express.js'
import { createProcessLifecycleProvider } from '../lifecycle.js'
import { installGracefulShutdown } from '../shutdown.js'

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

describe('configured draining readiness handoff', () => {
  it('preserves both already-active pipelined responses during the unchanged shutdown sequence', async () => {
    const provider = createProcessLifecycleProvider({ consecutiveReadyPasses: 1 })
    const gate = (): { promise: Promise<void>; resolve: () => void } => {
      let resolve!: () => void
      const promise = new Promise<void>((done) => {
        resolve = done
      })
      return { promise, resolve }
    }
    const first = gate(),
      second = gate(),
      bothEntered = gate(),
      firstFinished = gate(),
      secondFinished = gate(),
      hook = gate()
    provider.registerDrainHook({ name: 'checkpoint', run: () => hook.promise })
    const app = express()
    const lifecycle = installExpressLifecycle({ app, provider, signals: [], wireProvider: false })
    let entered = 0
    app.get('/:part', async (req, res) => {
      if (++entered === 2) bothEntered.resolve()
      await (req.params.part === 'one' ? first.promise : second.promise)
      res.once('finish', () =>
        (req.params.part === 'one' ? firstFinished : secondFinished).resolve(),
      )
      res.end(req.params.part)
    })
    const server = app.listen(0)
    await once(server, 'listening')
    const handle = installGracefulShutdown({
      server,
      provider,
      flipWaitMs: 0,
      signals: [],
      exit: () => {},
    })
    const socket = net.connect({ host: '127.0.0.1', port: portOf(server) })
    let raw = ''
    socket.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    const closed = once(socket, 'close')
    let stopping: Promise<void> | undefined
    try {
      await once(socket, 'connect')
      socket.write(
        'GET /one HTTP/1.1\r\nHost: local\r\n\r\nGET /two HTTP/1.1\r\nHost: local\r\n\r\n',
      )
      await bothEntered.promise
      stopping = handle.stop()
      first.resolve()
      await firstFinished.promise
      expect(socket.destroyed).toBe(false)
      second.resolve()
      await secondFinished.promise
      hook.resolve()
      await stopping
      await closed
      expect(raw.match(/HTTP\/1\.1 200 OK/g)).toHaveLength(2)
      expect(raw).toContain('one')
      expect(raw).toContain('two')
    } finally {
      first.resolve()
      second.resolve()
      hook.resolve()
      await stopping
      socket.destroy()
      handle.uninstall()
      lifecycle.uninstall()
      server.closeAllConnections()
      if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('adds handoff headers only to already-refused readiness, without executing an application route', async () => {
    const app = express()
    const provider = createProcessLifecycleProvider({ consecutiveReadyPasses: 1 })
    let handoffs = 0
    let operations = 0
    installExpressLifecycle({
      app,
      provider,
      wireProvider: false,
      signals: [],
      drainingResponseHeaders: () => {
        handoffs++
        return { 'Fly-Replay': 'elsewhere=true', Connection: 'keep-alive' }
      },
    })
    app.get('/operation', (_req, res) => {
      operations++
      res.json({ ok: true })
    })
    const server = app.listen(0)
    openServers.push(server)
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + portOf(server)
    // A starting process is genuinely unready and must not be replayed as ready.
    const starting = await fetch(base + '/health/ready')
    expect(starting.status).toBe(503)
    expect(starting.headers.get('fly-replay')).toBeNull()
    provider.markReady()
    const ready = await fetch(base + '/health/ready')
    expect(ready.status).toBe(200)
    expect(ready.headers.get('fly-replay')).toBeNull()
    provider.registerReadinessCheck({ name: 'db', check: () => false })
    const failed = await fetch(base + '/health/ready')
    expect(failed.status).toBe(503)
    expect(failed.headers.get('fly-replay')).toBeNull()
    expect(handoffs).toBe(0)
    provider.startDraining()
    const direct = await fetch(base + '/health/ready')
    expect(direct.status).toBe(503)
    expect(await direct.json()).toMatchObject({ status: 'draining' })
    expect(direct.headers.get('fly-replay')).toBe('elsewhere=true')
    expect(direct.headers.get('connection')).toBe('close')
    expect(handoffs).toBe(1)
    const live = await fetch(base + '/health/live')
    expect(live.status).toBe(200)
    expect(live.headers.get('fly-replay')).toBeNull()
    const operation = await fetch(base + '/operation')
    expect(operation.status).toBe(200)
    expect(operation.headers.get('fly-replay')).toBeNull()
    expect(operations).toBe(1)
    expect(handoffs).toBe(1)
  })
})

describe('draining readiness through a routing proxy (local contract fixture)', () => {
  it.each([false, true])(
    'hands off a refused read after a pooled response (busy: %s)',
    async (busy) => {
      const oldProvider = createProcessLifecycleProvider({ consecutiveReadyPasses: 1 })
      const nextProvider = createProcessLifecycleProvider({ consecutiveReadyPasses: 1 })
      oldProvider.markReady()
      nextProvider.markReady()
      const old = express()
      const next = express()
      let release!: () => void
      let entered!: () => void
      const activeEntered = new Promise<void>((resolve) => {
        entered = resolve
      })
      const activeRelease = new Promise<void>((resolve) => {
        release = resolve
      })
      let operations = 0
      let replays = 0
      const headers = (request: express.Request): Readonly<Record<string, string>> | undefined =>
        request.headers['fly-replay-src'] === undefined
          ? { 'Fly-Replay': 'elsewhere=true' }
          : undefined
      old.use(createDrainHeaderMiddleware(oldProvider))
      next.use(createDrainHeaderMiddleware(nextProvider))
      mountLifecycleRoutes(old, oldProvider, { drainingResponseHeaders: headers })
      mountLifecycleRoutes(next, nextProvider, { drainingResponseHeaders: headers })
      old.get('/active', async (_req, res) => {
        entered()
        await activeRelease
        res.end('active-intact')
      })
      old.get('/operation', (_req, res) => {
        operations++
        res.end('operation')
      })
      const source = old.listen(0)
      const sibling = next.listen(0)
      const proxy = http.createServer()
      const backend = new http.Agent({ keepAlive: true, maxSockets: 1 })
      const call = (port: number, path: string) =>
        new Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }>(
          (resolve, reject) => {
            http
              .get({ host: '127.0.0.1', port, path, agent: false }, (response) => {
                const chunks: Buffer[] = []
                response.on('data', (chunk: Buffer) => chunks.push(chunk))
                response.once('end', () =>
                  resolve({
                    status: response.statusCode!,
                    body: Buffer.concat(chunks).toString(),
                    headers: response.headers,
                  }),
                )
              })
              .once('error', reject)
          },
        )
      try {
        await Promise.all([once(source, 'listening'), once(sibling, 'listening')])
        proxy.on('request', (request, response) => {
          // This fixture consumes exactly the documented response directive. It
          // is not evidence that the real Fly edge has run or succeeded.
          const forward = (replayed: boolean): void => {
            http
              .get(
                {
                  host: '127.0.0.1',
                  port: portOf(replayed ? sibling : source),
                  path: request.url,
                  headers: replayed ? { 'fly-replay-src': 'instance=source' } : {},
                  agent: replayed ? false : backend,
                },
                (upstream) => {
                  if (upstream.headers['fly-replay'] === 'elsewhere=true' && !replayed) {
                    expect(upstream.statusCode).toBe(503)
                    replays++
                    upstream.resume()
                    upstream.once('end', () => forward(true))
                    return
                  }
                  response.writeHead(upstream.statusCode!, { 'content-type': 'application/json' })
                  upstream.pipe(response)
                },
              )
              .once('error', (error) => {
                response.statusCode = 502
                response.end(error.message)
              })
          }
          forward(false)
        })
        proxy.listen(0)
        await once(proxy, 'listening')
        expect((await call(portOf(proxy), '/health/ready?request=preserved')).status).toBe(200)
        const active = busy ? call(portOf(proxy), '/active') : undefined
        if (busy) await activeEntered
        oldProvider.startDraining()
        release()
        if (active) expect((await active).body).toBe('active-intact')
        const direct = await call(portOf(source), '/health/ready')
        expect(direct.status).toBe(503)
        expect(JSON.parse(direct.body)).toMatchObject({ status: 'draining' })
        const throughProxy = await call(portOf(proxy), '/health/ready?request=preserved')
        expect(throughProxy.status).toBe(200)
        expect(JSON.parse(throughProxy.body)).toMatchObject({ status: 'ready' })
        expect(replays).toBe(1)
        expect(operations).toBe(0)
        // Liveness and ordinary application handlers acquire no replay header.
        expect((await call(portOf(proxy), '/health/live')).status).toBe(200)
        expect((await call(portOf(proxy), '/operation')).body).toBe('operation')
        expect(operations).toBe(1)
        expect(replays).toBe(1)
        // An unavailable sibling remains a failure, not a replay loop or green.
        nextProvider.startDraining()
        expect((await call(portOf(proxy), '/health/ready')).status).toBe(503)
        expect(replays).toBe(2)
      } finally {
        release()
        backend.destroy()
        await Promise.all(
          [proxy, source, sibling].map(async (server) => {
            server.closeAllConnections()
            if (server.listening)
              await new Promise<void>((resolve) => server.close(() => resolve()))
          }),
        )
      }
    },
  )
})
