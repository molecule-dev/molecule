/**
 * SSE realtime provider configuration.
 *
 * @module
 */

import type { Server as HttpServer } from 'node:http'

/**
 * Configuration options for the SSE realtime provider.
 *
 * SSE (Server-Sent Events) provides server-to-client push. Client-to-server
 * messages are accepted via HTTP POST on the same path (configurable via
 * {@link SseRealtimeConfig.path | path}).
 */
export interface SseRealtimeConfig {
  /**
   * An existing Node.js HTTP server to attach the SSE routes to. This is
   * itself an explicit attach step — when given, the routes are attached
   * immediately (or a standalone server is created on {@link port}
   * immediately if omitted, per the rules below), regardless of
   * `deferAttach`.
   */
  httpServer?: HttpServer

  /**
   * Port to listen on for a standalone server. Passing this **explicitly**
   * is an explicit instruction to bind a standalone server immediately (no
   * `httpServer` needed) — env-aware for the actual value: `SSE_PORT` if
   * set, else `PORT + 1000` (one above the API convention), else `3000`, so
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
   * Defer attaching the SSE routes until {@link RealtimeProvider.attachHttpServer}
   * is called, instead of binding a standalone HTTP server eagerly at
   * creation. Used by the server factory so SSE attaches to the API's HTTP
   * server (shared port) once it exists — avoiding a standalone port a
   * sandbox/proxy may not expose and that collides with the API's own port
   * by default. Ignored when `httpServer` is already provided (that is
   * itself an explicit attach — see the module `@remarks`). Zero-config
   * (no `port`, no `httpServer`, no `deferAttach`) already behaves as if
   * this were `true` — set it explicitly for readability/intent at the call
   * site, not because it changes behavior over omitting it.
   *
   * @defaultValue false
   */
  deferAttach?: boolean

  /**
   * Base path for SSE endpoints.
   *
   * - `GET  {path}` — SSE event stream
   * - `POST {path}` — client-to-server messages (`{ clientId, event, data, room? }`;
   *   `clientId` is REQUIRED — it arrives in the stream's initial `connected` event)
   *
   * @defaultValue '/sse'
   */
  path?: string

  /**
   * Interval (ms) between keep-alive comment lines sent to prevent
   * intermediary proxies from closing idle connections.
   *
   * @defaultValue 30000
   */
  keepAliveInterval?: number

  /**
   * Custom headers to include in the SSE response.
   */
  headers?: Record<string, string>

  /**
   * CORS origin for the SSE endpoint (`Access-Control-Allow-Origin`). Set to
   * `'*'` to allow all origins, or a single origin string for a locked-down
   * deployment.
   *
   * When omitted: outside production, defaults to `'*'` (dev convenience —
   * no cross-origin risk to a real user). **In production** (`NODE_ENV ===
   * 'production'`), defaults instead to `process.env.APP_ORIGIN ??
   * process.env.SITE_ORIGIN` (the same env vars `@molecule/api-middleware-cors-express`
   * reads for its allowlist) when either is set, so the realtime endpoints
   * are NOT exposed cross-origin by default in production. If production AND
   * neither is set, falls back to `'*'` but logs an actionable warning (auth
   * via query params/`Authorization` header still applies, and
   * credentialed-CORS rules still protect httpOnly-cookie flows, so exposure
   * is limited — but should still be closed by setting this explicitly).
   *
   * @defaultValue '*' outside production; `APP_ORIGIN`/`SITE_ORIGIN` in production when set
   */
  corsOrigin?: string
}
