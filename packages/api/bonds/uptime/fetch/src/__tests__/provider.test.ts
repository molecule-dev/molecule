import type { Server } from 'node:http'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

/** A loopback HTTP server the probe treats as "the site under test". */
const servers: Server[] = []

async function listen(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<string> {
  const server = http.createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterAll(() => {
  for (const s of servers) s.close()
})

// The provider REFUSES loopback by default (verified public dialing), so the
// dialing tests below run with allowPrivateTargets — the private-target
// REFUSALS are tested separately at the end.
const provider = createProvider({ allowPrivateTargets: true })

describe('api-uptime-fetch probe', () => {
  it('200 with matching body is operational, with latency and headers', async () => {
    const base = await listen((req, res) => {
      expect(req.headers['user-agent']).toContain('molecule-uptime-probe')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
    })
    const r = await provider.probe({ url: base + '/health', expectText: '"ok"' })
    expect(r.status).toBe('operational')
    expect(r.url).toBe(base + '/health')
    expect(r.method).toBe('GET')
    expect(r.httpStatus).toBe(200)
    expect(r.expectTextMatched).toBe(true)
    expect(r.latencyMs).toBeGreaterThanOrEqual(0)
    expect(r.headers['content-type']).toBe('application/json')
    expect(r.bodyBytesRead).toBe(11)
    expect(r.message).toBeUndefined()
  })

  it('a down site resolves (not rejects) with the verdict', async () => {
    const base = await listen((req, res) => {
      res.writeHead(503)
      res.end('overloaded')
    })
    const r = await provider.probe({ url: base })
    expect(r.status).toBe('down')
    expect(r.message).toBe('HTTP 503.')
    expect(r.httpStatus).toBe(503)
  })

  it('a connection refusal is down with the OS code', async () => {
    // Port 1 on loopback: nothing listens there.
    const r = await provider.probe({ url: 'http://127.0.0.1:1/' })
    expect(r.status).toBe('down')
    expect(r.message).toBe('ECONNREFUSED')
  })

  it('a slow operational probe degrades', async () => {
    const base = await listen((req, res) => {
      setTimeout(() => {
        res.writeHead(200)
        res.end('late')
      }, 80)
    })
    const r = await provider.probe({ url: base, degradedLatencyMs: 10 })
    expect(r.status).toBe('degraded')
    expect(r.message).toContain('degraded threshold 10ms')
  })

  it('expectText missing from the body is down even on a 200', async () => {
    const base = await listen((req, res) => {
      res.writeHead(200)
      res.end('<html>error shell</html>')
    })
    const r = await provider.probe({ url: base, expectText: '"ok"' })
    expect(r.status).toBe('down')
    expect(r.expectTextMatched).toBe(false)
    expect(r.message).toContain('not found')
  })

  it('HEAD works and carries no expectText', async () => {
    const base = await listen((req, res) => {
      expect(req.method).toBe('HEAD')
      res.writeHead(200)
      res.end()
    })
    const r = await provider.probe({ url: base, method: 'HEAD' })
    expect(r.status).toBe('operational')
    expect(r.bodyBytesRead).toBe(0)
  })

  it('follows redirects, counts them and reports the final URL', async () => {
    const target = await listen((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('arrived')
    })
    const hop = await listen((req, res) => {
      res.writeHead(302, { location: `${target}/final?q=1` })
      res.end()
    })
    const r = await provider.probe({ url: hop, expectText: 'arrived' })
    expect(r.status).toBe('operational')
    expect(r.redirects).toBe(1)
    expect(r.finalUrl).toBe(`${target}/final?q=1`)
    expect(r.httpStatus).toBe(200)
  })

  it('refuses a redirect hop that resolves to a non-public address', async () => {
    // Injected resolver: the FIRST host resolves to the loopback address the
    // test server really listens on (as if a public name pointed there —
    // test-only), and the redirect's metadata host refuses. Verification is
    // ON (the default), so every hop must pass the same dial decision.
    const target = await listen((req, res) => {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' })
      res.end()
    })
    const perHop = createProvider({
      resolve: async (hostname) =>
        hostname === new URL(target).hostname ? { address: '127.0.0.1', family: 4 } : null,
    })
    const r = await perHop.probe({ url: target })
    expect(r.status).toBe('down')
    expect(r.message).toContain('does not resolve to a public address')
    expect(r.redirects).toBe(1)
    expect(r.finalUrl).toBe('http://169.254.169.254/latest/meta-data/')
  })

  it('a redirect past the cap ends the chain and degrades on the 3xx', async () => {
    const base = await listen((req, res) => {
      // Always redirect to itself — an endless chain.
      res.writeHead(302, { location: '/again' })
      res.end()
    })
    const r = await provider.probe({ url: base + '/start' })
    expect(r.redirects).toBe(3)
    expect(r.httpStatus).toBe(302)
    expect(r.status).toBe('degraded')
    expect(r.finalUrl).toBe(base + '/again')
  })

  it('times out as down within the spec budget', async () => {
    const base = await listen((_req, _res) => {
      // Never answer.
    })
    const r = await provider.probe({ url: base, timeoutMs: 1000 })
    expect(r.status).toBe('down')
    expect(r.message).toBe('Timed out after 1000ms.')
  })

  it('a huge response body is capped, not read whole', async () => {
    const base = await listen((req, res) => {
      res.writeHead(200)
      // 4 MB — past the 1 MB cap.
      res.end('x'.repeat(4 * 1024 * 1024))
    })
    const r = await provider.probe({ url: base, expectText: 'needle' })
    expect(r.status).toBe('down')
    expect(r.bodyBytesRead).toBe(1_000_000)
    expect(r.expectTextMatched).toBe(false)
  })

  it('an invalid spec throws locally (never dials)', async () => {
    await expect(provider.probe({ url: 'ftp://example.com' })).rejects.toThrow('http(s)')
    await expect(
      provider.probe({ url: 'https://a.com', method: 'HEAD', expectText: 'x' }),
    ).rejects.toThrow('HEAD')
  })
})

describe('api-uptime-fetch verified dialing (the default provider)', () => {
  it('refuses a loopback target instead of dialing it', async () => {
    const strict = createProvider()
    const base = await listen((req, res) => {
      res.writeHead(200)
      res.end('should never be probed')
    })
    const r = await strict.probe({ url: base })
    expect(r.status).toBe('down')
    expect(r.message).toContain('does not resolve to a public address')
  })
})
