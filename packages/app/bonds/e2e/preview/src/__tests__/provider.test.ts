/**
 * The driver's connect path against a hub with NO page attached: it fails
 * within the connect timeout naming the cause and the alternative, later
 * connects in the same process fail at once, and a page attaching clears that.
 */
import { createServer, type Server } from 'node:http'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'

import { provider } from '../provider.js'
import { attachE2EHub, type E2EHub } from '../server.js'
import { E2E_WS_PATH } from '../types.js'

const listen = (server: Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })

const timed = async <T>(work: Promise<T>): Promise<{ ms: number; error: Error | null }> => {
  const t0 = Date.now()
  try {
    await work
    return { ms: Date.now() - t0, error: null }
  } catch (error) {
    return { ms: Date.now() - t0, error: error as Error }
  }
}

describe('provider.connect() with no preview page attached', () => {
  let server: Server
  let hub: E2EHub
  let port: number
  let url: string
  const sockets: WebSocket[] = []

  beforeEach(async () => {
    server = createServer((_req, res) => res.end('ok'))
    hub = attachE2EHub(server)
    port = await listen(server)
    url = `ws://127.0.0.1:${port}${E2E_WS_PATH}`
  })
  afterEach(async () => {
    for (const ws of sockets.splice(0)) ws.close()
    hub.close()
    await new Promise((r) => server.close(r))
  })

  it('fails within the connect timeout, names the cause and the playwright alternative, then fails at once', async () => {
    const first = await timed(provider.connect({ url, token: hub.token, connectTimeout: 400 }))
    expect(first.error?.message).toMatch(/No preview page is attached/u)
    expect(first.error?.message).toMatch(/open this project's preview in the molecule\.dev IDE/u)
    expect(first.error?.message).toMatch(/MOL_E2E_PROVIDER=playwright/u)
    expect(first.error?.name).toBe('TimeoutError')
    expect(first.ms).toBeGreaterThanOrEqual(380)
    expect(first.ms).toBeLessThan(2_000)

    // The runner calls connect() once per test: the second one must not wait again.
    const second = await timed(provider.connect({ url, token: hub.token, connectTimeout: 400 }))
    expect(second.error?.message).toMatch(/No preview page is attached/u)
    expect(second.ms).toBeLessThan(150)

    // A page attaching is visible in the hub's list, so the memory is ignored
    // and the connect proceeds (and clears it).
    const page = await new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(`${url}?role=page&id=p1&token=${hub.token}`)
      ws.once('open', () => resolve(ws))
      ws.once('error', reject)
    })
    sockets.push(page)
    page.send(
      JSON.stringify({
        hello: true,
        id: 'p1',
        href: 'http://x/',
        title: 'Home',
        readyState: 'complete',
        hidden: false,
        framed: false,
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    const connected = await provider.connect({ url, token: hub.token, connectTimeout: 400 })
    expect(connected.url()).toBe('http://x/')
    await connected.close()
  })
})
