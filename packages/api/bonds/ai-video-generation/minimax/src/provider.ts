/**
 * MiniMax implementation of AIVideoGenerationProvider.
 *
 * Talks to MiniMax's hosted H3 video API on `api.minimax.io` (the same host
 * and key the `@molecule/api-ai-minimax` chat bond uses) through its
 * asynchronous task flow: `POST /v2/video_generation` to submit (returns a
 * `task_id`), `GET /v2/query/video_generation/{task_id}` to poll
 * (`queued`/`running` → `succeeded` | `failed` | `cancelled`). Video comes
 * back with NATIVE synchronized stereo audio — there is no audio switch.
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
  VideoJobState,
  VideoJobStatus,
} from '@molecule/api-ai-video-generation'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { MinimaxVideoGenerationConfig } from './types.js'

/** Default API base URL — MiniMax's international platform host. */
export const DEFAULT_BASE_URL = 'https://api.minimax.io'

/** Default model: the base H3 tier (the only tier with 2K output). */
export const DEFAULT_MODEL = 'MiniMax-H3'

/** The video model ids the V2 API's `model` enum accepts. */
export const MINIMAX_VIDEO_MODELS = [
  'MiniMax-H3',
  'MiniMax-H3-Highspeed',
  'MiniMax-H3-Lite',
  'MiniMax-H3-Max',
] as const

/** The output resolution buckets the API accepts (`2K` is base-H3-only). */
export const MINIMAX_VIDEO_RESOLUTIONS = ['480P', '768P', '2K'] as const

/** The concrete aspect ratios the API accepts (text-to-video requires one). */
export const MINIMAX_VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const

/**
 * Default clip length (seconds) when the caller sets none — the API requires
 * `duration`, the docs' own example uses 5, and 5 is the minimum EVERY tier
 * accepts (H3-Max starts at 5).
 */
export const DEFAULT_DURATION_SECONDS = 5

/** Default output resolution when the caller sets none (every tier accepts it). */
export const DEFAULT_RESOLUTION = '768P'

/** Default aspect ratio for text-to-video when the caller sets none (`adaptive` is not allowed there). */
export const DEFAULT_RATIO = '16:9'

/** Default per-request timeout (submit and query answer quickly; generation itself is async). */
export const DEFAULT_TIMEOUT_MS = 120_000

/** The submit endpoint's path. */
const SUBMIT_PATH = '/v2/video_generation'

/**
 * A whole path segment the WHATWG URL parser (what Node's `fetch` does with
 * the URL string) treats as a dot segment: the literal single/double-dot
 * forms plus every percent-encoded spelling, case-insensitive (URL Standard,
 * path state: single-dot is `.`/`%2e`, double-dot is `..`/`.%2e`/`%2e.`/
 * `%2e%2e`). A double-dot segment POPS a path segment during normalization,
 * so `%2e%2e` traverses exactly like a literal `..` — the encoded spellings
 * must be rejected just like the literal ones.
 */
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i

/**
 * Whether a raw task id can serve as this bond's job id: the id is
 * interpolated into the `/v2/query/video_generation/…` poll path, so `?`/`#`
 * would start a query or fragment, an empty `//` segment is not a shape the
 * poll path carries, and a dot segment (literal or percent-encoded — see
 * {@link DOT_SEGMENT}) would walk the authenticated GET out of the poll
 * path. Both ends enforce it: `generate()` before minting a job,
 * `getStatus()` again on what the caller passes back — so every job id
 * `generate()` returns round-trips.
 *
 * @param taskId - The raw task id the MiniMax API returned.
 * @returns `true` when the id can be polled as a path tail.
 */
function isPollableTaskId(taskId: string): boolean {
  return (
    !taskId.includes('?') &&
    !taskId.includes('#') &&
    !taskId.split('/').some((segment) => segment === '' || DOT_SEGMENT.test(segment))
  )
}

/** Shape of a submit response. */
interface MinimaxSubmitResponse {
  task_id?: string | null
  base_resp?: { status_code?: number; status_msg?: string } | null
}

/** One item of the submit request's `content` array. */
interface MinimaxContentItem {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url'
  text?: string
  image_url?: { url: string }
  role?: string
}

