/**
 * AIVideoGeneration provider interface.
 *
 * Defines the contract for AI video generation providers (LTX-2.5 hosted,
 * self-hosted Kandinsky 6.0 via vLLM-Omni, etc.). Bond packages implement
 * this interface to provide concrete implementations.
 *
 * @module
 */

/**
 * Camera motion presets (LTX-style). Providers without camera control ignore
 * the parameter.
 */
export type VideoCameraMotion =
  | 'dolly_in'
  | 'dolly_out'
  | 'dolly_left'
  | 'dolly_right'
  | 'jib_up'
  | 'jib_down'
  | 'static'
  | 'focus_shift'

/**
 * Parameters for generating a short video clip (with audio, when the model
 * supports it) from a text prompt and optionally a first-frame image.
 */
export interface VideoGenerateParams {
  /** Text description of the desired video. */
  prompt: string
  /** Negative prompt — things to exclude from the video. */
  negativePrompt?: string
  /**
   * First frame for image-to-video, as a Buffer of image bytes, a
   * base64-encoded string, or (provider permitting) a URI the provider can
   * fetch. Ignored by text-only paths.
   */
  image?: Buffer | string
  /** Model to use for generation (provider-specific). */
  model?: string
  /** Width of the generated video in pixels. */
  width?: number
  /** Height of the generated video in pixels. */
  height?: number
  /** Resolution as a "WxH" string (e.g. "1920x1080"). Alternative to width/height. */
  resolution?: string
  /** Frame rate in frames per second. */
  fps?: number
  /** Clip length in seconds. Omit for provider/automatic duration where supported. */
  durationSeconds?: number
  /** Whether to generate a synchronized audio track. */
  generateAudio?: boolean
  /** Random seed for reproducible generation. */
  seed?: number
  /** Number of inference steps. Higher = more detail, slower. */
  steps?: number
  /** Guidance scale / CFG scale — how closely to follow the prompt. */
  guidanceScale?: number
  /** Optional camera motion preset. Providers without camera control ignore it. */
  cameraMotion?: VideoCameraMotion
}

/**
 * A submitted video generation job. Generation takes seconds to minutes —
 * poll `getStatus()` with the `id` until it is terminal.
 */
export interface VideoJob {
  /** Job identifier — pass verbatim to `getStatus()`. Provider-opaque. */
  id: string
  /** The model the job was submitted to. */
  model: string
  /** When the job was created (ISO 8601), when the provider reports it. */
  createdAt?: string
}

/** Lifecycle state of a video job. */
export type VideoJobState = 'pending' | 'processing' | 'completed' | 'failed'

/** Error payload of a failed job. */
export interface VideoJobError {
  /** Machine-readable error type/code, when the provider sends one. */
  type?: string
  /** Human-readable description of the failure. */
  message: string
}

/** The generated video, once the job has completed. */
export interface VideoJobResult {
  /** URL of the generated video. Often short-lived — download promptly. */
  url?: string
  /** The raw video bytes, when the provider returns them inline. */
  data?: Buffer
  /** MIME type of the video (e.g. 'video/mp4'). */
  mimeType?: string
  /** Clip length in seconds, when the provider reports it. */
  durationSeconds?: number
  /** The seed used, when the provider reports or echoes it. */
  seed?: number
}

/** Status of a video generation job, from `getStatus()`. */
export interface VideoJobStatus {
  /** Job identifier, as returned by `generate()`. */
  id: string
  /** Lifecycle state. `completed` carries `result`; `failed` carries `error`. */
  status: VideoJobState
  /** The model that serves the job, when the provider reports it. */
  model?: string
  /** When the job was created (ISO 8601), when the provider reports it. */
  createdAt?: string
  /** When the job reached a terminal state (ISO 8601), when the provider reports it. */
  completedAt?: string
  /** Why the job failed — present when `status` is `'failed'`. */
  error?: VideoJobError
  /** The generated video — present when `status` is `'completed'`. */
  result?: VideoJobResult
}

/**
 * Parameters for upscaling a generated video (Kandinsky VSR / LTX two-stage
 * style super-resolution). Unsupported providers leave `upscale` undefined.
 */
export interface VideoUpscaleParams {
  /** The source video as a Buffer of MP4 bytes or a URL. */
  video: Buffer | string
  /** Upscale factor (e.g. 2, 2.25, 4). */
  factor?: number
  /** Prompt to guide the upscaling (if supported). */
  prompt?: string
}

/**
 * AIVideoGeneration provider interface.
 *
 * Providers generate short video clips (usually with a synchronized audio
 * track) from text prompts and optional first-frame images. Generation is
 * asynchronous everywhere: `generate()` submits and returns a job handle;
 * `getStatus()` polls it to a terminal state.
 */
export interface AIVideoGenerationProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Submit a text-to-video (or image-to-video, when `image` is set) job.
   *
   * @param params - Prompt plus model, resolution, duration and diffusion controls.
   * @returns The submitted job; poll `getStatus()` with its `id`.
   */
  generate(params: VideoGenerateParams): Promise<VideoJob>

  /**
   * Fetch the current status of a job.
   *
   * @param jobId - The `id` returned by `generate()`.
   * @returns The job's state, error (when failed) and result (when completed).
   */
  getStatus(jobId: string): Promise<VideoJobStatus>

  /**
   * Upscale a generated video to a higher resolution. Not all providers
   * support this operation.
   *
   * @param params - Source video and target factor.
   * @returns The upscale job; poll `getStatus()` with its `id`.
   */
  upscale?(params: VideoUpscaleParams): Promise<VideoJob>
}

/**
 * Base configuration for AI video generation providers.
 */
export interface AIVideoGenerationConfig {
  /** API key for the video generation service. */
  apiKey?: string
  /** Default model to use for generation. */
  defaultModel?: string
  /** Base URL override (for self-hosted endpoints or brokers). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
