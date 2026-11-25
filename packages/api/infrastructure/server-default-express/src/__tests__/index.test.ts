import { execFileSync } from 'node:child_process'
import { once } from 'node:events'
import http from 'node:http'
import https from 'node:https'
import type * as NodeModule from 'node:module'
import type { AddressInfo } from 'node:net'
import net from 'node:net'

import type express from 'express'
import expressLib from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/api-bond'
import { getProvider } from '@molecule/api-process-lifecycle'
import type { RealtimeProvider } from '@molecule/api-realtime'
import { setProvider as setRealtimeProvider } from '@molecule/api-realtime'

import {
  classifyTaggedError,
  createServerFactory,
  errorMiddleware,
  registerServerCreatedHook,
  securityHeadersMiddleware,
} from '../index.js'

/**
 * What `createRequire(…)('pem')` yields in these tests — swapped per test so the
 * HTTPS path is exercised whether or not `pem` is installed in node_modules.
 */
const pemLoader = vi.hoisted(() => ({ load: (): unknown => undefined }))

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeModule>()
  return {
    ...actual,
    createRequire: (from: string | URL) => {
      const real = actual.createRequire(from)
      return Object.assign((id: string) => (id === 'pem' ? pemLoader.load() : real(id)), real)
    },
  }
})

/** Minimal Express `res` test double that records what the handler wrote. */
function makeRes() {
  const res = {
    headersSent: false,
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    send(payload: unknown) {
      this.sent = payload
      return this
    },
  }
  return res
}

describe('@molecule/api-server-default-express', () => {
  it('exports createServerFactory', () => {
    expect(typeof createServerFactory).toBe('function')
  })

  it('createServerFactory returns a function', () => {
    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      getRouter: async () => ({ router: {} as never }),
    })
    expect(typeof create).toBe('function')
  })
})

describe('securityHeadersMiddleware (L1-1 — browser-security baseline)', () => {
  /** `res` double that records every `setHeader` so we can assert the baseline. */
  function makeHeaderRes() {
    const headers: Record<string, string> = {}
    return {
      headers,
      setHeader(name: string, value: string) {
        headers[name] = value
      },
    }
  }

  it('sets the anti-clickjacking + nosniff + referrer baseline on every response', () => {
    const res = makeHeaderRes()
    const next = vi.fn()

    securityHeadersMiddleware(
      {} as express.Request,
      res as unknown as express.Response,
      next as unknown as express.NextFunction,
    )

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff')
    expect(res.headers['X-Frame-Options']).toBe('DENY')
    expect(res.headers['Content-Security-Policy']).toBe("frame-ancestors 'none'")
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(res.headers['X-XSS-Protection']).toBe('0')
    expect(next).toHaveBeenCalledOnce()
  })

  it('gates HSTS to production so local plain-HTTP dev is not force-upgraded', () => {
    const prev = process.env.NODE_ENV

    process.env.NODE_ENV = 'development'
    const devRes = makeHeaderRes()
    securityHeadersMiddleware(
      {} as express.Request,
      devRes as unknown as express.Response,
      vi.fn() as unknown as express.NextFunction,
    )
    expect(devRes.headers['Strict-Transport-Security']).toBeUndefined()

    process.env.NODE_ENV = 'production'
    const prodRes = makeHeaderRes()
    securityHeadersMiddleware(
      {} as express.Request,
      prodRes as unknown as express.Response,
      vi.fn() as unknown as express.NextFunction,
    )
    expect(prodRes.headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    )

    process.env.NODE_ENV = prev
  })
})

