/**
 * LTX (Lightricks) implementation of AIVideoGenerationProvider.
 *
 * Talks to Lightricks' hosted LTX API's asynchronous V2 job flow:
 * `POST /v2/text-to-video` / `POST /v2/image-to-video` to submit (202 + job
 * id), `GET /v2/{endpoint}/{id}` to poll (`pending` → `processing` →
 * `completed` | `failed`), and the completed job's `result.video_url` to
 * download the MP4. The synchronous V1 endpoints are NOT used — they are
 * deprecated and stop working after October 26, 2026.
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
  VideoJobStatus,
} from '@molecule/api-ai-video-generation'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { LtxVideoGenerationConfig } from './types.js'

/** Default API base URL. */
export const DEFAULT_BASE_URL = 'https://api.ltx.io'

/** Default model: the fast LTX-2.5 tier. */
export const DEFAULT_MODEL = 'ltx-2-5-fast'

/** Default output resolution (720p landscape) when the caller sets none. */
export const DEFAULT_RESOLUTION = '1280x720'

/** The model ids the V2 API accepts. */
export const LTX_MODELS = ['ltx-2-3-fast', 'ltx-2-3-pro', 'ltx-2-5-fast', 'ltx-2-5-pro'] as const

/** The camera motions the V2 API accepts. */
export const LTX_CAMERA_MOTIONS = [
  'dolly_in',
  'dolly_out',
  'dolly_left',
  'dolly_right',
  'jib_up',
  'jib_down',
  'static',
  'focus_shift',
] as const

/** Default per-request timeout. */
export const DEFAULT_TIMEOUT_MS = 120_000

/** The submit endpoints this bond uses, mapped to their poll paths. */
const SUBMIT_ENDPOINTS = ['text-to-video', 'image-to-video'] as const

/** Prefix of every job id this bond hands out (it encodes the poll endpoint). */
const JOB_ID_PREFIX = 'ltx'

/** Shape of a V2 submit response (HTTP 202). */
interface LtxSubmitResponse {
  id?: string | null
  created_at?: string | null
}

/** Shape of a V2 job status response. */
interface LtxJobStatusResponse {
  id?: string | null
  status?: string | null
  created_at?: string | null
  completed_at?: string | null
  result?: Record<string, string> | null
  error?: { type?: string | null; message?: string | null } | null
}

/** Shape of a `POST /v1/upload` response. */
interface LtxUploadResponse {
  upload_url?: string | null
  storage_uri?: string | null
  required_headers?: Record<string, string> | null
}

/**
 * Error thrown when the LTX API refuses or fails a request. Carries the
 * API's HTTP `status` (0 when it could not be reached or timed out) and the
 * error `type` from its error body (`content_filtered_error`,
 * `insufficient_funds_error`, …). Deliberately NOT tagged with
 * `statusCode`/`errorKey`, so API middleware answers its generic 500 instead
 * of echoing the vendor's status to the caller.
 */
export class LtxVideoError extends Error {
  /** HTTP status from the LTX API; 0 for a network failure or timeout. */
  readonly status: number
  /** Error type from the LTX error body, when present. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status (0 for network failure/timeout).
   * @param code - LTX error type, when it sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, code?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'LtxVideoError'
    this.status = status
    this.code = code
  }
}

/** Resolved per-call configuration. */
interface ResolvedConfig {
  baseUrl: string
  apiKey: string
  defaultModel: string
  timeoutMs: number
}

/**
 * Normalizes an API base URL: strips trailing slashes.
 *
 * @param raw - The configured base URL.
 * @returns The base URL without trailing slashes.
 */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

/**
 * Whether a model id is an LTX-2.5 tier (the only tiers that accept
 * `duration: null` for automatic duration).
 *
 * @param model - The model id.
 * @returns `true` for `ltx-2-5-*` models.
 */
function isLtx25(model: string): boolean {
  return model.startsWith('ltx-2-5')
}

/**
 * Converts a Buffer, base64 string or `data:` URL to raw image bytes and a
 * sniffed MIME type (png, jpeg or webp).
 *
 * @param input - Buffer, base64 string, or base64 `data:` URL.
 * @returns The bytes and their MIME type.
 */
function toBytes(input: Buffer | string): { bytes: Buffer; mimeType: string } {
  const buf =
    typeof input === 'string'
      ? Buffer.from(input.replace(/^data:[^;,]+;base64,/, ''), 'base64')
      : input
  let mimeType = 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) mimeType = 'image/jpeg'
  else if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    mimeType = 'image/webp'
  return { bytes: buf, mimeType }
}

