/**
 * Configuration types for the on-device NVIDIA Parakeet voice provider.
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
 * Configuration for the on-device Parakeet voice provider.
 */
export interface ParakeetVoiceConfig {
  /**
   * parakeet.js model key or Hugging Face repo id. Default:
   * 'parakeet-tdt-0.6b-v3' (multilingual). 'parakeet-tdt-0.6b-v2' is
   * English-only but slightly smaller/faster.
   */
  model?: string
  /**
   * Inference backend. 'auto' (default) picks WebGPU when available and
   * falls back to WASM.
   */
  backend?: 'auto' | 'webgpu' | 'wasm'
  /** Encoder weight quantization. Default 'int8' (smallest download). */
  encoderQuant?: 'int8' | 'fp16' | 'fp32'
  /** Decoder weight quantization. Default 'int8'. */
  decoderQuant?: 'int8' | 'fp16' | 'fp32'
  /**
   * Called with model download/initialization progress — wire this to a UI
   * indicator, since the first use downloads the model (hundreds of MB for
   * the 0.6B models; cached by the browser afterwards).
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
   * this size even without a pause. Default 15.
   */
  maxChunkSeconds?: number
}
