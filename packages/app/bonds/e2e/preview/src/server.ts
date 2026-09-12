/**
 * The hub: a WebSocket endpoint attached to the dev server's HTTP server.
 * Preview pages connect as `role=page` (from the browser, same origin through
 * whatever proxy serves the preview); the test runner connects as
 * `role=driver` (loopback only, with the hub's token). The hub forwards each
 * driver command to a page and the page's reply back, and broadcasts page
 * events (hello, navigated, console, pageerror, dialog, closed) to drivers.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { unlinkSync, writeFileSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import process from 'node:process'
import type { Duplex } from 'node:stream'

import { type WebSocket, WebSocketServer } from 'ws'

import { E2E_WS_PATH, type PagePeer, tokenFilePath } from './types.js'

type Dict = Record<string, unknown>

type UpgradeListener = (req: IncomingMessage, socket: Duplex, head: Buffer) => void

/**
 * The slice of `http.Server` / `http2.Http2SecureServer` the hub uses — Vite
 * hands over either, and both emit `upgrade` with the same arguments.
 */
export interface UpgradeCapableServer {
  on(event: 'upgrade', listener: UpgradeListener): unknown
  off(event: 'upgrade', listener: UpgradeListener): unknown
  once(event: 'listening' | 'close', listener: () => void): unknown
  address(): AddressInfo | string | null
  readonly listening: boolean
}

interface PageConn {
  peer: PagePeer
  ws: WebSocket
}

