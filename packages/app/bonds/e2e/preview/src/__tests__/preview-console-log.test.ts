import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'

import { E2E_PREVIEW_CLIENT_SCRIPT } from '../client.js'
import { createPreviewLogWriter, formatPreviewLogEntry } from '../preview-console-log.js'
import { attachE2EHub } from '../server.js'
import { E2E_CLIENT_PATH, E2E_WS_PATH } from '../types.js'

let dir = ''
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-console-log-'))
})
afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

const at = Date.UTC(2026, 10, 22)

/** The log's text, or an empty string while the hub has not created it yet. */
const readLog = (file: string): Promise<string> =>
  readFile(file, 'utf8').catch((_error: unknown) => {
    // Not written yet: the poll asks again.
    return ''
  })

describe('formatPreviewLogEntry', () => {
  it('writes console output and uncaught errors, and skips every other event', () => {
    expect(formatPreviewLogEntry({ event: 'console', type: 'warning', text: 'careful' }, at)).toBe(
      '[2026-11-22T00:00:00.000Z] [warn] careful\n',
    )
    expect(
      formatPreviewLogEntry(
        { event: 'pageerror', message: 'boom', url: '/src/main.tsx', lineNumber: 3 },
        at,
      ),
    ).toBe('[2026-11-22T00:00:00.000Z] [error] Uncaught: boom (/src/main.tsx:3)\n')
    expect(formatPreviewLogEntry({ event: 'navigated', href: '/x' }, at)).toBeNull()
  })
})

describe('createPreviewLogWriter', () => {
  it('writes nothing when no file is named', () => {
    expect(createPreviewLogWriter(undefined)).toBeNull()
    expect(createPreviewLogWriter('')).toBeNull()
  })

  it('keeps the newest 512 KB of a file that outgrows it', async () => {
    const log = join(dir, 'capped.log')
    await writeFile(log, 'x'.repeat(512 * 1024))
    const write = createPreviewLogWriter(log)!
    write({ event: 'console', type: 'log', text: 'newest' })
    const content = await readFile(log, 'utf8')
    expect(content.length).toBe(512 * 1024)
    expect(content.endsWith('[log] newest\n')).toBe(true)
  })
})

describe('the hub writes the pages’ console to the log', () => {
  it('appends the console and pageerror events a connected page sends, and nothing else', async () => {
    const log = join(dir, 'browser.log')
    const server: Server = createServer((_req, res) => res.end('ok'))
    const hub = attachE2EHub(server, { consoleLog: createPreviewLogWriter(log) })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    const page = new WebSocket(`ws://127.0.0.1:${port}${E2E_WS_PATH}?role=page&id=p1`, {
      origin: `http://127.0.0.1:${port}`,
    })
    await new Promise((resolve) => page.once('open', resolve))
    page.send(JSON.stringify({ hello: true, href: '/', title: 'App' }))
    page.send(JSON.stringify({ event: 'console', type: 'error', text: 'failed to load' }))
    page.send(JSON.stringify({ event: 'pageerror', message: 'x is undefined' }))
    page.send(JSON.stringify({ event: 'navigated', href: '/next' }))
    await expect.poll(async () => (await readLog(log)).split('\n').length).toBe(3)
    const lines = (await readFile(log, 'utf8')).trimEnd().split('\n')
    expect(lines[0]).toMatch(/\] \[error\] failed to load$/)
    expect(lines[1]).toMatch(/\] \[error\] Uncaught: x is undefined$/)
    page.close()
    hub.close()
    await new Promise((resolve) => server.close(resolve))
  })
})

describe('a page that fails while it boots', () => {
  it('still reaches the log: the client holds the events until its socket opens', async ({
    skip,
  }) => {
    const log = join(dir, 'boot.log')
    const page = `<!doctype html><html><head><script src="${E2E_CLIENT_PATH}"></script><script>console.error('boot failed'); throw new Error('boom at boot')</script></head><body></body></html>`
    const server = createServer((req, res) => {
      const script = req.url === E2E_CLIENT_PATH
      res.setHeader('content-type', script ? 'text/javascript' : 'text/html')
      res.end(script ? E2E_PREVIEW_CLIENT_SCRIPT : page)
    })
    const hub = attachE2EHub(server, { consoleLog: createPreviewLogWriter(log) })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    const browser = await chromium.launch().catch((error: Error) => {
      console.warn(`[app-e2e-preview] no Playwright browser here: ${error.message.split('\n')[0]}`)
      return null
    })
    try {
      if (!browser) return skip()
      const tab = await browser.newPage()
      await tab.goto(`http://127.0.0.1:${port}/`)
      await expect
        .poll(async () => readLog(log), { timeout: 5_000 })
        .toMatch(/\[error\] boot failed\n.*\[error\] Uncaught: .*boom at boot/s)
    } finally {
      await browser?.close()
      hub.close()
      await new Promise((resolve) => server.close(resolve))
    }
  }, 30_000)
})
