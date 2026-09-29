/**
 * Confucius4-R2T2 speech provider configuration.
 *
 * @module
 */

import type { RealtimeSocketFactory } from './socket.js'

/**
 * Configuration for the Confucius4-R2T2 speech provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface Confucius4SpeechConfig {
  /**
   * WebSocket URL of `ws_server.py`. Defaults to the `CONFUCIUS4_WS_URL` env
   * var, then `ws://127.0.0.1:8272/asr_stream_api_v1`.
   */
  wsUrl?: string
  /**
   * The `secret_key` sent in the header message. Defaults to
   * `CONFUCIUS4_SECRET_KEY`, then `test0102` (the server's hardcoded whitelist).
   */
  secretKey?: string
  /**
   * Context / hotword prompt (`system_prompt`, at most 4000 characters) used
   * when a call passes no `prompt`. Defaults to `CONFUCIUS4_SYSTEM_PROMPT`.
   */
  systemPrompt?: string
  /** `language` header value when a call passes none. Defaults to `'zhen'` (auto Chinese/English). */
  defaultLanguage?: string
  /** `use_vad` header value: let the server's Stream-VAD cut segments. Defaults to `false`. */
  useVad?: boolean
  /** `mode` header value. Defaults to `'slow'` (the reference client's value). */
  mode?: string
  /** `smooth` header value. Omitted unless set. */
  smooth?: boolean
  /**
   * How long a stream waits, after sending end-of-stream, for the server to
   * close the socket before it gives up. Defaults to 30000 ms.
   */
  finalTimeoutMs?: number
  /** WebSocket factory. Defaults to the runtime's global `WebSocket`. */
  socketFactory?: RealtimeSocketFactory
}
