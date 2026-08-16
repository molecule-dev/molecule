/**
 * Types for `@molecule/api-proxy-agent`.
 *
 * @module
 */

import type { Agent as HttpAgent } from 'node:http'
import type { Agent as HttpsAgent } from 'node:https'

/**
 * An agent this package can hand to a vendor SDK. `http:` targets get an
 * `http.Agent`, `https:` targets an `https.Agent` — both tunnel through the
 * configured proxy.
 */
export type ProxyAgent = HttpAgent | HttpsAgent

/**
 * Options for {@link getProxyAgent} / {@link getProxyUrl} / {@link shouldProxy}.
 */
export interface ProxyAgentOptions {
  /**
   * Keep the tunnelled socket alive between requests. Defaults to `true`,
   * matching what every SDK in this class does with its own default agent —
   * a proxy agent that closes the socket per request would silently make a
   * chatty SDK (S3 multipart, SQS long-poll) far slower than it was before.
   */
  keepAlive?: boolean
}