describe('createServerFactory server (L1-1 — real /health response carries the headers)', () => {
  const servers: http.Server[] = []

  afterEach(() => {
    for (const s of servers.splice(0)) s.close()
    vi.restoreAllMocks()
  })

  it("a real /health response from the factory's server carries the security headers", async () => {
    // The factory builds an http.Server internally and starts listening on it,
    // but does NOT return it. Spy on http.createServer to capture that exact
    // server so we hit the real listener (not a re-wrapped copy) and can close
    // it afterward — no leaked listener.
    const realCreateServer = http.createServer.bind(http)
    const createSpy = vi
      .spyOn(http, 'createServer')
      .mockImplementation((...args: Parameters<typeof http.createServer>) => {
        const s = realCreateServer(...(args as Parameters<typeof realCreateServer>))
        servers.push(s)
        return s
      })

    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      // Empty router — /health is mounted by the factory itself.
      getRouter: async () => ({ router: expressLib.Router() }),
    })

    // Pass 0 for an ephemeral port; the factory listens on the captured server.
    await create(0)
    expect(createSpy).toHaveBeenCalled()
    const server = servers[0]
    // Wait until the captured server is actually listening, then read its port.
    if (!server.listening) {
      await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    }
    const { port } = server.address() as AddressInfo

    const headers = await new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/health' }, (res) => {
          res.resume()
          res.on('end', () => resolve(res.headers))
        })
        .on('error', reject)
    })

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['content-security-policy']).toBe("frame-ancestors 'none'")
  })

  it('keeps idle keep-alive sockets longer than any client pool in front of it', async () => {
    // Node's server default (5000 ms) equals Node's global-agent idle timeout
    // (5000 ms), so a proxy reusing a pooled socket can be handed one the server
    // is closing in the same instant — the request is lost. The server must let
    // go LAST; a client-side timeout strictly below it closes first, always.
    const realCreateServer = http.createServer.bind(http)
    vi.spyOn(http, 'createServer').mockImplementation(
      (...args: Parameters<typeof http.createServer>) => {
        const s = realCreateServer(...(args as Parameters<typeof realCreateServer>))
        servers.push(s)
        return s
      },
    )
    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      getRouter: async () => ({ router: expressLib.Router() }),
    })
    await create(0)
    const server = servers[0]
    expect(server.keepAliveTimeout).toBeGreaterThan(5000)
    expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout)
  })

  describe('a bonded realtime provider', () => {
    afterEach(() => {
      unbond('realtime')
    })

    it('is attached to the server the API listens on, with no server-created hook', async () => {
      // A provider created with `deferAttach: true` binds nothing until it is given
      // the API's HTTP server. The server attaches whatever realtime provider is
      // bonded, so bond setup needs no server-specific hook.
      const realCreateServer = http.createServer.bind(http)
      vi.spyOn(http, 'createServer').mockImplementation(
        (...args: Parameters<typeof http.createServer>) => {
          const s = realCreateServer(...(args as Parameters<typeof realCreateServer>))
          servers.push(s)
          return s
        },
      )
      const attachHttpServer = vi.fn((server: http.Server) => {
        // Attached before listen(), so a client's first request finds the route.
        expect(server.listening).toBe(false)
      })
      const provider = { attachHttpServer } as Partial<RealtimeProvider>
      const create = createServerFactory({
        setupBonds: async () => {
          setRealtimeProvider(provider as RealtimeProvider)
        },
        runMigrations: async () => {},
        getRouter: async () => ({ router: expressLib.Router() }),
      })

      await create(0)

      expect(attachHttpServer).toHaveBeenCalledTimes(1)
      expect(attachHttpServer).toHaveBeenCalledWith(servers[0])
    })

    it('boots when no realtime provider is bonded', async () => {
      const realCreateServer = http.createServer.bind(http)
      vi.spyOn(http, 'createServer').mockImplementation(
        (...args: Parameters<typeof http.createServer>) => {
          const s = realCreateServer(...(args as Parameters<typeof realCreateServer>))
          servers.push(s)
          return s
        },
      )
      const create = createServerFactory({
        setupBonds: async () => {},
        runMigrations: async () => {},
        getRouter: async () => ({ router: expressLib.Router() }),
      })

      await expect(create(0)).resolves.toBeDefined()
      expect(servers).toHaveLength(1)
    })

    it('boots with a provider that has no HTTP transport to attach', async () => {
      const createServer = http.createServer.bind(http)
      vi.spyOn(http, 'createServer').mockImplementation((...args) => {
        const server = createServer(...args)
        servers.push(server)
        return server
      })
      const create = createServerFactory({
        setupBonds: async () => setRealtimeProvider({} as RealtimeProvider),
        runMigrations: async () => {},
        getRouter: async () => ({ router: expressLib.Router() }),
      })

      await expect(create(0)).resolves.toBeDefined()
    })

    it('leaves attachment of late-bound providers to the caller', async () => {
      const createServer = http.createServer.bind(http)
      vi.spyOn(http, 'createServer').mockImplementation((...args) => {
        const server = createServer(...args)
        servers.push(server)
        return server
      })
      const create = createServerFactory({
        setupBonds: async () => {},
        runMigrations: async () => {},
        getRouter: async () => ({ router: expressLib.Router() }),
      })
      await create(0)
      if (!servers[0].listening) await once(servers[0], 'listening')
      const attachHttpServer = vi.fn()
      setRealtimeProvider({ attachHttpServer } as unknown as RealtimeProvider)
      expect(attachHttpServer).not.toHaveBeenCalled()
    })
  })

  describe('HTTPS mode (optional pem dependency, loaded from ESM)', () => {
    let prevHttps: string | undefined

    beforeEach(() => {
      prevHttps = process.env.HTTPS
      process.env.HTTPS = '1'
    })

    afterEach(() => {
      if (prevHttps === undefined) delete process.env.HTTPS
      else process.env.HTTPS = prevHttps
    })

    const makeCreate = () =>
      createServerFactory({
        setupBonds: async () => {},
        runMigrations: async () => {},
        getRouter: async () => ({ router: expressLib.Router() }),
      })

    it('asks pem for a self-signed certificate', async () => {
      const createCertificate = vi.fn(
        (_options: unknown, callback: (error: Error | null, keys?: unknown) => void) =>
          callback(new Error('openssl unavailable')),
      )
      pemLoader.load = () => ({ createCertificate })
      await expect(makeCreate()(0)).rejects.toThrow('openssl unavailable')
      expect(createCertificate).toHaveBeenCalledWith(
        { days: 1, selfSigned: true },
        expect.any(Function),
      )
    })

    it('explains how to install pem when it is missing', async () => {
      pemLoader.load = () => {
        throw Object.assign(new Error("Cannot find module 'pem'"), { code: 'MODULE_NOT_FOUND' })
      }
      await expect(makeCreate()(0)).rejects.toThrow(/optional dependency `pem`/)
    })

    it('passes the actual HTTPS listener to realtime before listen', async () => {
      pemLoader.load = () => ({
        createCertificate: (
          _options: unknown,
          done: (error: null, keys: { serviceKey: string; certificate: string }) => void,
        ) => done(null, { serviceKey: '', certificate: '' }),
      })
      const attachHttpServer = vi.fn((server: http.Server | https.Server) => {
        expect(server.listening).toBe(false)
      })
      const create = createServerFactory({
        setupBonds: async () =>
          setRealtimeProvider({ attachHttpServer } as unknown as RealtimeProvider),
        runMigrations: async () => {},
        getRouter: async () => ({ router: expressLib.Router() }),
      })
      try {
        const server = await create(0)
        expect(server).toBeInstanceOf(https.Server)
        if (server instanceof https.Server) server.close()
        expect(attachHttpServer).toHaveBeenCalledExactlyOnceWith(server)
      } finally {
        unbond('realtime')
      }
    })
  })
})

