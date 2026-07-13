/**
 * Raw WebSocket realtime provider configuration.
 *
 * @module
 */

import type { Server } from 'node:http'

import type { ServerOptions } from 'ws'

/**
 * Configuration options for the raw WebSocket realtime provider.
 */
export interface WsRealtimeConfig {
  /**
   * `ws` server options passed to the `WebSocketServer` constructor.
   *
   * @see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
   */
  serverOptions?: ServerOptions

  /**
   * An existing Node.js HTTP server to attach the WebSocket server to. This
   * is itself an explicit attach step — when given, a standalone WebSocket
   * server is created and attached immediately, regardless of `deferAttach`.
   */
  httpServer?: Server

  /**
   * Port to listen on for a standalone server. Passing this **explicitly**
   * is an explicit instruction to bind a standalone server immediately (no
   * `httpServer` needed) — env-aware for the actual value: `WS_PORT` if set,
   * else `PORT + 1000` (one above the API convention), else `3000`, so
   * multiple apps can run side-by-side.
   *
   * **Omitting `port` (along with `httpServer` and `deferAttach`) does NOT
   * bind a default port** — creating a provider must never bind a port as a
   * side effect. A zero-config `createProvider()` behaves exactly like
   * `{ deferAttach: true }` instead: it waits for
   * {@link RealtimeProvider.attachHttpServer} and logs an info line naming
   * the bond so the omission is visible.
   */
  port?: number

  /**
   * Defer creating the standalone WebSocket server until
   * {@link RealtimeProvider.attachHttpServer} is called, instead of binding
   * eagerly at creation. Used by the server factory so `ws` attaches to the
   * API's HTTP server (shared port) once it exists — avoiding a standalone
   * port a sandbox/proxy may not expose and that collides with the API's own
   * port by default. Ignored when `httpServer` is already provided (that is
   * itself an explicit attach — see the module `@remarks`). Zero-config
   * (no `port`, no `httpServer`, no `deferAttach`) already behaves as if
   * this were `true` — set it explicitly for readability/intent at the call
   * site, not because it changes behavior over omitting it.
   *
   * @defaultValue false
   */
  deferAttach?: boolean

  /**
   * Currently UNUSED — the provider never reads this option. Clients send
   * JSON frames shaped `{ event, data, room? }` and the frame's own `event`
   * field (defaulting to `'message'` when absent) is what reaches `onMessage`
   * handlers; there is no configurable envelope event name.
   */
  messageEvent?: string
}
