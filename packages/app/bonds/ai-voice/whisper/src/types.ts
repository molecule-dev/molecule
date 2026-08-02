/**
 * Configuration types for the on-device Whisper voice provider.
 *
 * @module
 */

/**
 * Progress event emitted while the speech model downloads/initializes.
 */
export interface ModelProgressEvent {
  /** Lifecycle stage of the model load. */
  status: 'downloading' | 'loading' | 'ready' | 'error'
  /** Overall download progress from 0 to 100, when known. */
  progress?: number
  /** The file currently being fetched, when known. */
  file?: string
}

/**
 * Configuration for the on-device Whisper voice provider.
 */
export interface WhisperVoiceConfig {
  /**
   * Hugging Face model id to run in the browser. Any transformers.js
   * automatic-speech-recognition model works — multilingual Whisper
   * (the default) or an English-only Moonshine model for lower latency.
   * Default: 'onnx-community/whisper-base'.
   */
  model?: string
  /**
   * Inference device. 'auto' (default) picks WebGPU when available and
   * falls back to WASM.
   */
  device?: 'auto' | 'webgpu' | 'wasm'
  /**
   * Model weight precision passed through to transformers.js. Leave unset
   * to use the library's per-device defaults.
   */
  dtype?: string | Record<string, string>
  /**
   * URL prefix (directory) the ONNX Runtime WASM/JS runtime files are served
   * from — e.g. '/transformers-ort/'. Without it, transformers.js falls back
   * to loading the runtime from the jsdelivr CDN, which any app with a
   * `script-src 'self'` CSP (correctly) blocks. Serve the
   * `ort-wasm-simd-threaded*` files from transformers.js's own
   * onnxruntime-web dependency (version must match).
   */
  wasmPaths?: string
  /**
   * Called with model download/initialization progress — wire this to a UI
   * indicator, since the first use downloads tens of MB (cached afterwards).
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
   * this size even without a pause. Default 12, max 30 (Whisper's window).
   */
  maxChunkSeconds?: number
}