/** Shape of a query response's `task` object. */
interface MinimaxTask {
  id?: string | null
  model?: string | null
  status?: string | null
  error?: { code?: string | number | null; message?: string | null } | null
  created_at?: number | null
  updated_at?: number | null
  content?: { url?: string | null } | null
  resolution?: string | null
  duration?: number | null
  ratio?: string | null
}

/** Shape of a query response. */
interface MinimaxQueryResponse {
  task?: MinimaxTask | null
}

/**
 * Error thrown when the MiniMax API refuses or fails a request. Carries the
 * API's HTTP `status` (0 when it could not be reached or timed out) and the
 * error code from its error body. Deliberately NOT tagged with
 * `statusCode`/`errorKey`, so API middleware answers its generic 500 instead
 * of echoing the vendor's status to the caller.
 */
export class MinimaxVideoError extends Error {
  /** HTTP status from the MiniMax API; 0 for a network failure or timeout. */
  readonly status: number
  /** Error code from the MiniMax error body, when present. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status (0 for network failure/timeout).
   * @param code - MiniMax error code, when it sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, code?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MinimaxVideoError'
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
  promptExpansionMode: MinimaxVideoGenerationConfig['promptExpansionMode']
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
 * Converts a first-frame image to the `url` the content item accepts: a
 * public URL, an `mm_file://{file_id}` URI or a `data:` URI passes through
 * unchanged; a Buffer or bare base64 string is wrapped in a `data:` URI with
 * the MIME type sniffed from the bytes' magic number. The request body is
 * capped at 64 MB — prefer public URLs for large images.
 *
 * @param input - Buffer, base64 string, data URI, `mm_file:` URI or public URL.
 * @returns The value for the content item's `image_url.url` field.
 */
function toImageUrl(input: Buffer | string): string {
  if (typeof input === 'string' && /^(https?:\/\/|mm_file:|data:)/i.test(input.trim())) {
    return input.trim()
  }
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
  return `data:${mimeType};base64,${buf.toString('base64')}`
}

/**
 * Maps a `"WxH"` resolution to the API's nearest resolution bucket, by the
 * short edge: 480P ≈ short edge 480, 768P ≈ 768, 2K ≈ 1440. Boundaries sit
 * halfway between the buckets' short edges (624 and 1104).
 *
 * @param width - Video width in pixels.
 * @param height - Video height in pixels.
 * @returns The `480P` | `768P` | `2K` bucket.
 */
function resolutionBucket(
  width: number,
  height: number,
): (typeof MINIMAX_VIDEO_RESOLUTIONS)[number] {
  const shortEdge = Math.min(width, height)
  if (shortEdge <= 624) return '480P'
  if (shortEdge <= 1104) return '768P'
  return '2K'
}

/**
 * Maps a `"WxH"` resolution to the concrete aspect ratio the API accepts that
 * is closest to it (`adaptive` excluded — the caller of this helper needs a
 * concrete ratio).
 *
 * @param width - Video width in pixels.
 * @param height - Video height in pixels.
 * @returns The closest of `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
 */
function nearestRatio(width: number, height: number): (typeof MINIMAX_VIDEO_RATIOS)[number] {
  const target = Math.log(width / height)
  let best: (typeof MINIMAX_VIDEO_RATIOS)[number] = '16:9'
  let bestDistance = Number.POSITIVE_INFINITY
  for (const ratio of MINIMAX_VIDEO_RATIOS) {
    const [w, h] = ratio.split(':').map(Number)
    const distance = Math.abs(Math.log(w / h) - target)
    if (distance < bestDistance) {
      best = ratio
      bestDistance = distance
    }
  }
  return best
}

/**
 * Parses a `"WxH"` string into its dimensions.
 *
 * @param raw - The resolution string.
 * @returns The `[width, height]` pair, or `undefined` when malformed.
 */
function parseDimensions(raw: string): [number, number] | undefined {
  const match = /^(\d+)x(\d+)$/.exec(raw.trim())
  if (!match) return undefined
  const w = Number(match[1])
  const h = Number(match[2])
  return w > 0 && h > 0 ? [w, h] : undefined
}

/**
 * Converts a Unix timestamp in seconds to an ISO 8601 string.
 *
 * @param seconds - The Unix timestamp, when the API sent one.
 * @returns The ISO string, or `undefined` when absent or not finite.
 */
function isoFromUnixSeconds(seconds: number | null | undefined): string | undefined {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return undefined
  return new Date(seconds * 1000).toISOString()
}

/**
 * MiniMax video generation provider implementing `AIVideoGenerationProvider`
 * over the hosted V2 task API.
 */
class MinimaxVideoGenerationProvider implements AIVideoGenerationProvider {
  readonly name = 'minimax'
  private readonly config: MinimaxVideoGenerationConfig

