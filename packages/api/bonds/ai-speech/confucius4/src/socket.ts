/**
 * WebSocket transport for the streaming speech servers.
 *
 * Uses the runtime's global `WebSocket` (Node ≥ 22) — no `ws` dependency. The
 * socket is reached through a small callback interface so tests (and runtimes
 * without a global WebSocket) can inject their own.
 *
 * @module
 */

/** An open (or opening) realtime socket. */
export interface RealtimeSocket {
  /**
   * Send a text or binary frame.
   *
   * @param data - JSON text or raw bytes.
   */
  send(data: string | Uint8Array): void
  /**
   * Close the socket.
   *
   * @param code - Close code (default 1000).
   * @param reason - Close reason.
   */
  close(code?: number, reason?: string): void
}

/** Callbacks a {@link RealtimeSocketFactory} reports socket activity to. */
export interface RealtimeSocketHandlers {
  /** The connection is open. */
  onOpen(): void
  /** A frame arrived (text frames as strings, binary frames as bytes). */
  onMessage(data: string | Uint8Array): void
  /** The connection closed. */
  onClose(code: number, reason: string): void
  /** The connection failed. */
  onError(message: string): void
}

/**
 * Opens a realtime socket.
 *
 * @param url - `ws://` or `wss://` URL.
 * @param headers - Extra handshake headers (e.g. `Authorization`).
 * @param handlers - Activity callbacks.
 * @returns The socket.
 */
export type RealtimeSocketFactory = (
  url: string,
  headers: Record<string, string>,
  handlers: RealtimeSocketHandlers,
) => RealtimeSocket

/**
 * Default socket factory over the runtime's global `WebSocket`. Handshake
 * headers use the Node (undici) `WebSocketInit.headers` extension.
 *
 * @param url - `ws://` or `wss://` URL.
 * @param headers - Extra handshake headers.
 * @param handlers - Activity callbacks.
 * @returns The socket.
 * @throws {Error} When the runtime has no global WebSocket.
 */
export const openGlobalWebSocket: RealtimeSocketFactory = (url, headers, handlers) => {
  if (typeof globalThis.WebSocket !== 'function') {
    throw new Error(
      'No global WebSocket in this runtime (Node 22+ has one). Pass createProvider({ socketFactory }) instead.',
    )
  }
  // Node's WebSocket (undici) accepts `{ headers }` as its second argument; the
  // DOM lib typing only models protocols, so construct it through Reflect.
  const ws: WebSocket =
    Object.keys(headers).length > 0
      ? Reflect.construct(globalThis.WebSocket, [url, { headers }])
      : new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  ws.addEventListener('open', () => handlers.onOpen())
  ws.addEventListener('message', (event) => {
    const data: unknown = event.data
    if (typeof data === 'string') handlers.onMessage(data)
    else if (data instanceof ArrayBuffer) handlers.onMessage(new Uint8Array(data))
  })
  ws.addEventListener('close', (event) => handlers.onClose(event.code, event.reason))
  ws.addEventListener('error', () => handlers.onError(`WebSocket error on ${url}`))
  return {
    send: (data) => ws.send(typeof data === 'string' ? data : new Uint8Array(data)),
    close: (code, reason) => ws.close(code ?? 1000, reason),
  }
}

/**
 * A single-consumer async queue: producers push, the consumer iterates, and
 * `end()` finishes the iteration once everything pushed has been read.
 */
export class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = []
  private waiting: ((result: IteratorResult<T>) => void) | null = null
  private ended = false

  /**
   * Add an item.
   *
   * @param item - The item (ignored after `end()`).
   */
  push(item: T): void {
    if (this.ended) return
    if (this.waiting) {
      const resolve = this.waiting
      this.waiting = null
      resolve({ value: item, done: false })
    } else {
      this.items.push(item)
    }
  }

  /** Finish the queue; the consumer drains what is left, then stops. */
  end(): void {
    if (this.ended) return
    this.ended = true
    if (this.waiting) {
      const resolve = this.waiting
      this.waiting = null
      resolve({ value: undefined, done: true })
    }
  }

  /**
   * Whether `end()` has been called.
   *
   * @returns True once ended.
   */
  get isEnded(): boolean {
    return this.ended
  }

  /**
   * Iterate the queue.
   *
   * @returns An async iterator over pushed items.
   */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.items.length > 0) {
          return Promise.resolve({ value: this.items.shift() as T, done: false })
        }
        if (this.ended) return Promise.resolve({ value: undefined, done: true })
        return new Promise((resolve) => {
          this.waiting = resolve
        })
      },
    }
  }
}

/**
 * Turns an `http(s)://` base URL into its `ws(s)://` equivalent.
 *
 * @param baseUrl - HTTP base URL.
 * @returns The WebSocket base URL.
 */
export function toWebSocketUrl(baseUrl: string): string {
  return baseUrl.replace(/^http(s?):\/\//i, (_match, secure: string) => `ws${secure}://`)
}

/**
 * Decodes a text frame as JSON.
 *
 * @param data - The frame.
 * @returns The parsed object, or null for binary/non-JSON frames.
 */
export function parseFrame(data: string | Uint8Array): Record<string, unknown> | null {
  if (typeof data !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(data)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch (_error) {
    // Not JSON — servers in this family only speak JSON text frames, so a
    // non-JSON frame carries nothing the bond can act on.
    return null
  }
}
