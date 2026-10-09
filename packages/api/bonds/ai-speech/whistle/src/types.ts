/**
 * Whistle speech provider configuration.
 *
 * @module
 */

/** The seven languages Whistle transcribes (auto-detected or forced). */
export type WhistleLanguage = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl' | 'pl'

/** Whistle's full language list, as ISO 639-1 codes. */
export const WHISTLE_LANGUAGES: readonly WhistleLanguage[] = [
  'en',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pl',
]

/**
 * Configuration for the Whistle speech provider. Every field falls back to
 * its env var, read on each call (never at import time). Local paths win over
 * URLs when both are set; with nothing set, the engine and weights are
 * fetched from Hugging Face on first use and cached in memory for the
 * process's lifetime.
 */
export interface WhistleSpeechConfig {
  /**
   * URL of the Cactus `needle.js` WASM glue. `needle.wasm` is resolved from
   * the same directory. Defaults to the `WHISTLE_ENGINE_URL` env var, then
   * the Hugging Face copy.
   */
  engineUrl?: string
  /**
   * URL of the `whistle.cact` weights (16.9 MB). Defaults to the
   * `WHISTLE_WEIGHTS_URL` env var, then the Hugging Face copy.
   */
  weightsUrl?: string
  /**
   * Local path to `needle.js` (requires `wasmPath`). Defaults to the
   * `NEEDLE_ENGINE_PATH` env var.
   */
  enginePath?: string
  /**
   * Local path to `needle.wasm` (requires `enginePath`). Defaults to the
   * `NEEDLE_WASM_PATH` env var.
   */
  wasmPath?: string
  /**
   * Local path to `whistle.cact` — the vendor's own env name
   * (`NEEDLE_WHISTLE_WEIGHTS`) is honoured. Wins over `weightsUrl`.
   */
  weightsPath?: string
  /**
   * ISO 639-1 language forced for every transcription (one of `en de fr es
   * it nl pl`). Leave unset to auto-detect.
   */
  defaultLanguage?: string
  /**
   * Words and phrases (or one newline-separated string) fed to Whistle's
   * keyword biasing when a call passes no `prompt`. Explicit opt-in only:
   * biasing CHANGES transcripts toward the given words.
   */
  defaultKeywords?: string[] | string
  /** Timeout for engine/weights downloads in milliseconds. Defaults to 120000. */
  downloadTimeoutMs?: number
}