  /**
   * Creates the provider. Nothing is read from the environment here — every
   * setting is resolved on each call so late-set secrets are honoured.
   *
   * @param config - Optional overrides; each falls back to its env var.
   */
  constructor(config: MinimaxVideoGenerationConfig = {}) {
    this.config = config
  }

  /**
   * Submit a text-to-video (or image-to-video, when `image` is set) job via
   * `POST /v2/video_generation`. `negativePrompt`, `seed`, `steps`,
   * `guidanceScale`, `fps` and `generateAudio` are not forwarded — the V2 API
   * has no such fields, and audio is ALWAYS generated natively.
   *
   * @param params - Prompt plus model, resolution, duration and ratio controls.
   * @returns The submitted job; poll `getStatus()` with its `id`.
   */
  async generate(params: VideoGenerateParams): Promise<VideoJob> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel
    if (!new Set<string>(MINIMAX_VIDEO_MODELS).has(model)) {
      throw new MinimaxVideoError(
        `"model" must be one of: ${MINIMAX_VIDEO_MODELS.join(', ')} (got "${model}").`,
        400,
      )
    }
    if (cfg.promptExpansionMode !== undefined && model !== 'MiniMax-H3-Max') {
      throw new MinimaxVideoError(
        `promptExpansionMode maps to extra.prompt_expansion_mode, which only MiniMax-H3-Max accepts (model is "${model}").`,
        400,
      )
    }

    const content: MinimaxContentItem[] = [{ type: 'text', text: params.prompt }]
    if (params.image !== undefined) {
      content.push({
        type: 'image_url',
        image_url: { url: toImageUrl(params.image) },
        role: 'first_frame',
      })
    }

    const body: Record<string, unknown> = {
      model,
      content,
      duration: this.resolveDuration(params, model),
      resolution: this.resolveResolution(params, model),
      ratio: this.resolveRatio(params, model),
    }
    if (cfg.promptExpansionMode !== undefined) {
      body.extra = { prompt_expansion_mode: cfg.promptExpansionMode }
    }

    const data = (await this.callJson(
      cfg,
      SUBMIT_PATH,
      'POST',
      body,
      true,
    )) as MinimaxSubmitResponse
    const taskId = data.task_id
    if (!taskId) {
      throw new MinimaxVideoError(
        `MiniMax API returned no task_id from POST ${SUBMIT_PATH}.${
          data.base_resp?.status_msg ? ` ${data.base_resp.status_msg}` : ''
        }`,
        502,
      )
    }
    if (!isPollableTaskId(taskId)) {
      // Enforce at the mint what getStatus()'s guard demands on the way back:
      // without this, an upstream id like "a?x" would spend the credits and
      // hand out a job id every later getStatus() refuses — an un-pollable
      // job whose error blames the caller for passing exactly what generate()
      // returned.
      throw new MinimaxVideoError(
        `MiniMax API returned a task id from POST ${SUBMIT_PATH} that this bond cannot poll back ("${taskId}") — task ids must not contain dot segments (including "%2e" spellings), empty segments, "?" or "#".`,
        502,
      )
    }
    return { id: taskId, model }
  }

  /**
   * Fetch a job's status via `GET /v2/query/video_generation/{task_id}`.
   * Pass the id exactly as `generate()` returned it. The API recommends
   * polling every ~10 s; a succeeded task's `result.url` EXPIRES on its own
   * (re-querying yields a fresh URL) and only the last 7 days of tasks are
   * queryable at all — download the video and re-host it promptly.
   *
   * @param jobId - The task id returned by `generate()`.
   * @returns The normalized job status.
   */
  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const cfg = this.resolveConfig()
    this.assertPollableJobId(jobId)
    const data = (await this.callJson(
      cfg,
      // Each tail segment is percent-encoded on the way in: whatever the
      // guard's shape list does not enumerate (`%2e%2e`, `%2f`, …) then
      // travels as its literal bytes — the URL parser can no longer
      // reinterpret it as a dot segment or a separator, so this
      // authenticated GET can only ever address the query path.
      `/v2/query/video_generation/${jobId.split('/').map(encodeURIComponent).join('/')}`,
      'GET',
      undefined,
      false,
    )) as MinimaxQueryResponse