describe('optional realtime package loading in Node', () => {
  it.each(['absent', 'broken'])('handles the %s realtime package case', (mode) => {
    const entry = new URL('../server.ts', import.meta.url).href
    const program = `
      import assert from 'node:assert/strict'
      import { registerHooks } from 'node:module'
      import { tmpdir } from 'node:os'
      import { join } from 'node:path'
      import { pathToFileURL } from 'node:url'
      import express from 'express'
      const mode = ${JSON.stringify(mode)}
      const error = Object.assign(
        new Error("Cannot find module '/broken.js' imported by '@molecule/api-realtime'"),
        { code: 'ERR_MODULE_NOT_FOUND' },
      )
      const broken = 'throw ' + 'Object.assign(new Error(' + JSON.stringify(error.message) +
        '), { code: "ERR_MODULE_NOT_FOUND" })'
      let listener
      const hooks = registerHooks({
        resolve(specifier, context, nextResolve) {
          if (specifier !== '@molecule/api-realtime') return nextResolve(specifier, context)
          if (mode === 'broken') {
            return { url: 'data:text/javascript,' + encodeURIComponent(broken), shortCircuit: true }
          }
          return nextResolve(specifier, {
            ...context,
            parentURL: pathToFileURL(join(tmpdir(), 'realtime-absent.mjs')).href,
          })
        },
      })
      try {
        const { createServerFactory, registerServerCreatedHook } = await import(${JSON.stringify(entry)})
        registerServerCreatedHook((server) => { listener = server })
        const create = createServerFactory({
          setupBonds: async () => {},
          runMigrations: async () => {},
          getRouter: async () => ({ router: express.Router() }),
          lifecycle: { disabled: true },
        })
        if (mode === 'broken') await assert.rejects(create(0), error)
        else await create(0)
      } finally {
        listener?.close()
        hooks.deregister()
      }
    `
    expect(() =>
      execFileSync(process.execPath, ['--input-type=module', '--eval', program], {
        cwd: new URL('..', import.meta.url),
        env: { ...process.env, HTTPS: '' },
        encoding: 'utf8',
        timeout: 5_000,
      }),
    ).not.toThrow()
  })
})

