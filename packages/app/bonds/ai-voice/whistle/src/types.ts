/**
 * Configuration types for the on-device Whistle voice provider.
 *
 * @module
 */

/**
 * Progress event emitted while the Whistle engine and weights download/initialize.
 */
export interface ModelProgressEvent {
  /** Lifecycle stage of the model load. */
  status: 'downloading' | 'loading' | 'ready' | 'error'
  /** Overall download progress from 0 to 100, when known. */
  progress?: number
  /** The file currently being fetched, when known. */
  file?: string
}

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
 * Configuration for the on-device Whistle voice provider.
 */
export interface WhistleVoiceConfig {
  /**
   * URL of the Cactus `needle.js` WASM glue file. `needle.wasm` is resolved
   * from the same directory. Default: the Hugging Face copy at
   * https://huggingface.co/Cactus-Compute/needle3/resolve/main/wasm/needle.js.
   * Self-host the three engine files same-origin (and pass this) when the app
   * has a Content-Security-Policy that blocks third-party scripts.
   */
  engineUrl?: string
  /**
   * URL of the `whistle.cact` weights file (16.9 MB). Default: the Hugging
   * Face copy at https://huggingface.co/Cactus-Compute/whistle/resolve/main/whistle.cact.
   */
  weightsUrl?: string
  /**
   * ISO 639-1 language to force for every transcription (one of `en de fr es
   * it nl pl`). Leave unset to auto-detect per chunk.
   */
  language?: WhistleLanguage
  /**
   * Words and phrases (or one newline-separated string) fed to Whistle's
   * keyword biasing — an Aho-Corasick automaton that steers transcription
   * toward names/product words (e.g. the project's identifiers). Explicit
   * opt-in only: biasing CHANGES transcripts, so never pass a large list "to
   * be helpful" — it can distort neutral words.
   */
  keywords?: string[] | string
  /**
   * Request per-word timestamps (start/end/probability). Off by default; when
   * on, transcript confidence is the average word probability instead of 1.
   */
  wordTimestamps?: boolean
  /**
   * Called with engine/weights download progress — wire this to a UI
   * indicator: the first use downloads ~18 MB (engine ~1 MB + weights
   * 16.9 MB; cached by the browser afterwards).
   */
  onModelProgress?: (event: ModelProgressEvent) => void
  /**
   * RMS amplitude above which a frame counts as speech. Default 0.01.
   */
  speechThreshold?: number
  /**
   * Milliseconds of silence after speech that closes a chunk and sends it
   * for transcription. Default 800.
   */
  silenceMs?: number
  /**
   * Hard cap on a single chunk's length in seconds — a chunk is flushed at
   * this size even without a pause. Default 15, clamped to 30 (Whistle's
   * per-pass window).
   */
  maxChunkSeconds?: number
}
