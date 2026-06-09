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

  /**
   * Defer creating the Socket.io server until {@link RealtimeProvider.attachHttpServer}
   * is called, instead of binding eagerly at creation. Used by the server factory so
   * Socket.io attaches to the API's HTTP server (shared port, `/socket.io/`) once it
   * exists — avoiding a separate standalone port a sandbox/proxy may not expose.
   *
   * @defaultValue false
   */
  deferAttach?: boolean
}
