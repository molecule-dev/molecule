/**
 * A real local implementation of the egress relay protocol (molecule-dev
 * `api/src/sandbox/egress-relay.ts`) plus an upstream server, so the client is tested against
 * the wire protocol rather than mocks of itself.
 *
 * Deliberate difference from the platform relay: any upstream port is dialed (the test upstream
 * listens on an ephemeral port); the platform allows only 80 and 443.
 *
 * @module
 */

import http from 'node:http'
import type { AddressInfo } from 'node:net'

/** The credential the test relay accepts. */
export const TEST_CREDENTIAL = 'proj-1:mac-123'
/** Host the test policy denies (403). */
export const BLOCKED_HOST = 'blocked.example'
/** Host that answers as if too many requests were in flight (429). */
export const BUSY_HOST = 'busy.example'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])
const NEVER_FORWARD_REQUEST = new Set([
  ...HOP_BY_HOP,
  'host',
  'content-length',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
])
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])

/** What the relay received, for assertions. */
export interface RelayCall {
  authorization: string | undefined
  body: unknown
}

/** A running relay + upstream pair. */
export interface TestServers {
  relayUrl: string
  upstream: string
  /** The same upstream on another origin (a second port). */
  upstreamOther: string
  calls: RelayCall[]
  close: () => Promise<void>
}

/**
 * Denial text in the platform's words (egress-policy.ts `denialMessage`).
 *
 * @param host - Denied host.
 * @param port - Denied port.
 * @returns The message.
 */
export function denialMessage(host: string, port: number): string {
  return (
    `Blocked by molecule egress policy: ${host}:${port} is not on this project's ` +
    `network allowlist. Do not retry or work around this.`
  )
}

const readBody = (req: http.IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

const listen = async (server: http.Server): Promise<number> => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as AddressInfo).port
}

/** The upstream: echo, binary, status, redirect, slow. */
function upstreamHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
  void readBody(req).then((body) => {
    const url = new URL(req.url ?? '/', 'http://upstream')
    const path = url.pathname
    if (path === '/echo') {
      res.setHeader('content-type', 'application/json')
      res.setHeader('x-up', 'yes')
      res.setHeader('set-cookie', 'session=secret')
      res.end(
        JSON.stringify({
          method: req.method,
          path: `${url.pathname}${url.search}`,
          headers: req.headers,
          body: body.toString('utf8'),
          bodyBase64: body.toString('base64'),
        }),
      )
      return
    }
    if (path === '/binary') {
      res.setHeader('content-type', 'application/octet-stream')
      res.end(Buffer.from(Array.from({ length: 256 }, (_, i) => i)))
      return
    }
    if (path.startsWith('/status/')) {
      const status = Number(path.slice('/status/'.length))
      res.statusCode = status
      res.setHeader('content-type', 'text/plain')
      res.end(status === 204 || status === 304 ? undefined : `status ${status}`)
      return
    }
    if (path === '/redirect') {
      res.statusCode = Number(url.searchParams.get('status') ?? 302)
      res.setHeader('location', url.searchParams.get('to') ?? '/echo')
      res.end('moved')
      return
    }
    if (path === '/no-location') {
      res.statusCode = 302
      res.end('no location')
      return
    }
    if (path === '/loop') {
      res.statusCode = 302
      res.setHeader('location', '/loop')
      res.end()
      return
    }
    if (path === '/slow') {
      setTimeout(() => res.end('late'), 1000)
      return
    }
    res.statusCode = 404
    res.end('not found')
  })
}

/**
 * Start a relay and an upstream.
 *
 * @returns The servers' URLs, the recorded relay calls, and `close`.
 */