    const task = data.task
    if (!task || !task.id) {
      throw new MinimaxVideoError(
        'MiniMax query endpoint returned no task object — the task id may be unknown, or older than the 7-day query window.',
        502,
      )
    }
    const rawStatus = task.status ?? ''
    const state = this.mapState(rawStatus)
    const completedAt = isoFromUnixSeconds(task.updated_at)
    const status: VideoJobStatus = {
      id: jobId,
      status: state,
      ...(task.model ? { model: task.model } : {}),
      ...(isoFromUnixSeconds(task.created_at)
        ? { createdAt: isoFromUnixSeconds(task.created_at) }
        : {}),
      ...((state === 'completed' || state === 'failed') && completedAt ? { completedAt } : {}),
    }
    if (state === 'completed') {
      const url = task.content?.url
      if (!url) {
        // A succeeded task with no video URL is undeliverable, and the URL is
        // never re-delivered outside a fresh query — returning `completed`
        // with an empty result would end every poll loop with no video and no
        // error. Fail as the typed 502 like every other malformed-2xx answer.
        throw new MinimaxVideoError(
          'MiniMax API reported a succeeded task with no content.url.',
          502,
        )
      }
      status.result = {
        url,
        mimeType: 'video/mp4',
        ...(typeof task.duration === 'number' ? { durationSeconds: task.duration } : {}),
      }
    } else if (state === 'failed') {
      const code =
        task.error?.code !== undefined && task.error?.code !== null
          ? String(task.error.code)
          : rawStatus === 'cancelled'
            ? 'cancelled'
            : undefined
      status.error = {
        ...(code ? { type: code } : {}),
        message:
          task.error?.message ??
          (rawStatus === 'cancelled'
            ? 'The MiniMax video task was cancelled.'
            : 'MiniMax video generation failed.'),
      }
    }
    return status
  }

  // The core's optional `upscale` is deliberately absent: the hosted API's
  // regeneration endpoint (`POST /v2/video_regeneration`, the 2K upscaler) is
  // a separate task type outside this bond's scope. Feature-detect
  // (`if (provider.upscale)`) as the core prescribes.

  /**
   * Maps the API's task status word to the core's lifecycle state. The API's
   * `cancelled` is terminal-but-not-succeeded, so it maps to `failed` with a
   * "cancelled" error from the caller's point of view.
   *
   * @param raw - The API's status word.
   * @returns The core's lifecycle state.
   * @throws {Error} On a status word the API does not document.
   */
  private mapState(raw: string): VideoJobState {
    switch (raw) {
      case 'queued':
        return 'pending'
      case 'running':
        return 'processing'
      case 'succeeded':
        return 'completed'
      case 'failed':
      case 'cancelled':
        return 'failed'
      default:
        throw new Error(
          `MiniMax API reported an unrecognized task status "${raw}" — the API may have changed.`,
        )
    }
  }

  /**
   * Resolves `duration`: an explicit `durationSeconds` wins (rounded to whole
   * seconds); with none, the bond default of 5 is sent (the API requires the
   * field). Valid ranges are 4–15 on every tier except MiniMax-H3-Max, which
   * starts at 5.
   *
   * @param params - The generate parameters.
   * @param model - The resolved model id.
   * @returns The integer duration in seconds.
   * @throws {MinimaxVideoError} When the value is not finite or out of range.
   */
  private resolveDuration(params: VideoGenerateParams, model: string): number {
    const minimum = model === 'MiniMax-H3-Max' ? 5 : 4
    if (params.durationSeconds === undefined) return DEFAULT_DURATION_SECONDS
    // A non-finite value must not ride the wire as a broken number the API
    // then interprets on its own.
    if (!Number.isFinite(params.durationSeconds)) {
      throw new MinimaxVideoError(
        `"durationSeconds" must be a finite number of seconds (got ${params.durationSeconds}).`,
        400,
      )
    }
    const duration = Math.round(params.durationSeconds)
    if (duration < minimum || duration > 15) {
      throw new MinimaxVideoError(
        `"durationSeconds" must be ${minimum}-15 for ${model} (got ${params.durationSeconds}).`,
        400,
      )
    }
    return duration
  }

  /**
   * Resolves `resolution`: an explicit `resolution` string (`"WxH"`) wins,
   * then `width`x`height` (both required — a lone dimension is ignored),
   * snapped to the nearest of the API's `480P`/`768P`/`2K` buckets; with no
   * dimensions the bond default `768P` is sent. 2K is base-H3-only; base H3
   * has no 480P.
   *
   * @param params - The generate parameters.
   * @param model - The resolved model id.
   * @returns The resolution bucket.
   * @throws {MinimaxVideoError} When the bucket is unavailable on the model,
   *   or an explicit `resolution` is not a `"WxH"` string.
   */
  private resolveResolution(
    params: VideoGenerateParams,
    model: string,
  ): (typeof MINIMAX_VIDEO_RESOLUTIONS)[number] {
    let bucket: (typeof MINIMAX_VIDEO_RESOLUTIONS)[number] = DEFAULT_RESOLUTION
    if (params.resolution !== undefined) {
      const dimensions = parseDimensions(params.resolution)
      if (!dimensions) {
        throw new MinimaxVideoError(
          `"resolution" must be a "WxH" string like "1920x1080" (got "${params.resolution}").`,
          400,
        )
      }
      bucket = resolutionBucket(dimensions[0], dimensions[1])
    } else if (params.width !== undefined && params.height !== undefined) {
      if (!Number.isFinite(params.width) || !Number.isFinite(params.height)) {
        throw new MinimaxVideoError(
          `"width"/"height" must be finite pixel counts (got ${params.width}x${params.height}).`,
          400,
        )
      }
      bucket = resolutionBucket(params.width, params.height)
    }
    if (bucket === '2K' && model !== 'MiniMax-H3') {
      throw new MinimaxVideoError(
        `"resolution" 2K is only available on MiniMax-H3 (model is "${model}").`,
        400,
      )
    }
    if (bucket === '480P' && model === 'MiniMax-H3') {
      throw new MinimaxVideoError(
        `"resolution" 480P is not available on MiniMax-H3 (768P or 2K only).`,
        400,
      )
    }
    return bucket
  }

  /**
   * Resolves `ratio`. Image-to-video is ALWAYS `adaptive` (the ratio follows
   * the input image — any other value is ignored by the API), and
   * MiniMax-H3-Lite has no `adaptive` support yet, so image-to-video on Lite
   * is refused here instead of failing server-side. Text-to-video requires a
   * CONCRETE ratio: one is derived from `resolution`/`width`/`height` when
   * present, else the bond default `16:9`.
   *
   * @param params - The generate parameters.
   * @param model - The resolved model id.
   * @returns The ratio value to send.
   * @throws {MinimaxVideoError} For image-to-video on MiniMax-H3-Lite.
   */
  private resolveRatio(
    params: VideoGenerateParams,
    model: string,
  ): 'adaptive' | (typeof MINIMAX_VIDEO_RATIOS)[number] {
    if (params.image !== undefined) {
      if (model === 'MiniMax-H3-Lite') {
        throw new MinimaxVideoError(
          'MiniMax-H3-Lite does not support the adaptive ratio, and image-to-video is always adaptive — this model cannot do image-to-video.',
          400,
        )
      }
      return 'adaptive'
    }
    const dimensions =
      params.resolution !== undefined
        ? parseDimensions(params.resolution)
        : params.width !== undefined && params.height !== undefined
          ? [params.width, params.height]
          : undefined
    if (dimensions) return nearestRatio(dimensions[0], dimensions[1])
    return DEFAULT_RATIO
  }

  /**
   * Validates a job id's shape before it is interpolated into the poll URL.
   * Must accept every id `generate()` returns — see {@link isPollableTaskId}.
   *
   * @param jobId - The id the caller passed.
   * @throws {MinimaxVideoError} When the id is not pollable.
   */
  private assertPollableJobId(jobId: string): void {
    if (!jobId || !isPollableTaskId(jobId)) {
      throw new MinimaxVideoError(
        `"${jobId}" is not a valid MiniMax task id — pass the id exactly as generate() returned it (it must not contain dot segments, empty segments, "?" or "#").`,
        400,
      )
    }
  }

  /**
   * Resolves configuration from overrides and env vars, at call time.
   *
   * @returns The resolved configuration.
   * @throws {Error} The tagged `config.notConfigured` error when no API key is set.
   */
  private resolveConfig(): ResolvedConfig {
    const apiKey = this.config.apiKey ?? process.env.MINIMAX_API_KEY
    if (!apiKey || !apiKey.trim()) {
      throw configNotConfiguredError('MINIMAX_API_KEY', 'MiniMax video generation')
    }
    return {
      baseUrl: normalizeBaseUrl(
        this.config.baseUrl ?? process.env.MINIMAX_BASE_URL ?? DEFAULT_BASE_URL,
      ),
      apiKey,
      defaultModel: this.config.defaultModel ?? (process.env.MINIMAX_VIDEO_MODEL || DEFAULT_MODEL),
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      promptExpansionMode: this.config.promptExpansionMode,
    }
  }

  /**
   * Sends one JSON (or bodyless) request with Bearer auth. Nothing is
   * retried: submitting a video task spends money, and a retry submits a
   * SECOND chargeable task.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param method - HTTP method.
   * @param body - Request body, if any.
   * @param hasBody - Whether a body is sent (sets the JSON content type).
   * @returns The parsed response.
   * @throws {MinimaxVideoError} On a network failure, timeout, non-2xx
   *   status, or a 2xx response whose body is not JSON.
   */
  private async callJson(
    cfg: ResolvedConfig,
    path: string,
    method: 'GET' | 'POST',
    body: Record<string, unknown> | undefined,
    hasBody: boolean,
  ): Promise<MinimaxSubmitResponse | MinimaxQueryResponse> {
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
      throw new MinimaxVideoError(
        `MiniMax request to ${url} failed: ${reason}`,
        0,
        undefined,
        error,
      )
    }

    if (!response.ok) {
      // Best-effort body read: the upstream already answered non-2xx, and a
      // connection reset while that body streams must not upgrade the typed
      // error to a raw `TypeError: terminated` — the status is what callers
      // key on; an unreadable body only degrades the detail message.
      const text = await response.text().catch((_error: unknown) => '')
      let detail = `HTTP ${response.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(text) as {
          error?: { message?: string; type?: string; code?: string | number }
          base_resp?: { status_code?: number; status_msg?: string }
          message?: string
        }
        const message = parsed.error?.message ?? parsed.base_resp?.status_msg ?? parsed.message
        if (message) detail = message
        const rawCode = parsed.error?.code ?? parsed.error?.type
        if (rawCode !== undefined && rawCode !== null) code = String(rawCode)
      } catch (_error) {
        // Not JSON — keep the raw body as the detail when it is short enough to read.
        if (text.length > 0 && text.length < 300) detail = text
      }
      throw new MinimaxVideoError(
        `MiniMax API error (${response.status}): ${detail}`,
        response.status,
        code,
      )
    }

    try {
      return (await response.json()) as MinimaxSubmitResponse | MinimaxQueryResponse
    } catch (error) {
      // A 2xx with a non-JSON body (a proxy/WAF interstitial, an empty 204)
      // must still surface as the typed error the contract promises — a raw
      // SyntaxError carries no `status`, so caller logic keyed on it (401 →
      // reauth, 429 → backoff) never fires. 502 = "the upstream's answer is
      // unusable", matching the malformed submit handling above.
      const reason = error instanceof Error ? error.message : String(error)
      throw new MinimaxVideoError(
        `MiniMax API error (502): 2xx response with a non-JSON body (HTTP ${response.status}): ${reason}`,
        502,
        undefined,
        error,
      )
    }
  }
}

/**
 * Creates a MiniMax video generation provider.
 *
 * @param config - Optional overrides (API key, base URL, default model, timeout).
 * @returns An `AIVideoGenerationProvider` backed by the MiniMax hosted API.
 */
export function createProvider(config?: MinimaxVideoGenerationConfig): AIVideoGenerationProvider {
  return new MinimaxVideoGenerationProvider(config)
}

/**
 * The default provider, configured from env vars on each call (wire with
 * `setProvider`). Safe to import before secrets are loaded.
 */
export const provider: AIVideoGenerationProvider = createProvider()
