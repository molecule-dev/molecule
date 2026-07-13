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
   * An existing Node.js HTTP server to attach the WebSocket server to.
   * If omitted, a standalone WebSocket server is created.
   */
  httpServer?: Server

  /**
   * Port to listen on when no `httpServer` is provided.
   *
   * @defaultValue 3000
   */
  port?: number

  /**
   * Currently UNUSED — the provider never reads this option. Clients send
   * JSON frames shaped `{ event, data, room? }` and the frame's own `event`
   * field (defaulting to `'message'` when absent) is what reaches `onMessage`
   * handlers; there is no configurable envelope event name.
   */
  messageEvent?: string
}
