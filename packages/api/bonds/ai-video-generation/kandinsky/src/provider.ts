/**
 * Kandinsky 6.0 implementation of AIVideoGenerationProvider.
 *
 * Talks to a self-hosted vLLM-Omni server's Videos API: `POST /v1/videos`
 * (multipart) to submit, `GET /v1/videos/{id}` to poll, and
 * `GET /v1/videos/{id}/content` to download the finished MP4 (with its
 * generated audio track).
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AIVideoGenerationProvider,
  VideoGenerateParams,
  VideoJob,
  VideoJobResult,
  VideoJobState,
  VideoJobStatus,
} from '@molecule/api-ai-video-generation'
import { configNotConfiguredError } from '@molecule/api-secrets'

import {
  framesForDuration,
  isKandinskyDistilled,
  KANDINSKY_6_DEFAULT_SIZE,
  KANDINSKY_6_DISTILL_GUIDANCE_SCALE,
  KANDINSKY_6_DISTILL_STEPS,
  KANDINSKY_6_FPS,
  KANDINSKY_6_LITE_DISTILL_MODEL,
  kandinskyDimension,
} from './kandinsky.js'
import type { KandinskyVideoGenerationConfig } from './types.js'

/** Default per-request timeout: a busy GPU box can be slow to answer even a submit. */
export const DEFAULT_TIMEOUT_MS = 300_000

/**
 * How many finished jobs' downloaded videos the provider keeps. Bounded so a
 * long-lived instance cannot accumulate unbounded MP4 bytes (a few MB each at
 * the production geometry); past it the oldest entry is dropped and a re-poll
 * of that job simply downloads again.
 */
const CONTENT_CACHE_MAX = 8

/** Shape of a vLLM-Omni `POST /v1/videos` response (only `id` is load-bearing). */
interface KandinskySubmitResponse {
  id?: string | null
  status?: string | null
  created_at?: number | string | null
}

/** Shape of a vLLM-Omni `GET /v1/videos/{id}` response. */
interface KandinskyVideoResponse {
  id?: string | null
  status?: string | null
  model?: string | null
  created_at?: number | string | null
  completed_at?: number | string | null
  media_type?: string | null
  duration_s?: number | null
  expires_at?: number | string | null
  error?: { code?: number | string | null; message?: string | null } | null
}

/**
 * Error thrown when the vLLM-Omni server refuses or fails a request. Carries
 * the server's HTTP `status` (0 when the server could not be reached or timed
 * out) and its error code when it sent one. Deliberately NOT tagged with
 * `statusCode`/`errorKey`, so API middleware answers its generic 500 instead
 * of echoing the upstream status to the caller.
 */
export class KandinskyVideoError extends Error {
  /** HTTP status from the vLLM-Omni server; 0 for a network failure or timeout. */
  readonly status: number
  /** Error code from the server's error body, when present. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status (0 for network failure/timeout).
   * @param code - Server error code, when it sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, code?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'KandinskyVideoError'
    this.status = status
    this.code = code
  }
}

/** Resolved per-call configuration. */
interface ResolvedConfig {
  baseUrl: string
  apiKey: string | undefined
  defaultModel: string
  timeoutMs: number
}

/**
 * Normalizes a server base URL: strips trailing slashes and a trailing `/v1`
 * (the bond appends `/v1/videos` itself).
 *
 * @param raw - The configured base URL.
 * @returns The base URL without trailing slashes or `/v1`.
 */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
}

/**
 * Maps a vLLM-Omni job status onto the core's normalized states:
 * `queued` → `pending`, `in_progress` → `processing`, `completed`/`failed`
 * as-is. An unrecognized status word throws — a status this bond cannot
 * name is a protocol change the caller must hear about, not a state to
 * silently re-file as "still working" (an endless poll loop).
 *
 * @param raw - The status string from the server.
 * @returns The normalized `VideoJobState`.
 * @throws {Error} When the status is not one of the four documented values.
 */