/**
 * LTX video generation provider implementing `AIVideoGenerationProvider`
 * over the hosted V2 async job API.
 */
class LtxVideoGenerationProvider implements AIVideoGenerationProvider {
  readonly name = 'ltx'
  private readonly config: LtxVideoGenerationConfig

  /**
   * Creates the provider. Nothing is read from the environment here — every
   * setting is resolved on each call so late-set secrets are honoured.
   *
   * @param config - Optional overrides; each falls back to its env var.
   */
  constructor(config: LtxVideoGenerationConfig = {}) {
    this.config = config
  }

  /**
   * Submit a text-to-video (or image-to-video, when `image` is set) job via
   * `POST /v2/text-to-video` / `POST /v2/image-to-video`. `negativePrompt`,
   * `seed`, `steps` and `guidanceScale` are not forwarded — the V2 API has
   * no such fields.
   *
   * @param params - Prompt plus model, resolution, duration and camera motion.
   * @returns The submitted job; poll `getStatus()` with its `id`.
   */
  async generate(params: VideoGenerateParams): Promise<VideoJob> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel
    if (!(LTX_MODELS as readonly string[]).includes(model)) {
      throw new LtxVideoError(
        `"model" must be one of: ${LTX_MODELS.join(', ')} (got "${model}").`,
        400,
      )
    }