/** A running hub. */
export interface E2EHub {
  /** The driver token (also written to the token file once the server listens). */
  readonly token: string
  /** Pages currently connected. */
  pages(): PagePeer[]
  /** Detach from the server and close every socket. */
  close(): void
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const isLoopback = (address: string | undefined): boolean => !!address && LOOPBACK.has(address)

/**
 * Attach the hub to an HTTP server (Vite's `server.httpServer`). Safe next to
 * Vite's own HMR upgrade listener: each ignores the other's path.
 */
export const attachE2EHub = (
  httpServer: UpgradeCapableServer,
  options: { token?: string; path?: string } = {},
): E2EHub => {
  const path = options.path ?? E2E_WS_PATH
  const token = options.token ?? process.env['MOL_E2E_TOKEN'] ?? randomUUID()
  const wss = new WebSocketServer({ noServer: true })
  const pages = new Map<string, PageConn>()
  const drivers = new Set<WebSocket>()
  const pending = new Map<string, { driver: WebSocket; pageId: string }>()
  let tokenFile: string | null = null

  const sendTo = (ws: WebSocket, obj: Dict): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj))
  }
  const broadcast = (obj: Dict): void => {
    for (const d of drivers) sendTo(d, obj)
  }
  const failPending = (pageId: string): void => {
    for (const [id, p] of pending) {
      if (p.pageId !== pageId) continue
      pending.delete(id)
      sendTo(p.driver, {
        id,
        ok: false,
        error: 'the page navigated away or closed before it replied',
        pageClosed: true,
        pageId,
      })
    }
  }
  const pickPage = (pageId?: string): PageConn | undefined => {
    if (pageId) return pages.get(pageId)
    const all = Array.from(pages.values())
    const visible = all.filter((p) => !p.peer.hidden)
    const pool = visible.length ? visible : all
    return pool.sort((a, b) => b.peer.lastSeen - a.peer.lastSeen)[0]
  }

  const onPage = (ws: WebSocket, id: string): void => {
    // A page counts as connected once it has said hello (href, title, visibility);
    // until then a driver's `list` does not see it and no command can target it.
    const peer: PagePeer = {
      id,
      href: '',
      title: '',
      hidden: false,
      framed: false,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    }
    let announced = false
    const keepalive = setInterval(() => {
      try {
        ws.ping()
      } catch (_error) {
        /* closing */
      }
    }, 25_000)
    ws.on('message', (data) => {
      let msg: Dict
      try {
        msg = JSON.parse(String(data)) as Dict
      } catch (_error) {
        return
      }
      peer.lastSeen = Date.now()
      if (typeof msg.href === 'string') peer.href = msg.href
      if (msg.hello) {
        peer.title = String(msg.title ?? '')
        peer.hidden = Boolean(msg.hidden)
        peer.framed = Boolean(msg.framed)
        pages.set(id, { peer, ws })
        announced = true
        broadcast({
          event: 'page-hello',
          pageId: id,
          ...peer,
          readyState: msg.readyState,
          innerWidth: msg.innerWidth,
          innerHeight: msg.innerHeight,
        })
        return
      }
      if (typeof msg.id === 'string' && pending.has(msg.id)) {
        const p = pending.get(msg.id)!
        pending.delete(msg.id)
        sendTo(p.driver, { ...msg, pageId: id })
        return
      }
      if (typeof msg.event === 'string') {
        if (msg.event === 'visibility') peer.hidden = Boolean(msg.hidden)
        if (msg.event === 'navigated' && typeof msg.title === 'string') peer.title = msg.title
        broadcast({ ...msg, pageId: id })
      }
    })
    ws.on('close', () => {
      clearInterval(keepalive)
      if (!announced) return
      pages.delete(id)
      failPending(id)
      broadcast({ event: 'page-closed', pageId: id })
    })
    ws.on('error', () => {
      /* close follows */
    })
  }

  const onDriver = (ws: WebSocket): void => {
    drivers.add(ws)
    ws.on('message', (data) => {
      let msg: Dict
      try {
        msg = JSON.parse(String(data)) as Dict
      } catch (_error) {
        return
      }
      const id = typeof msg.id === 'string' ? msg.id : randomUUID()
      if (msg.op === 'list') {
        sendTo(ws, { id, ok: true, value: Array.from(pages.values()).map((p) => p.peer) })
        return
      }
      if (msg.op === 'cmd') {
        const target = pickPage(typeof msg.pageId === 'string' ? msg.pageId : undefined)
        if (!target) {
          sendTo(ws, { id, ok: false, error: 'no-page', noPage: true })
          return
        }
        pending.set(id, { driver: ws, pageId: target.peer.id })
        sendTo(target.ws, { ...(msg.cmd as Dict), id })
        return
      }
      sendTo(ws, { id, ok: false, error: 'unknown driver op: ' + String(msg.op) })
    })
    ws.on('close', () => {
      drivers.delete(ws)
      for (const [id, p] of pending) if (p.driver === ws) pending.delete(id)
    })
    ws.on('error', () => {
      /* close follows */
    })
  }

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== path) return
    const role = url.searchParams.get('role')
    if (role === 'driver') {
      const remote = (req.socket as { remoteAddress?: string }).remoteAddress
      if (!isLoopback(remote) || url.searchParams.get('token') !== token) {
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, (ws) => onDriver(ws))
      return
    }
    if (role === 'page') {
      const id = url.searchParams.get('id') || randomUUID()
      wss.handleUpgrade(req, socket, head, (ws) => onPage(ws, id))
      return
    }
    socket.destroy()
  }
  httpServer.on('upgrade', onUpgrade)

  const writeToken = (): void => {
    const address = httpServer.address()
    const port = address && typeof address === 'object' ? address.port : null
    if (!port) return
    tokenFile = tokenFilePath(port)
    try {
      writeFileSync(tokenFile, JSON.stringify({ token, port, path, pid: process.pid }), {
        mode: 0o600,
      })
    } catch (_error) {
      /* a read-only tmpdir: the driver can still use MOL_E2E_TOKEN */
    }
  }
  const removeToken = (): void => {
    if (!tokenFile) return
    try {
      unlinkSync(tokenFile)
    } catch (_error) {
      /* already gone */
    }
    tokenFile = null
  }
  if (httpServer.listening) writeToken()
  else httpServer.once('listening', writeToken)
  httpServer.once('close', removeToken)

  return {
    token,
    pages: () => Array.from(pages.values()).map((p) => p.peer),
    close: () => {
      httpServer.off('upgrade', onUpgrade)
      for (const p of pages.values()) p.ws.close()
      for (const d of drivers) d.close()
      wss.close()
      removeToken()
    },
  }
}
