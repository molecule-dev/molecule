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
   * The event name used by clients to send messages.
   * Clients send JSON with `{ event, data }` structure.
   *
   * @defaultValue 'message'
   */
  messageEvent?: string
}
