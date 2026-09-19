/**
 * Contract tests for the HTTP analytics provider: a real local HTTP server
 * captures the POSTs. Asserts the wire shape, the no-op-without-url posture,
 * and the never-throws guarantee.
 */
import { createServer, type Server } from 'node:http'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHttpAnalyticsProvider } from '../index.js'

describe('createHttpAnalyticsProvider', () => {
  let server: Server
  let received: Array<Record<string, unknown>>
  let url: string

  beforeEach(async () => {
    received = []
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        received.push(JSON.parse(body))
        res.writeHead(204)
        res.end()
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}/ingest`
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('POSTs track events in the documented wire shape', async () => {
    const provider = createHttpAnalyticsProvider({ url, source: 'mlcl' })
    await provider.track({
      name: 'cli.command',
      properties: { command: 'search' },
      anonymousId: 'anon-1',
    })
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      kind: 'track',
      source: 'mlcl',
      event: { name: 'cli.command', properties: { command: 'search' }, anonymousId: 'anon-1' },
    })
    expect(typeof received[0].sentAt).toBe('string')
  })

  it('no-ops when no url is configured (option or env)', async () => {
    const previous = process.env.MOLECULE_ANALYTICS_URL
    delete process.env.MOLECULE_ANALYTICS_URL
    const provider = createHttpAnalyticsProvider({})
    await provider.track({ name: 'x' })
    expect(received).toHaveLength(0)
    process.env.MOLECULE_ANALYTICS_URL = previous
  })

  it('honors MOLECULE_ANALYTICS_URL when the option is absent', async () => {
    process.env.MOLECULE_ANALYTICS_URL = url
    const provider = createHttpAnalyticsProvider({ source: 'molecule-mcp' })
    await provider.track({ name: 'mcp.tool_call' })
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ source: 'molecule-mcp', kind: 'track' })
    delete process.env.MOLECULE_ANALYTICS_URL
  })

  it('never throws on a dead endpoint — surfaces to onError instead', async () => {
    const onError = vi.fn()
    const provider = createHttpAnalyticsProvider({
      url: 'http://127.0.0.1:1/nope',
      onError,
      timeoutMs: 500,
    })
    await expect(provider.track({ name: 'x' })).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalled()
  })

  it('carries identify/page/group with their kinds', async () => {
    const provider = createHttpAnalyticsProvider({ url, source: 't' })
    await provider.identify({ userId: 'u1' })
    await provider.page({ name: 'home', path: '/' })
    await provider.group?.('org1')
    expect(received.map((r) => r.kind)).toEqual(['identify', 'page', 'group'])
  })
})
