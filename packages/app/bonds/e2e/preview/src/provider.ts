/**
 * The driver: connects to the hub from inside the sandbox (or any machine
 * running the dev server), picks a connected preview page, and exposes it as
 * an `E2ETransport` for the core's `createEvaluatePage()`.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

import type { Page } from '@playwright/test'
import WebSocket from 'ws'

import {
  type E2EConsolePayload,
  type E2EErrorPayload,
  type E2EProvider,
  E2ETimeoutError,
  type E2ETransport,
  type E2EViewport,
} from '@molecule/app-e2e'
import { createEvaluatePage } from '@molecule/app-e2e-fixtures-default'

import {
  E2E_WS_PATH,
  type HubEvent,
  type PagePeer,
  type PreviewConnectOptions,
  tokenFilePath,
} from './types.js'

type Dict = Record<string, unknown>
type Listener = (payload: E2EConsolePayload | E2EErrorPayload | undefined) => void

const BOND_NAME = 'the preview bond (@molecule/app-e2e-preview)'
const DEFAULT_CONNECT_TIMEOUT = 30_000

const noPageMessage = (url: string): string =>
  `No preview page is connected to the dev server at ${url}. ${BOND_NAME} drives the page a browser is showing: ` +
  `open this project's preview in the molecule.dev IDE (or the preview URL in any browser tab) and keep that tab open, then run again. ` +
  `If the tab is asleep, wake it — the IDE keeps the screen awake while a build runs.`

const candidatePorts = (options: PreviewConnectOptions): number[] => {
  const raw = [
    options.port,
    Number(process.env['MOL_E2E_PREVIEW_PORT']),
    5173,
    Number(process.env['VITE_PORT']),
    3000,
  ]
  const out: number[] = []
  for (const p of raw) if (p && Number.isFinite(p) && !out.includes(p)) out.push(p)
  return out
}

const readToken = (port: number, options: PreviewConnectOptions): string | null => {
  if (options.token) return options.token
  const fromEnv = process.env['MOL_E2E_TOKEN']
  if (fromEnv) return fromEnv
  try {
    const file = tokenFilePath(port)
    if (!existsSync(file)) return null
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { token?: string }
    return parsed.token ?? null
  } catch (_error) {
    return null
  }
}

interface PendingRequest {
  resolve: (value: Dict) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

/** A driver connection to one hub. */
class HubClient {
  readonly pages = new Map<string, PagePeer>()
  current: string | null = null
  lastHref = ''
  private readonly pending = new Map<string, PendingRequest>()
  private readonly listeners = new Map<string, Set<(event: HubEvent) => void>>()
  private closed = false

  private constructor(
    readonly url: string,
    private readonly ws: WebSocket,
  ) {
    ws.on('message', (data) => this.onMessage(String(data)))
    ws.on('close', () => {
      this.closed = true
      for (const [id, p] of this.pending) {
        this.pending.delete(id)
        clearTimeout(p.timer)
        p.reject(
          new Error(
            `the connection to the preview hub at ${url} closed (did the dev server restart?)`,
          ),
        )
      }
      this.emit({ event: 'hub-closed' })
    })
    ws.on('error', () => {
      /* close follows */
    })
  }