function mapStatus(raw: string): VideoJobState {
  switch (raw) {
    case 'queued':
    case 'pending':
      return 'pending'
    case 'in_progress':
    case 'processing':
      return 'processing'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    default:
      throw new Error(
        `Kandinsky server reported an unrecognized job status "${raw}" — your vLLM-Omni version may be newer than this bond supports.`,
      )
  }
}

/**
 * Normalizes a vLLM-Omni timestamp: unix seconds (a number) become ISO 8601;
 * anything else is passed through only when it is a non-empty string.
 *
 * @param value - The timestamp from the server, when present.
 * @returns An ISO 8601 string, or `undefined`.
 */
function toIso(value: number | string | null | undefined): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString()
  }
  if (typeof value === 'string' && value.trim().length > 0) return value
  return undefined
}

/**
 * Converts a Buffer, base64 string or `data:` URL to a Blob for a multipart
 * upload, typed from the bytes' magic number (png, jpeg or webp).
 *
 * @param input - Buffer, base64 string, or base64 `data:` URL.
 * @returns A Blob carrying the image bytes.
 */
function toBlob(input: Buffer | string): Blob {
  const buf =
    typeof input === 'string'
      ? Buffer.from(input.replace(/^data:[^;,]+;base64,/, ''), 'base64')
      : input
  let type = 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) type = 'image/jpeg'
  else if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    type = 'image/webp'
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return new Blob([ab], { type })
}

/** File extension for a Blob's MIME type, used for the multipart filename. */
function extensionFor(blob: Blob): string {
  if (blob.type === 'image/jpeg') return 'jpg'
  if (blob.type === 'image/webp') return 'webp'
  return 'png'
}

/**
 * Kandinsky 6.0 video generation provider implementing
 * `AIVideoGenerationProvider` over a self-hosted vLLM-Omni server's Videos
 * API.
 */
class KandinskyVideoGenerationProvider implements AIVideoGenerationProvider {
  readonly name = 'kandinsky'
  private readonly config: KandinskyVideoGenerationConfig
  /**
   * Finished jobs' downloaded MP4s, keyed by job id. Insertion-ordered and
   * bounded ({@link CONTENT_CACHE_MAX}) — see {@link downloadContentOnce}.
   */
  private readonly contentCache = new Map<string, Promise<Buffer>>()

  /**
   * Creates the provider. Nothing is read from the environment here — every
   * setting is resolved on each call so late-set secrets are honoured.
   *
   * @param config - Optional overrides; each falls back to its env var.
   */
  constructor(config: KandinskyVideoGenerationConfig = {}) {
    this.config = config
  }

  /**
   * Submit a text-to-video (or image-to-video, when `image` is set) job via
   * `POST /v1/videos` (multipart). `image` becomes the `input_reference`
   * file part; `cameraMotion` is not forwarded (the Videos API has no camera
   * control).
   *
   * @param params - Prompt plus model, geometry and diffusion controls.
   * @returns The submitted job; poll `getStatus()` with its `id`.
   * @throws {Error} When a distilled checkpoint is combined with an explicit
   *   `guidanceScale` other than 1 — before any request is sent.
   */
  async generate(params: VideoGenerateParams): Promise<VideoJob> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel
    const distilled = isKandinskyDistilled(model)
    if (distilled && params.guidanceScale !== undefined && params.guidanceScale !== 1) {
      throw new Error(
        `Kandinsky distilled checkpoints (like ${model}) must run with guidanceScale 1 — ` +
          `${params.guidanceScale} gives silently wrong results (the base checkpoints' 5.0 setting does not apply; the model card calls this out).`,
      )
    }