export async function startTestServers(): Promise<TestServers> {
  const calls: RelayCall[] = []
  const upstreamServer = http.createServer(upstreamHandler)
  const upstreamPort = await listen(upstreamServer)
  const otherServer = http.createServer(upstreamHandler)
  const otherPort = await listen(otherServer)
  const expectedAuth = `Basic ${Buffer.from(TEST_CREDENTIAL).toString('base64')}`

  const relayServer = http.createServer((req, res) => {
    void (async () => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Expose-Headers', '*')
      if (req.url !== '/api/egress-relay' || req.method !== 'POST') {
        res.statusCode = 404
        res.end('Not Found')
        return
      }
      const fail = (status: number, message: string): void => {
        res.setHeader('X-Relay-Error', '1')
        res.setHeader('content-type', 'application/json')
        res.statusCode = status
        res.end(JSON.stringify({ error: message }))
      }
      const raw = await readBody(req)
      let input: Record<string, unknown> | undefined
      if (String(req.headers['content-type']).startsWith('application/json')) {
        try {
          input = JSON.parse(raw.toString('utf8')) as Record<string, unknown>
        } catch (_error) {
          // Intentionally ignored: the platform answers an unparseable body with 400.
          fail(400, 'The request body is not valid.')
          return
        }
      }
      calls.push({ authorization: req.headers.authorization, body: input })
      if (typeof input !== 'object' || input === null) {
        fail(400, 'The body must be a JSON object.')
        return
      }
      if (typeof input.url !== 'string') return fail(400, 'url is required.')
      let url: URL
      try {
        url = new URL(input.url)
      } catch (_error) {
        // Intentionally ignored: reported as a 400, as the platform does.
        return fail(400, 'url is not a valid URL.')
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return fail(400, 'Only http and https URLs can be relayed.')
      }
      const method = String(input.method ?? 'GET').toUpperCase()
      if (!ALLOWED_METHODS.has(method)) return fail(400, `The ${method} method cannot be relayed.`)
      const headers: Record<string, string> = {}
      for (const [name, value] of Object.entries(
        (input.headers ?? {}) as Record<string, unknown>,
      )) {
        if (typeof value !== 'string') return fail(400, 'headers must be an object of strings.')
        if (!NEVER_FORWARD_REQUEST.has(name.toLowerCase())) headers[name] = value
      }
      let payload: Buffer | null = null
      if (input.bodyBase64 !== undefined) {
        payload = Buffer.from(String(input.bodyBase64), 'base64')
        if (method === 'GET' || method === 'HEAD') {
          return fail(400, `A ${method} request cannot carry a body.`)
        }
      }
      if (req.headers.authorization !== expectedAuth) {
        return fail(401, 'A valid egress credential is required.')
      }
      const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80
      if (url.hostname === BLOCKED_HOST) return fail(403, denialMessage(url.hostname, port))
      if (url.hostname === BUSY_HOST) {
        return fail(429, 'Too many relayed requests are in flight for this project.')
      }
      const outgoing: Record<string, string> = { ...headers }
      if (payload) outgoing['content-length'] = String(payload.length)
      const upstream = await new Promise<{
        status: number
        headers: http.IncomingHttpHeaders
        body: Buffer
      } | null>((resolve) => {
        const request = http.request(
          {
            hostname: url.hostname,
            port,
            path: `${url.pathname}${url.search}`,
            method,
            headers: outgoing,
          },
          (upRes) => {
            void readBody(upRes).then((body) =>
              resolve({ status: upRes.statusCode ?? 502, headers: upRes.headers, body }),
            )
          },
        )
        request.on('error', () => resolve(null))
        if (payload) request.write(payload)
        request.end()
      })
      if (!upstream) return fail(502, 'The upstream could not be reached.')
      for (const [name, value] of Object.entries(upstream.headers)) {
        const lower = name.toLowerCase()
        if (
          value === undefined ||
          HOP_BY_HOP.has(lower) ||
          lower === 'set-cookie' ||
          lower === 'content-length'
        )
          continue
        res.setHeader(name, value)
      }
      res.setHeader('Content-Length', String(upstream.body.length))
      res.setHeader('X-Relay-Status', String(upstream.status))
      res.statusCode = 200
      res.end(method === 'HEAD' ? undefined : upstream.body)
    })()
  })
  const relayPort = await listen(relayServer)

  return {
    relayUrl: `http://127.0.0.1:${relayPort}/api/egress-relay`,
    upstream: `http://127.0.0.1:${upstreamPort}`,
    upstreamOther: `http://127.0.0.1:${otherPort}`,
    calls,
    close: async () => {
      relayServer.closeAllConnections()
      upstreamServer.closeAllConnections()
      otherServer.closeAllConnections()
      await Promise.all([
        new Promise<void>((resolve) => relayServer.close(() => resolve())),
        new Promise<void>((resolve) => upstreamServer.close(() => resolve())),
        new Promise<void>((resolve) => otherServer.close(() => resolve())),
      ])
    },
  }
}
