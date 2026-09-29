/**
 * Audio8-ASR-Infinite speech provider configuration.
 *
 * @module
 */

import type { RealtimeSocketFactory } from './socket.js'

/** Languages Audio8-ASR-Infinite accepts. */
export type Audio8Language = 'zh' | 'en'

/**
 * Configuration for the Audio8-ASR-Infinite speech provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface Audio8SpeechConfig {
  /**
   * Realtime WebSocket URL. Defaults to the `AUDIO8_REALTIME_URL` env var, then
   * `ws://127.0.0.1:18191/v1/realtime` (the port the Docker Compose file publishes).
   */
  realtimeUrl?: string
  /**
   * Transcription delay in ms: 240–560 and a whole multiple of the server's
   * audio clock (80, 120 or 160 ms). Defaults to `AUDIO8_TARGET_DELAY_MS`, then 480.
   */
  targetDelayMs?: number
  /** Language used when a call passes none. Defaults to `'en'`. */
  defaultLanguage?: Audio8Language
  /** Model name sent in `session.update`. Defaults to `'audio8-asr-infinite'`. */
  model?: string
  /** Audio block size in ms sent per `input_audio_buffer.append`. Defaults to 100. */
  chunkMs?: number
  /**
   * How long a stream waits, after the audio ends, for `transcription.done`
   * before it gives up. Defaults to 30000 ms.
   */
  finalTimeoutMs?: number
  /** WebSocket factory. Defaults to the runtime's global `WebSocket`. */
  socketFactory?: RealtimeSocketFactory
}