    const fps = params.fps ?? KANDINSKY_6_FPS
    const form = new FormData()
    form.append('model', model)
    form.append('prompt', params.prompt)
    form.append('size', this.resolveSize(params))
    if (params.negativePrompt) form.append('negative_prompt', params.negativePrompt)
    if (params.fps !== undefined) form.append('fps', String(params.fps))
    if (params.durationSeconds !== undefined) {
      form.append('num_frames', String(framesForDuration(params.durationSeconds, fps)))
    }
    const steps = params.steps ?? (distilled ? KANDINSKY_6_DISTILL_STEPS : undefined)
    if (steps !== undefined) form.append('num_inference_steps', String(steps))
    const guidance =
      params.guidanceScale ?? (distilled ? KANDINSKY_6_DISTILL_GUIDANCE_SCALE : undefined)
    if (guidance !== undefined) form.append('guidance_scale', String(guidance))
    if (params.seed !== undefined) form.append('seed', String(params.seed))
    if (params.generateAudio !== undefined) {
      // Kandinsky samples its audio track by default; false is the opt-out.
      form.append('sample_audio', String(params.generateAudio))
    }
    if (params.image !== undefined) {
      const blob = toBlob(params.image)
      form.append('input_reference', blob, `first-frame.${extensionFor(blob)}`)
    }