  /** Connect to a hub as a driver and learn the pages already connected. */
  static open(url: string, token: string, timeout: number): Promise<HubClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${url}?role=driver&token=${encodeURIComponent(token)}`)
      const timer = setTimeout(() => {
        ws.terminate()
        reject(new Error(`timed out connecting to the preview hub at ${url}`))
      }, timeout)
      ws.once('open', () => {
        clearTimeout(timer)
        const client = new HubClient(url, ws)
        client.seed().then(() => resolve(client), reject)
      })
      ws.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      ws.once('unexpected-response', (_req, res) => {
        clearTimeout(timer)
        reject(
          new Error(
            `the preview hub at ${url} refused the driver connection (HTTP ${res.statusCode}) — wrong token, or not connecting from the machine that runs the dev server`,
          ),
        )
      })
    })
  }

  /** Whether the socket has closed. */
  get isClosed(): boolean {
    return this.closed
  }

  /** Subscribe to hub events (`page-hello`, `page-closed`, `navigated`, `console`, `pageerror`, `hub-closed`, or `*`); returns an unsubscribe function. */
  on(event: string, fn: (event: HubEvent) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.listeners.get(event)?.delete(fn)
  }

  /** Fan an event out to its listeners and to the wildcard listeners. */
  private emit(event: HubEvent): void {
    for (const fn of this.listeners.get(event.event) ?? []) fn(event)
    for (const fn of this.listeners.get('*') ?? []) fn(event)
  }

  /** Route a hub frame: a reply to a pending request, or a page event that updates the bookkeeping. */
  private onMessage(raw: string): void {
    let msg: Dict
    try {
      msg = JSON.parse(raw) as Dict
    } catch (_error) {
      return
    }
    if (typeof msg.id === 'string' && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!
      this.pending.delete(msg.id)
      clearTimeout(p.timer)
      if (typeof msg.href === 'string' && msg.pageId === this.current) this.lastHref = msg.href
      p.resolve(msg)
      return
    }
    if (typeof msg.event !== 'string') return
    const pageId = typeof msg.pageId === 'string' ? msg.pageId : undefined
    if (msg.event === 'page-hello' && pageId) {
      this.pages.set(pageId, {
        id: pageId,
        href: String(msg.href ?? ''),
        title: String(msg.title ?? ''),
        hidden: Boolean(msg.hidden),
        framed: Boolean(msg.framed),
        base: typeof msg.base === 'string' && msg.base ? msg.base : '/',
        connectedAt: Number(msg.connectedAt ?? Date.now()),
        lastSeen: Date.now(),
      })
    } else if (msg.event === 'page-closed' && pageId) {
      this.pages.delete(pageId)
      if (this.current === pageId) this.current = null
    } else if (pageId && this.pages.has(pageId)) {
      const peer = this.pages.get(pageId)!
      peer.lastSeen = Date.now()
      if (msg.event === 'navigated' && typeof msg.href === 'string') {
        peer.href = msg.href
        if (pageId === this.current) this.lastHref = msg.href
      }
      if (msg.event === 'visibility') peer.hidden = Boolean(msg.hidden)
    }
    this.emit(msg as HubEvent)
  }

  /** Learn about pages that connected BEFORE this driver did (the hub only broadcasts new hellos). */
  async seed(): Promise<void> {
    const reply = await this.request('list', {}, 5_000)
    for (const peer of (reply.value as PagePeer[] | undefined) ?? []) {
      if (!this.pages.has(peer.id))
        this.pages.set(peer.id, { ...peer, lastSeen: peer.lastSeen || Date.now() })
    }
  }

  /** Send one driver request and await its reply within `timeout`. */
  request(op: string, payload: Dict, timeout: number): Promise<Dict> {
    if (this.closed)
      return Promise.reject(new Error(`the connection to the preview hub at ${this.url} is closed`))
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(
          new E2ETimeoutError(
            `the preview page did not answer within ${timeout}ms (${op}). Is the preview tab open and awake?`,
          ),
        )
      }, timeout)
      this.pending.set(id, { resolve, reject, timer })
      this.ws.send(JSON.stringify({ id, op, ...payload }))
    })
  }

  /** Wait for a page to be connected; resolves with its id. */
  waitForPage(options: {
    exclude?: string | null
    timeout: number
    preferred?: string
  }): Promise<string> {
    const pick = (): string | null => {
      if (options.preferred && this.pages.has(options.preferred)) return options.preferred
      const all = Array.from(this.pages.values()).filter((p) => p.id !== options.exclude)
      const visible = all.filter((p) => !p.hidden)
      const pool = visible.length ? visible : all
      pool.sort((a, b) => b.lastSeen - a.lastSeen)
      return pool[0]?.id ?? null
    }
    const now = pick()
    if (now) return Promise.resolve(now)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off()
        reject(new E2ETimeoutError(noPageMessage(this.url)))
      }, options.timeout)
      const off = this.on('page-hello', () => {
        const id = pick()
        if (!id) return
        clearTimeout(timer)
        off()
        resolve(id)
      })
    })
  }

  /** Close the driver socket. */
  close(): void {
    this.closed = true
    this.ws.close()
  }
}

const openHub = async (options: PreviewConnectOptions): Promise<HubClient> => {
  const timeout = options.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT
  const tried: string[] = []
  if (options.url) {
    const port = Number(new URL(options.url).port) || 80
    const token = readToken(port, options)
    if (!token)
      throw new Error(
        `no driver token for the preview hub at ${options.url}: set MOL_E2E_TOKEN or start the dev server with the preview plugin (it writes ${tokenFilePath(port)})`,
      )
    return HubClient.open(options.url, token, timeout)
  }
  for (const port of candidatePorts(options)) {
    const url = `ws://127.0.0.1:${port}${E2E_WS_PATH}`
    const token = readToken(port, options)
    if (!token) {
      tried.push(
        `${url} (no token file — is the dev server on :${port} running with the preview plugin?)`,
      )
      continue
    }
    try {
      return await HubClient.open(url, token, Math.min(timeout, 5_000))
    } catch (error) {
      tried.push(`${url} (${String((error as Error).message ?? error)})`)
    }
  }
  throw new Error(
    `could not reach a preview hub. Tried:\n  ${tried.join('\n  ')}\nStart the app's dev server (it carries the preview plugin) and open its preview in the IDE.`,
  )
}