describe('classifyTaggedError', () => {
  it('maps a deliberately-tagged config error to its status + errorKey (the missing-key → 503 fix)', () => {
    const err = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    expect(classifyTaggedError(err)).toEqual({
      statusCode: 503,
      errorKey: 'config.notConfigured',
      message: 'STRIPE_SECRET_KEY is not set.',
    })
  })

  it('returns null for a plain Error (→ default 500 path, behavior unchanged)', () => {
    expect(classifyTaggedError(new Error('boom'))).toBeNull()
  })

  it('returns null when statusCode is present but errorKey is absent (so arbitrary library errors are NOT surfaced)', () => {
    // e.g. an AWS SDK error carrying `.statusCode` but no molecule `errorKey`.
    expect(classifyTaggedError(Object.assign(new Error('S3 403'), { statusCode: 403 }))).toBeNull()
  })

  it('returns null for non-object throws (bare strings, etc.)', () => {
    expect(classifyTaggedError('Unauthorized')).toBeNull()
    expect(classifyTaggedError(undefined)).toBeNull()
  })

  it('falls back to "Error" when the tagged error has no string message', () => {
    expect(classifyTaggedError({ statusCode: 503, errorKey: 'config.notConfigured' })).toEqual({
      statusCode: 503,
      errorKey: 'config.notConfigured',
      message: 'Error',
    })
  })
})

