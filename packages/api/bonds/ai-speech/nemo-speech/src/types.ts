/**
 * NeMo-Speech.cpp speech provider configuration.
 *
 * @module
 */

import type { RealtimeSocketFactory } from './socket.js'

/**
 * Configuration for the NeMo-Speech.cpp speech provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface NemoSpeechConfig {
  /**
   * Server base URL (`nemo-speech serve`), without `/v1`. Defaults to the
   * `NEMO_SPEECH_URL` env var, then `http://127.0.0.1:8080`.
   */
  baseUrl?: string
  /**
   * API key, sent as `Authorization: Bearer …` — only needed when the server
   * was started with `--api-key`. Defaults to `NEMO_SPEECH_API_KEY`.
   */
  apiKey?: string
  /** Model sent as the `model` form field when a call passes none. Omitted by default. */
  defaultModel?: string
  /** Per-request HTTP timeout in milliseconds. Defaults to 300000. */
  timeoutMs?: number
  /**
   * How long a stream waits, after the audio ends, for the server's final
   * `completed` event before it gives up. Defaults to 30000 ms.
   */
  finalTimeoutMs?: number
  /**
   * A raw `session.update` event body sent right after `session.created` on
   * streaming connections (e.g. to turn on streaming diarization). Its field
   * names are defined by the server's `docs/server.md`; the bond sends it
   * verbatim with `type: 'session.update'` added. Omitted by default.
   */
  sessionUpdate?: Record<string, unknown>
  /** WebSocket factory for streaming. Defaults to the runtime's global `WebSocket`. */
  socketFactory?: RealtimeSocketFactory
}
