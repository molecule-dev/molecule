/**
 * Socket.io realtime provider configuration.
 *
 * @module
 */

import type { Server } from 'node:http'

import type { ServerOptions } from 'socket.io'

/**
 * Configuration options for the Socket.io realtime provider.
 */
export interface SocketioRealtimeConfig {
  /**
   * Socket.io server options passed to the `Server` constructor.
   *
   * @see https://socket.io/docs/v4/server-options/
   */
  serverOptions?: Partial<ServerOptions>

  /**
   * An existing Node.js HTTP server to attach Socket.io to.
   * If omitted, Socket.io creates its own standalone server.
   */
  httpServer?: Server

  /**
   * Port to listen on when no `httpServer` is provided.
   *
   * @defaultValue 3000
   */
  port?: number

  /**
   * Socket.io namespace path.
   *
   * @defaultValue '/'
   */
  namespace?: string
}