describe('errorMiddleware (terminal sanitizing handler — L1-1 stack-leak fix)', () => {
  const req = {} as express.Request

  it('EXPLOIT BLOCKED: an untagged error returns a generic 500 and never calls next() (no finalhandler fallthrough)', () => {
    // Build an error whose stack contains the kind of sensitive recon data that
    // Express's finalhandler would otherwise leak into the response body when
    // NODE_ENV !== 'production'.
    const leaky = new Error('connection to /home/app/db failed')
    leaky.stack =
      'Error: connection to /home/app/db failed\n    at Object.<anonymous> (/home/app/api/src/secret-handler.ts:42:13)'
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware(leaky, req, res as unknown as express.Response, next)

    // Generic, opaque 500 — no stack, no paths, no error message echoed back.
    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({ error: 'Internal Server Error' })
    // The crux of the fix: control must NOT fall through to Express's
    // finalhandler, which is what leaks `err.stack` into the response.
    expect(next).not.toHaveBeenCalled()
    // The response body carries none of the sensitive stack/path detail.
    expect(JSON.stringify(res.body)).not.toContain('/home/app')
    expect(JSON.stringify(res.body)).not.toContain('secret-handler')
  })

  it('LEGIT PRESERVED: a bare "Unauthorized" string still maps to 401', () => {
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware('Unauthorized', req, res as unknown as express.Response, next)

    expect(res.statusCode).toBe(401)
    expect(res.sent).toBe('Unauthorized')
    expect(next).not.toHaveBeenCalled()
  })

  it('LEGIT PRESERVED: the i18n-resolved "Unauthorized." (trailing period) still maps to 401', () => {
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware('Unauthorized.', req, res as unknown as express.Response, next)

    expect(res.statusCode).toBe(401)
    expect(res.sent).toBe('Unauthorized.')
    expect(next).not.toHaveBeenCalled()
  })

  it('LEGIT PRESERVED: a deliberately-tagged molecule error surfaces its real status + errorKey', () => {
    const tagged = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware(tagged, req, res as unknown as express.Response, next)

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({
      error: 'STRIPE_SECRET_KEY is not set.',
      errorKey: 'config.notConfigured',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('does not write twice when headers are already sent', () => {
    const res = makeRes()
    res.headersSent = true
    const next = vi.fn()

    errorMiddleware(new Error('boom'), req, res as unknown as express.Response, next)

    expect(res.statusCode).toBeUndefined()
    expect(res.body).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
  })
})

describe('errorMiddleware error tracking capture (untagged-only skip rules)', () => {
  const trackedReq = { method: 'POST', originalUrl: '/api/orders?draft=true' } as express.Request

  const mockTracker = {
    captureException: vi.fn().mockReturnValue('event-1'),
    captureMessage: vi.fn(),
  }

  beforeEach(async () => {
    mockTracker.captureException.mockClear()
    const { setProvider } = await import('@molecule/api-error-tracking')
    setProvider(mockTracker)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('error-tracking')
  })

  it('CAPTURED: an untagged error reaches the bonded tracker with request context', () => {
    const error = new Error('boom')
    errorMiddleware(error, trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).toHaveBeenCalledWith(error, {
      tags: { source: 'express' },
      request: { method: 'POST', url: '/api/orders?draft=true' },
    })
  })

  it('SKIPPED: a tagged config-missing 503 is NOT captured (expected, user-actionable)', () => {
    const tagged = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    errorMiddleware(tagged, trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  it('SKIPPED: a tagged 4xx is NOT captured', () => {
    const tagged = Object.assign(new Error('Plan limit reached.'), {
      statusCode: 402,
      errorKey: 'billing.limitReached',
    })
    errorMiddleware(tagged, trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  it('SKIPPED: a bare "Unauthorized" string is NOT captured', () => {
    errorMiddleware('Unauthorized', trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  it('never throws out of the terminal handler when no tracker is bonded (no-op contract)', async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('error-tracking')
    const res = makeRes()

    expect(() =>
      errorMiddleware(new Error('boom'), trackedReq, res as unknown as express.Response, vi.fn()),
    ).not.toThrow()
    expect(res.statusCode).toBe(500)
  })
})

describe('process lifecycle wiring (default, no per-app code)', () => {
  /** Ask the OS for a free port, then release it for the server under test. */
  async function freePort(): Promise<number> {
    const probe = net.createServer()
    probe.listen(0)
    await once(probe, 'listening')
    const port = (probe.address() as AddressInfo).port
    await new Promise<void>((resolve) => probe.close(() => resolve()))
    return port
  }

  /** Poll a URL until it answers (the listener callback runs after create() resolves). */
  async function fetchWhenListening(url: string): Promise<Response> {
    const started = Date.now()
    for (;;) {
      try {
        return await fetch(url)
      } catch (error) {
        if (Date.now() - started > 5_000) throw error
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
  }

  afterEach(() => {
    try {
      getProvider().startDraining('test-teardown')
    } catch (_error) {
      // A test that failed before create() never bonded a lifecycle provider.
    }
  })

  it('serves /health/live and /health/ready without any app wiring', async () => {
    let captured: http.Server | undefined
    registerServerCreatedHook((server) => {
      captured = server as http.Server
    })

    const port = await freePort()
    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      getRouter: async () => ({ router: expressLib.Router() }),
      lifecycle: { signals: [], flipWaitMs: 0 },
    })

    await create(port)

    const live = await fetchWhenListening(`http://127.0.0.1:${port}/health/live`)
    expect(live.status).toBe(200)
    expect(await live.json()).toMatchObject({ status: 'live' })

    // Readiness requires two consecutive passing probes (a rolling deploy must
    // not hand a fresh instance all the traffic on its first check).
    const warming = await fetchWhenListening(`http://127.0.0.1:${port}/health/ready`)
    expect(warming.status).toBe(503)
    expect(await warming.json()).toMatchObject({ status: 'not_ready', warm: true })

    const ready = await fetch(`http://127.0.0.1:${port}/health/ready`)
    expect(ready.status).toBe(200)
    expect(await ready.json()).toMatchObject({ status: 'ready', state: 'ready' })

    // Draining is reflected immediately on readiness, while liveness stays up.
    getProvider().startDraining('test')
    const draining = await fetch(`http://127.0.0.1:${port}/health/ready`)
    expect(draining.status).toBe(503)
    expect(await draining.json()).toMatchObject({ status: 'draining' })
    expect((await fetch(`http://127.0.0.1:${port}/health/live`)).status).toBe(200)

    captured?.closeAllConnections?.()
    await new Promise<void>((resolve) => captured?.close(() => resolve()))
  })
})