    const endpoint = params.image !== undefined ? 'image-to-video' : 'text-to-video'
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      model,
      // `duration` is required but nullable: null = automatic duration,
      // which only the 2.5 tiers accept.
      duration: this.resolveDuration(params, model),
      resolution: this.resolveResolution(params),
    }
    if (params.fps !== undefined) body.fps = Math.round(params.fps)
    if (params.generateAudio !== undefined) body.generate_audio = params.generateAudio
    if (params.cameraMotion !== undefined) {
      if (!(LTX_CAMERA_MOTIONS as readonly string[]).includes(params.cameraMotion)) {
        throw new LtxVideoError(
          `"cameraMotion" must be one of: ${LTX_CAMERA_MOTIONS.join(', ')} (got "${params.cameraMotion}").`,
          400,
        )
      }
      body.camera_motion = params.cameraMotion
    }
    if (params.image !== undefined) body.image_uri = await this.resolveImageUri(params.image, cfg)

    const data = (await this.callJson(
      cfg,
      `/v2/${endpoint}`,
      'POST',
      body,
      true,
    )) as LtxSubmitResponse
    if (!data.id) {
      throw new LtxVideoError(`LTX API returned no job id from POST /v2/${endpoint}.`, 502)
    }
    return {
      id: `${JOB_ID_PREFIX}/${endpoint}/${model}/${data.id}`,
      model,
      ...(data.created_at ? { createdAt: data.created_at } : {}),
    }
  }

  /**
   * Fetch a job's status via `GET /v2/{endpoint}/{id}`. Job ids carry the
   * poll endpoint and model (`ltx/<endpoint>/<model>/<api id>`) — pass the
   * id exactly as `generate()` returned it. A completed job's `result.url`
   * is the API's output URL, which expires on its own — download it
   * immediately.
   *
   * @param jobId - The job id returned by `generate()`.
   * @returns The normalized job status.
   */
  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const cfg = this.resolveConfig()
    const [endpoint, model, apiId] = this.parseJobId(jobId)
    const data = (await this.callJson(
      cfg,
      `/v2/${endpoint}/${apiId}`,
      'GET',
      undefined,
      false,
    )) as LtxJobStatusResponse
    const rawStatus = data.status ?? ''
    const status: VideoJobStatus = {
      id: jobId,
      status: rawStatus as VideoJobStatus['status'],
      model,
      ...(data.created_at ? { createdAt: data.created_at } : {}),
      ...(data.completed_at ? { completedAt: data.completed_at } : {}),
    }
    if (rawStatus === 'completed') {
      status.result = {
        ...(data.result?.video_url ? { url: data.result.video_url } : {}),
        mimeType: 'video/mp4',
      }
    } else if (rawStatus === 'failed') {
      status.error = {
        ...(data.error?.type ? { type: data.error.type } : {}),
        message: data.error?.message ?? 'LTX video generation failed.',
      }
    } else if (rawStatus !== 'pending' && rawStatus !== 'processing') {
      throw new Error(
        `LTX API reported an unrecognized job status "${rawStatus}" — the API may have changed.`,
      )
    }
    return status
  }

  // The core's optional `upscale` is deliberately absent: the hosted V2 API
  // has no upscale endpoint (LTX's two-stage latent upsample is a local
  // Diffusers pipeline, not a hosted operation). Feature-detect
  // (`if (provider.upscale)`) as the core prescribes.

  /**
   * Resolves `duration`: an explicit value wins (rounded to whole seconds);
   * with none, 2.5 tiers send `null` (automatic duration — the API picks the
   * length from the prompt) and 2.3 tiers throw, because they have no
   * automatic-duration mode and a null would be rejected server-side.
   *
   * @param params - The generate parameters.
   * @param model - The resolved model id.
   * @returns The integer duration, or `null` for automatic duration.
   */
  private resolveDuration(params: VideoGenerateParams, model: string): number | null {
    if (params.durationSeconds !== undefined) return Math.max(1, Math.round(params.durationSeconds))
    if (isLtx25(model)) return null
    throw new LtxVideoError(
      `"durationSeconds" is required for ${model} — only the ltx-2-5 tiers support automatic duration (duration: null).`,
      400,
    )
  }

  /**
   * Resolves `resolution`: an explicit `resolution` string wins, then
   * `width`x`height` (both required — a lone dimension is ignored), then the
   * 720p default. Landscape and portrait `"WxH"` both pass through.
   *
   * @param params - The generate parameters.
   * @returns The `"WxH"` resolution string.
   */
  private resolveResolution(params: VideoGenerateParams): string {
    const raw =
      params.resolution ??
      (params.width !== undefined && params.height !== undefined
        ? `${params.width}x${params.height}`
        : DEFAULT_RESOLUTION)
    if (!/^\d+x\d+$/.test(raw)) {
      throw new LtxVideoError(
        `"resolution" must be a "WxH" string like "1920x1080" (got "${raw}").`,
        400,
      )
    }
    return raw
  }

  /**
   * Resolves the `image_uri` for image-to-video. An http(s) or `ltx:` URI
   * passes through unchanged; raw bytes (Buffer / base64 / data URL) are
   * uploaded through the API's own two-step (`POST /v1/upload` for a
   * pre-signed URL, then `PUT` the bytes) and the returned `storage_uri` is
   * used.
   *
   * @param image - The first-frame image.
   * @param cfg - Resolved configuration.
   * @returns The URI to send as `image_uri`.
   */
  private async resolveImageUri(image: Buffer | string, cfg: ResolvedConfig): Promise<string> {
    if (typeof image === 'string' && /^(https?:\/\/|ltx:)/i.test(image.trim())) {
      return image.trim()
    }
    const { bytes, mimeType } = toBytes(image)
    // The upload-ticket POST carries only auth — no body (the docs' own SDK
    // examples call it with the Authorization header alone).
    const upload = (await this.callJson(
      cfg,
      '/v1/upload',
      'POST',
      undefined,
      false,
    )) as LtxUploadResponse
    if (!upload.upload_url || !upload.storage_uri) {
      throw new LtxVideoError('LTX upload endpoint returned no upload_url/storage_uri.', 502)
    }
    const url = upload.upload_url
    // The pre-signed cloud-storage PUT carries the REQUIRED headers plus the
    // content type — never the API Bearer token (it is not an API endpoint).
    const headers: Record<string, string> = {
      ...(upload.required_headers ?? {}),
      'Content-Type': mimeType,
    }
    let response: Response
    try {
      response = await fetch(url, {
        method: 'PUT',
        headers,
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new LtxVideoError(`LTX file upload to ${url} failed: ${reason}`, 0, undefined, error)
    }
    if (!response.ok) {
      const text = await response.text()
      throw new LtxVideoError(
        `LTX file upload failed (${response.status}): ${text.length < 300 ? text : 'HTTP ' + response.status}`,
        response.status,
      )
    }
    return upload.storage_uri
  }

  /**
   * Splits a job id this bond issued back into its poll endpoint, model and
   * the API's raw job id. The id tail is validated as a pure path tail: it is
   * interpolated into the poll URL, so dot segments, query or fragment
   * characters are rejected (they would aim this authenticated GET at another
   * path on the host). Slash-separated ids remain intact.
   *
   * @param jobId - The id returned by `generate()`.
   * @returns The `[endpoint, model, apiId]` triple.
   * @throws {LtxVideoError} When the id was not issued by this bond, or its
   *   tail contains path-traversal / query / fragment characters.
   */
  private parseJobId(jobId: string): [string, string, string] {
    const parts = jobId.split('/')
    const [prefix, endpoint, model] = parts
    const apiId = parts.slice(3).join('/')
    if (
      prefix !== JOB_ID_PREFIX ||
      !(SUBMIT_ENDPOINTS as readonly string[]).includes(endpoint) ||
      !model ||
      !apiId
    ) {
      throw new LtxVideoError(
        `"${jobId}" is not an LTX job id — pass the id exactly as generate() returned it.`,
        400,
      )
    }
    // The tail goes straight into `/v2/${endpoint}/${apiId}`: a `..` segment
    // would walk out of `/v2/<endpoint>` and redirect this Bearer-authenticated
    // GET to any other path on the configured host (or a broker base URL), and
    // `?`/`#` would start a query or fragment instead of a path. Only ids this
    // bond's `generate()` could have built are accepted — those never contain
    // these shapes.
    if (
      apiId.includes('?') ||
      apiId.includes('#') ||
      apiId.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      throw new LtxVideoError(
        `"${jobId}" is not a valid LTX job id — the id tail must not contain ".", "..", empty, "?" or "#" segments.`,
        400,
      )
    }
    return [endpoint, model, apiId]
  }

  /**
   * Resolves configuration from overrides and env vars, at call time.
   *
   * @returns The resolved configuration.
   * @throws {Error} The tagged `config.notConfigured` error when no API key is set.
   */
  private resolveConfig(): ResolvedConfig {
    const apiKey = this.config.apiKey ?? process.env.LTXV_API_KEY
    if (!apiKey || !apiKey.trim()) {
      throw configNotConfiguredError('LTXV_API_KEY', 'LTX video generation')
    }
    return {
      baseUrl: normalizeBaseUrl(
        this.config.baseUrl ?? process.env.LTX_BASE_URL ?? DEFAULT_BASE_URL,
      ),
      apiKey,
      defaultModel: this.config.defaultModel ?? (process.env.LTX_MODEL || DEFAULT_MODEL),
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }
  }

  /**
   * Sends one JSON (or bodyless) request with Bearer auth.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param method - HTTP method.
   * @param body - Request body, if any.
   * @param hasBody - Whether a body is sent (sets the JSON content type).
   * @returns The parsed response.
   * @throws {LtxVideoError} On a network failure, timeout or non-2xx status.
   */
  private async callJson(
    cfg: ResolvedConfig,
    path: string,
    method: 'GET' | 'POST',
    body: Record<string, unknown> | undefined,
    hasBody: boolean,
  ): Promise<LtxSubmitResponse | LtxJobStatusResponse | LtxUploadResponse> {
    const url = `${cfg.baseUrl}${path}`
    const headers: Record<string, string> = { Authorization: `Bearer ${cfg.apiKey}` }
    if (hasBody) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new LtxVideoError(`LTX request to ${url} failed: ${reason}`, 0, undefined, error)
    }

    if (!response.ok) {
      const text = await response.text()
      let detail = `HTTP ${response.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(text) as {
          error?: { type?: string; message?: string }
          message?: string
        }
        const message = parsed.error?.message ?? parsed.message
        if (message) detail = message
        if (parsed.error?.type) code = parsed.error.type
      } catch (_error) {
        // Not JSON — keep the raw body as the detail when it is short enough to read.
        if (text.length > 0 && text.length < 300) detail = text
      }
      throw new LtxVideoError(
        `LTX API error (${response.status}): ${detail}`,
        response.status,
        code,
      )
    }

    return (await response.json()) as LtxSubmitResponse | LtxJobStatusResponse | LtxUploadResponse
  }
}

/**
 * Creates an LTX video generation provider.
 *
 * @param config - Optional overrides (API key, base URL, default model, timeout).
 * @returns An `AIVideoGenerationProvider` backed by the LTX hosted API.
 */
export function createProvider(config?: LtxVideoGenerationConfig): AIVideoGenerationProvider {
  return new LtxVideoGenerationProvider(config)
}

/**
 * The default provider, configured from env vars on each call (wire with
 * `setProvider`). Safe to import before secrets are loaded.
 */
export const provider: AIVideoGenerationProvider = createProvider()