/** Open a transport over the hub: one connected preview page, navigations followed across documents. */
const openTransport = async (options: PreviewConnectOptions): Promise<E2ETransport> => {
  const hub = await openHub(options)
  const connectTimeout = options.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT
  const navigationTimeout = options.navigationTimeout ?? 15_000
  hub.current = await hub.waitForPage({ timeout: connectTimeout, preferred: options.pageId })
  hub.lastHref = hub.pages.get(hub.current)?.href ?? ''
  const listeners = new Map<string, Set<Listener>>()
  const emit = (event: string, payload: E2EConsolePayload | E2EErrorPayload | undefined): void => {
    for (const fn of listeners.get(event) ?? []) fn(payload)
  }
  hub.on('console', (e) => {
    if (e.pageId === hub.current)
      emit('console', { type: String(e.type ?? 'log'), text: String(e.text ?? '') })
  })
  hub.on('pageerror', (e) => {
    if (e.pageId === hub.current)
      emit('pageerror', {
        message: String(e.message ?? 'Error'),
        stack: typeof e.stack === 'string' ? e.stack : undefined,
      })
  })
  hub.on('hub-closed', () => emit('close', undefined))

  const ensurePage = async (): Promise<string> => {
    if (hub.current && hub.pages.has(hub.current)) return hub.current
    hub.current = await hub.waitForPage({ timeout: connectTimeout })
    hub.lastHref = hub.pages.get(hub.current)?.href ?? hub.lastHref
    return hub.current
  }
  const cmd = async (command: Dict, timeout: number): Promise<Dict> => {
    const pageId = await ensurePage()
    const reply = await hub.request('cmd', { pageId, cmd: command }, timeout)
    if (reply.noPage) {
      hub.current = null
      const next = await ensurePage()
      return hub.request('cmd', { pageId: next, cmd: command }, timeout)
    }
    return reply
  }
  const settle = async (timeout: number): Promise<void> => {
    const deadline = Date.now() + timeout
    for (;;) {
      const reply = await cmd(
        { op: 'evaluate', source: '() => document.readyState' },
        Math.max(1_000, deadline - Date.now()),
      )
      if (reply.ok && reply.value === 'complete') return
      if (Date.now() > deadline) return
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  /**
   * Resolve when the current page is replaced by a new document (or changed
   * its URL in place). `cancel` stands the wait down without an error — for a
   * navigation the page refused before it began (a path outside its base).
   */
  const awaitNavigation = (
    previous: string,
    timeout: number,
    graceForNoop: number | null,
  ): { promise: Promise<void>; cancel: () => void } => {
    let cancel = (): void => {}
    const promise = new Promise<void>((resolve, reject) => {
      let done = false
      const finish = (fn: () => void): void => {
        if (done) return
        done = true
        clearTimeout(timer)
        if (grace) clearTimeout(grace)
        offHello()
        offNav()
        fn()
      }
      cancel = () => finish(resolve)
      const timer = setTimeout(
        () =>
          finish(() =>
            reject(
              new E2ETimeoutError(
                `navigation did not complete within ${timeout}ms (the previous page ${previous} never handed over to a new document)`,
              ),
            ),
          ),
        timeout,
      )
      const grace = graceForNoop === null ? null : setTimeout(() => finish(resolve), graceForNoop)
      const offHello = hub.on('page-hello', (e) => {
        if (e.pageId === previous) return
        hub.current = String(e.pageId)
        hub.lastHref = String(e.href ?? '')
        finish(resolve)
      })
      const offNav = hub.on('navigated', (e) => {
        if (e.pageId !== previous) return
        hub.lastHref = String(e.href ?? hub.lastHref)
        finish(resolve)
      })
    })
    return { promise, cancel }
  }

  const transport: E2ETransport = {
    async evaluate(source, arg, opts) {
      const timeout = opts?.timeout ?? 12_000
      const reply = await cmd({ op: 'evaluate', source, arg }, timeout)
      if (reply.pageClosed) {
        // The action navigated the page away before it could answer (a link click, a form submit).
        await awaitNavigation(
          String(reply.pageId ?? hub.current ?? ''),
          navigationTimeout,
          null,
        ).promise.catch(() => undefined)
        return { ok: true, navigated: true }
      }
      if (reply.ok === false) throw new Error(String(reply.error ?? 'evaluate failed'))
      return reply.value
    },
    async navigate(kind, url, opts) {
      const timeout = opts?.timeout ?? navigationTimeout
      const previous = await ensurePage()
      const command: Dict =
        kind === 'goto'
          ? { op: 'goto', url }
          : kind === 'reload'
            ? { op: 'reload' }
            : { op: 'history', delta: kind === 'back' ? -1 : 1 }
      const pending = awaitNavigation(
        previous,
        timeout,
        kind === 'back' || kind === 'forward' ? 1_500 : null,
      )
      const reply: Dict = await cmd(command, Math.min(timeout, 5_000)).catch(
        (error: Error): Dict => ({ ok: false, error: error.message }),
      )
      if (reply.ok === false && !reply.pageClosed) {
        // The page refused before navigating (a path outside its base): nothing to wait for.
        pending.cancel()
        throw new Error(`page.${kind === 'goto' ? 'goto' : kind}(): ${String(reply.error)}`)
      }
      await pending.promise
      await settle(timeout)
    },
    async viewport(width, height): Promise<E2EViewport> {
      const reply = await cmd({ op: 'viewport', width, height }, 5_000)
      if (reply.ok === false) throw new Error(String(reply.error ?? 'viewport failed'))
      const v = reply.value as { width: number; height: number }
      return { width: v.width, height: v.height }
    },
    url: () => hub.lastHref,
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener)
      return () => listeners.get(event)?.delete(listener)
    },
    async close() {
      hub.close()
    },
  }
  return transport
}

/** The bond: `setProvider(provider)` in your `e2e/bonds.ts`. */
export const provider: E2EProvider = {
  name: 'preview',
  async connect(options: PreviewConnectOptions = {}): Promise<Page> {
    const transport = await openTransport(options)
    return createEvaluatePage(transport, { ...options, bondName: BOND_NAME })
  },
}

/** Open the live preview as a Playwright-shaped page from any script (`node scripts/check.mjs`). */
export const connectPreview = (options: PreviewConnectOptions = {}): Promise<Page> =>
  provider.connect(options)

/** The preview pages currently connected to the hub. */
export const listPreviewPages = async (
  options: PreviewConnectOptions = {},
): Promise<PagePeer[]> => {
  const hub = await openHub(options)
  try {
    const reply = await hub.request('list', {}, 5_000)
    return (reply.value as PagePeer[]) ?? []
  } finally {
    hub.close()
  }
}
