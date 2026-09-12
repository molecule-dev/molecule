/**
 * The hub protocol with plain `ws` clients: page/driver roles, the loopback +
 * token gate for drivers, command forwarding, and pending-command failure
 * when a page goes away.
 */
import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'

import { attachE2EHub, type E2EHub } from '../server.js'
import { E2E_WS_PATH, tokenFilePath } from '../types.js'

type Dict = Record<string, unknown>

const listen = (server: Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })

const open = (url: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
    ws.once('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)))
  })

const nextMessage = (ws: WebSocket, filter: (m: Dict) => boolean = () => true): Promise<Dict> =>
  new Promise((resolve) => {
    const onMessage = (data: WebSocket.RawData): void => {
      const msg = JSON.parse(String(data)) as Dict
      if (!filter(msg)) return
      ws.off('message', onMessage)
      resolve(msg)
    }
    ws.on('message', onMessage)
  })

describe('attachE2EHub', () => {
  let server: Server
  let hub: E2EHub
  let port: number
  const sockets: WebSocket[] = []

  beforeEach(async () => {
    server = createServer((_req, res) => res.end('ok'))
    hub = attachE2EHub(server)
    port = await listen(server)
  })
  afterEach(async () => {
    for (const ws of sockets.splice(0)) ws.close()
    hub.close()
    await new Promise((r) => server.close(r))
  })

  it('writes its token file once listening', () => {
    const parsed = JSON.parse(readFileSync(tokenFilePath(port), 'utf8')) as {
      token: string
      port: number
    }
    expect(parsed.token).toBe(hub.token)
    expect(parsed.port).toBe(port)
  })

  it('refuses a driver without the token and accepts one with it', async () => {
    await expect(
      open(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=driver&token=wrong`),
    ).rejects.toThrow(/403/)
    const driver = await open(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=driver&token=${hub.token}`)
    sockets.push(driver)
    driver.send(JSON.stringify({ id: '1', op: 'list' }))
    const reply = await nextMessage(driver)
    expect(reply).toMatchObject({ id: '1', ok: true, value: [] })
  })

  it('forwards a driver command to the page and the page reply back, and announces pages', async () => {
    const driver = await open(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=driver&token=${hub.token}`)
    sockets.push(driver)
    const helloSeen = nextMessage(driver, (m) => m.event === 'page-hello')
    const page = await open(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=page&id=p1`)
    sockets.push(page)
    page.send(
      JSON.stringify({
        hello: true,
        id: 'p1',
        href: 'http://x/blog/',
        title: 'Blog',
        readyState: 'complete',
        hidden: false,
        framed: true,
      }),
    )
    expect(await helloSeen).toMatchObject({
      event: 'page-hello',
      pageId: 'p1',
      href: 'http://x/blog/',
      framed: true,
    })
    expect(hub.pages().map((p) => p.id)).toEqual(['p1'])

    const received = nextMessage(page)
    driver.send(JSON.stringify({ id: 'c1', op: 'cmd', cmd: { op: 'evaluate', source: '() => 1' } }))
    const cmd = await received
    expect(cmd).toMatchObject({ id: 'c1', op: 'evaluate', source: '() => 1' })
    const replySeen = nextMessage(driver, (m) => m.id === 'c1')
    page.send(JSON.stringify({ id: 'c1', ok: true, value: 1, href: 'http://x/blog/' }))
    expect(await replySeen).toMatchObject({ id: 'c1', ok: true, value: 1, pageId: 'p1' })
  })

  it('fails a pending command when its page closes, and reports no-page when none is connected', async () => {
    const driver = await open(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=driver&token=${hub.token}`)
    sockets.push(driver)
    driver.send(JSON.stringify({ id: 'n1', op: 'cmd', cmd: { op: 'ping' } }))
    expect(await nextMessage(driver, (m) => m.id === 'n1')).toMatchObject({
      ok: false,
      noPage: true,
    })

    const helloSeen = nextMessage(driver, (m) => m.event === 'page-hello')
    const page = await open(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=page&id=p2`)
    page.send(
      JSON.stringify({
        hello: true,
        id: 'p2',
        href: 'http://x/',
        title: '',
        readyState: 'complete',
        hidden: false,
        framed: false,
      }),
    )
    await helloSeen
    driver.send(JSON.stringify({ id: 'c2', op: 'cmd', cmd: { op: 'ping' } }))
    await nextMessage(page)
    // Both messages arrive back-to-back in one socket chunk: listen for the second BEFORE closing.
    const failed = nextMessage(driver, (m) => m.id === 'c2')
    const closed = nextMessage(driver, (m) => m.event === 'page-closed')
    page.close()
    expect(await failed).toMatchObject({ id: 'c2', ok: false, pageClosed: true, pageId: 'p2' })
    expect(await closed).toMatchObject({ pageId: 'p2' })
  })
})