    const data = (await this.call(cfg, '/v1/videos', 'POST', form, {})) as KandinskySubmitResponse
    if (!data.id) {
      throw new KandinskyVideoError(
        'Kandinsky server returned no job id from POST /v1/videos.',
        502,
      )
    }
    return { id: data.id, model, createdAt: toIso(data.created_at) }
  }

  /**
   * Fetch a job's status via `GET /v1/videos/{id}`. A completed job's result
   * carries the video: when the server enforces API-key auth, the content
   * URL answers 401 to anyone but this bond (only it holds the Bearer), so
   * the MP4 is downloaded here and returned inline as `data` — once per job,
   * with later polls of the same finished job reusing the downloaded bytes;
   * without auth, `url` points at the server's download endpoint
   * (`GET /v1/videos/{id}/content`) — fetch it before the server evicts the
   * output (`expires_at`, surfaced as `expiresAt`).
   *
   * @param jobId - The job id returned by `generate()` (the server's own id).
   * @returns The normalized job status.
   */
  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const cfg = this.resolveConfig()
    const data = (await this.call(
      cfg,
      `/v1/videos/${encodeURIComponent(jobId)}`,
      'GET',
      undefined,
      {},
    )) as KandinskyVideoResponse
    const rawStatus = data.status ?? ''
    const status = mapStatus(rawStatus)
    const result: VideoJobStatus = {
      id: data.id ?? jobId,
      status,
      ...(data.model !== undefined && data.model !== null ? { model: data.model } : {}),
      ...(toIso(data.created_at) !== undefined ? { createdAt: toIso(data.created_at) } : {}),
      ...(toIso(data.completed_at) !== undefined ? { completedAt: toIso(data.completed_at) } : {}),
    }
    if (status === 'completed') {
      // With a Bearer configured the bare content URL is useless to the
      // caller — fetch the bytes with this bond's credentials instead.
      const delivered: Pick<VideoJobResult, 'url' | 'data'> = cfg.apiKey
        ? { data: await this.downloadContentOnce(cfg, jobId) }
        : { url: `${cfg.baseUrl}/v1/videos/${encodeURIComponent(jobId)}/content` }
      result.result = {
        ...delivered,
        mimeType: data.media_type ?? 'video/mp4',
        ...(toIso(data.expires_at) !== undefined ? { expiresAt: toIso(data.expires_at) } : {}),
        ...(data.duration_s !== undefined && data.duration_s !== null
          ? { durationSeconds: data.duration_s }
          : {}),
      }
    }
    if (status === 'failed') {
      result.error = {
        ...(data.error?.code !== undefined && data.error?.code !== null
          ? { type: String(data.error.code) }
          : {}),
        message: data.error?.message ?? 'Kandinsky video generation failed.',
      }
    }
    return result
  }

  // The core's optional `upscale` is deliberately absent: the Kandinsky 6.0
  // video super-resolution (VSR) cascade is a separate Diffusers pipeline the
  // vLLM-Omni port does not serve ("not supported in this port" — the
  // Kandinsky recipe). Feature-detect (`if (provider.upscale)`) as the core
  // prescribes.

  /**
   * Resolves the size to send: an explicit `resolution` wins, then
   * `width`/`height` snapped to Kandinsky's 16-pixel grid, then the server's
   * registered production geometry (864×480).
   *
   * @param params - Width/height/resolution from the caller.
   * @returns The `WxH` size string to send.
   */
  private resolveSize(
    params: Pick<VideoGenerateParams, 'width' | 'height' | 'resolution'>,
  ): string {
    if (params.resolution) return params.resolution
    if (params.width !== undefined || params.height !== undefined) {
      const width = kandinskyDimension(params.width ?? 864)
      const height = kandinskyDimension(params.height ?? 480)
      return `${width}x${height}`
    }
    return KANDINSKY_6_DEFAULT_SIZE
  }

  /**
   * Resolves configuration from overrides and env vars, at call time.
   *
   * @returns The resolved configuration.
   * @throws {Error} The tagged `config.notConfigured` error when no base URL is set.
   */
  private resolveConfig(): ResolvedConfig {
    const rawBaseUrl = this.config.baseUrl ?? process.env.KANDINSKY_BASE_URL
    if (!rawBaseUrl || !rawBaseUrl.trim()) {
      throw configNotConfiguredError('KANDINSKY_BASE_URL', 'Kandinsky video generation')
    }
    return {
      baseUrl: normalizeBaseUrl(rawBaseUrl),
      apiKey: this.config.apiKey ?? (process.env.KANDINSKY_API_KEY || undefined),
      defaultModel:
        this.config.defaultModel ?? (process.env.KANDINSKY_MODEL || KANDINSKY_6_LITE_DISTILL_MODEL),
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }
  }

  /**
   * Sends one request and returns the raw (2xx) response. Nothing is
   * retried: a video run is expensive and a 503 usually means the diffusion
   * engine is still initialising, which a retry storm will not fix.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param method - HTTP method.
   * @param body - Request body (multipart form for POST, none for GET).
   * @param headers - Extra headers.
   * @returns The raw successful response.
   * @throws {KandinskyVideoError} On a network failure, timeout or non-2xx status.
   */
  private async send(
    cfg: ResolvedConfig,
    path: string,
    method: 'GET' | 'POST',
    body: FormData | undefined,
    headers: Record<string, string>,
  ): Promise<Response> {
    const url = `${cfg.baseUrl}${path}`
    const allHeaders: Record<string, string> = { ...headers }
    if (cfg.apiKey) allHeaders.Authorization = `Bearer ${cfg.apiKey}`

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: allHeaders,
        ...(body !== undefined ? { body } : {}),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new KandinskyVideoError(
        `Kandinsky request to ${url} failed: ${reason}`,
        0,
        undefined,
        error,
      )
    }

    if (!response.ok) {
      const text = await response.text()
      let detail = `HTTP ${response.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(text) as {
          error?: { message?: string; code?: string | number; type?: string }
          message?: string
          detail?: unknown
        }
        const message =
          parsed.error?.message ??
          parsed.message ??
          (typeof parsed.detail === 'string' ? parsed.detail : undefined)
        if (message) detail = message
        const rawCode = parsed.error?.code ?? parsed.error?.type
        if (rawCode !== undefined) code = String(rawCode)
      } catch (_error) {
        // Not JSON — keep the raw body as the detail when it is short enough to read.
        if (text.length > 0 && text.length < 300) detail = text
      }
      throw new KandinskyVideoError(
        `Kandinsky Videos API error (${response.status}): ${detail}`,
        response.status,
        code,
      )
    }

    return response
  }

  /**
   * Sends one request and parses its JSON body.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param method - HTTP method.
   * @param body - Request body (multipart form for POST, none for GET).
   * @param headers - Extra headers.
   * @returns The parsed response.
   * @throws {KandinskyVideoError} On a network failure, timeout, non-2xx
   *   status, or a 2xx response whose body is not JSON.
   */
  private async call(
    cfg: ResolvedConfig,
    path: string,
    method: 'GET' | 'POST',
    body: FormData | undefined,
    headers: Record<string, string>,
  ): Promise<KandinskySubmitResponse | KandinskyVideoResponse> {
    const response = await this.send(cfg, path, method, body, headers)
    try {
      return (await response.json()) as KandinskySubmitResponse | KandinskyVideoResponse
    } catch (error) {
      // A 2xx with a non-JSON body (a proxy interstitial, an empty 204) must
      // still surface as the typed error the contract promises — a raw
      // SyntaxError carries no `status`, so caller logic keyed on it (401 →
      // reauth, 429 → backoff) never fires. 502 = "the upstream's answer is
      // unusable", matching the no-job-id handling; the real upstream status
      // rides in the message.
      const reason = error instanceof Error ? error.message : String(error)
      throw new KandinskyVideoError(
        `Kandinsky Videos API error (502): 2xx response with a non-JSON body (HTTP ${response.status}): ${reason}`,
        502,
        undefined,
        error,
      )
    }
  }

  /**
   * Downloads a completed job's MP4 from `GET /v1/videos/{id}/content` with
   * this bond's Bearer token. Used when the server enforces API-key auth:
   * the bare content URL would 401 for whoever consumes the job status, so
   * the video is delivered inline instead.
   *
   * @param cfg - Resolved configuration.
   * @param jobId - The job id (the server's own id).
   * @returns The raw MP4 bytes.
   * @throws {KandinskyVideoError} On a network failure, timeout or non-2xx
   *   status — including when the server already evicted the output.
   */
  private async downloadContent(cfg: ResolvedConfig, jobId: string): Promise<Buffer> {
    const response = await this.send(
      cfg,
      `/v1/videos/${encodeURIComponent(jobId)}/content`,
      'GET',
      undefined,
      {},
    )
    return Buffer.from(await response.arrayBuffer())
  }

  /**
   * Downloads a completed job's MP4 at most ONCE per job: the first poll that
   * observes `completed` transfers the bytes off the GPU box and every later
   * poll of the same job (a UI re-poll, a reconciliation sweep over finished
   * jobs) reuses them — without this, each re-poll re-transfers the full video
   * on a fresh timeout-bounded connection and turns a completed job into a new
   * failure point. Concurrent polls share one transfer (the in-flight promise
   * is what gets cached).
   *
   * A failed transfer is evicted so the next poll retries it — an output the
   * server already evicted keeps failing, exactly as before.
   *
   * @param cfg - Resolved configuration.
   * @param jobId - The job id (the server's own id).
   * @returns The raw MP4 bytes (a shared promise while a transfer runs).
   * @throws {KandinskyVideoError} On a network failure, timeout or non-2xx
   *   status — including when the server already evicted the output.
   */
  private downloadContentOnce(cfg: ResolvedConfig, jobId: string): Promise<Buffer> {
    const cached = this.contentCache.get(jobId)
    if (cached) return cached
    const download = this.downloadContent(cfg, jobId)
    if (this.contentCache.size >= CONTENT_CACHE_MAX) {
      const oldest = this.contentCache.keys().next().value
      if (oldest !== undefined) this.contentCache.delete(oldest)
    }
    this.contentCache.set(jobId, download)
    // A rejected download must not poison the entry. The rejection still
    // reaches the caller through `download` itself; this handler only evicts
    // so a retried poll can succeed.
    download.catch((_error: unknown) => {
      // Evict only OUR entry — a later retry may already have replaced it.
      if (this.contentCache.get(jobId) === download) this.contentCache.delete(jobId)
    })
    return download
  }
}

/**
 * Creates a Kandinsky video generation provider.
 *
 * @param config - Optional overrides (base URL, API key, default model, timeout).
 * @returns An `AIVideoGenerationProvider` backed by a vLLM-Omni server.
 */
export function createProvider(config?: KandinskyVideoGenerationConfig): AIVideoGenerationProvider {
  return new KandinskyVideoGenerationProvider(config)
}

/**
 * The default provider, configured from env vars on each call (wire with
 * `setProvider`). Safe to import before secrets are loaded.
 */
export const provider: AIVideoGenerationProvider = createProvider()
