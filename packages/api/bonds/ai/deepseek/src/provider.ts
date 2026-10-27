/**
 * DeepSeek implementation of AIProvider.
 *
 * Uses the DeepSeek API (OpenAI-compatible) for streaming chat completions with
 * tool use and reasoning. DeepSeek's Chat Completions endpoint mirrors OpenAI's
 * wire format (tool_calls, reasoning_content, native and nested cache usage),
 * so this provider shares its shape with the xAI provider.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { URL } from 'node:url'

import type {
  AIProvider,
  AiRateLimitCallback,
  AiStreamStallCallback,
  AITool,
  ChatEvent,
  ChatMessage,
  ChatParams,
  ContentBlock,
  ImageInputSize,
  ImageInputTokenEstimate,
  ProviderResponseMeta,
  TokenUsage,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { DeepseekConfig } from './types.js'

/**
 * The call as the wire saw it, carried alongside the stream so the reply can be
 * checked against the request that asked for it.
 */
interface DeepseekCallContext {
  /**
   * Filled in as the response arrives (transport trace id off the headers, the
   * answer's own id and model off the stream) and reported on `done`.
   */
  readonly meta: ProviderResponseMeta
  /**
   * The `endUserId` this request sent, when it sent one. A host that echoes the
   * field back lets the reply be verified against it; one that does not (DeepSeek
   * itself) leaves the check inert.
   */
  readonly endUserId?: string
}

/** Native usage fields, with the nested OpenAI-compatible cache fallback. */
interface DeepseekUsage {
  prompt_tokens?: number
  completion_tokens?: number
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number }
}

/** Mutable state shared across SSE line-processing calls. */
interface DeepseekStreamState {
  /** Explicit upstream completion; an EOF or `[DONE]` is not a finish reason. */
  finishReason: 'stop' | 'tool_calls' | null
  /** Latest reported usage snapshots; explicit zero values remain meaningful. */
  usage: DeepseekUsage
  /**
   * Liveness frames received — data arrived that carried no content. A stream
   * that has produced NONE of these went completely silent; a high count is an
   * OPEN upstream dripping empty frames (DeepSeek's `: keep-alive` comments
   * during a long prefill). The two need different bounds, so they are counted
   * separately rather than inferred from the byte stream.
   */
  keepAlives: number
  /** Content characters streamed so far: 0 proves the reply never started. */
  streamedChars: number
  /** True once a content event (text / thinking / tool use) was produced. */
  contentSeen: boolean
}

/**
 * The two bounds on one attempt's stream, sharing one timer.
 *
 * - BEFORE the reply starts: the first-token window. It has to be measured in
 *   CONTENT, not bytes — a stalled upstream keeps the connection alive with
 *   empty frames, so a byte-level quiet period never arrives.
 * - AFTER the reply starts: the inter-chunk silence window, re-armed on every
 *   chunk. Bytes are the right measure there (any byte proves the socket is
 *   alive), and the reply is already partly on the wire, so this one is not
 *   retryable.
 *
 * `expired` records WHICH fired, because only the first is retryable and the
 * caller's catch must not treat a caller-cancelled stream as either.
 */
interface StreamBounds {
  /** Which bound expired, if any. */
  expired: 'before_content' | 'after_content' | null
  /** The armed timer, or null when nothing is armed. */
  timer: ReturnType<typeof setTimeout> | null
  /** When the armed window began — the stall an expiry reports. */
  windowStartedAt: number
}

/**
 * What the SSE reader needs to swap the first-token bound for the inter-chunk
 * silence bound once the reply has started.
 */
interface StreamBoundControl {
  /** The inter-chunk silence window, in milliseconds. */
  silenceMs: number
  /**
   * (Re-)arm the shared timer for `ms`, recording `phase` when it fires.
   *
   * @param ms - The window length.
   * @param phase - Which bound this window represents.
   */
  arm: (ms: number, phase: 'before_content' | 'after_content') => void
}

/** What one stalled attempt looked like, for the `onStreamStall` callback. */
interface StreamStallDetail {
  stallMs: number
  attempt: number
  willRetry: boolean
  streamedChars: number
  keepAlives: number
  phase: 'before_content' | 'after_content'
}

/**
 * Map thinking budget tokens to a DeepSeek reasoning_effort level, used ONLY as
 * a fallback when the caller supplies a budget without a resolved native level.
 * The native API accepts `low`/`high`/`max`; a caller that resolved one of them
 * (the catalog's `supportedEffortLevels`) sends it verbatim and never reaches
 * this function, so the fallback stays the two coarse buckets.
 *
 * @param budgetTokens - Requested thinking budget in tokens.
 * @returns `'high'` or `'max'` for the upstream effort hint.
 */
function budgetToEffort(budgetTokens: number): string {
  return budgetTokens >= 12_000 ? 'max' : 'high'
}

/** How long a stream may wait for its first content event. */
export const DEFAULT_FIRST_TOKEN_TIMEOUT_MS = 45_000

/** How long a stream that HAS started may go without a single byte. */
const DEFAULT_STREAM_SILENCE_TIMEOUT_MS = 60_000

/** Node's `setTimeout` ceiling: a larger delay is clamped to 1 ms, i.e. instant. */
const MAX_TIMER_MS = 2_147_483_647

/**
 * How many stop sequences DeepSeek accepts in one request ("Up to 16 sequences
 * where the API will stop generating further tokens", create-chat-completion).
 * A longer list is sent truncated rather than refused by the API.
 */
const MAX_STOP_SEQUENCES = 16

/**
 * Model ids DeepSeek documents as accepting image input (vision guide, read
 * 2026-10-25): `deepseek-flash` takes images alongside text, and the retired
 * `deepseek-v4-flash-vision-exp` id is still accepted and served by the latest
 * Flash model. Any other id — including one this bond's own `modelMap` sends to
 * a different host — has no documented image rule, so it answers unknown.
 *
 * A documented id is necessary but not sufficient: the ceiling is a fact about
 * DeepSeek's OWN backend, so it is applied only when the request is going to
 * DeepSeek's own documented endpoint (see {@link isNativeDeepseekEndpoint}).
 */
const VISION_MODEL_IDS: readonly string[] = ['deepseek-flash', 'deepseek-v4-flash-vision-exp']

/**
 * The image formats the vision guide lists as supported: JPEG, PNG, GIF and
 * WebP. A payload of any other type is not covered by the token rule.
 */
const VISION_MEDIA_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * DeepSeek's documented ceiling for ONE image, in input tokens: the guide states
 * "there is an upper bound of 1024 tokens per image", each image "counted
 * independently under the same rule" with no separate multi-image calculation.
 * Images below roughly 544×544 are scaled up and larger ones down to roughly
 * 1300×1300, so the bound holds whatever the source dimensions are — including
 * `detail: 'low'` (downscaled to 512×512) and `'original'`/`'auto'`.
 *
 * The request-level limits around it (32 MiB per base64 image, 8192 px per side,
 * images in `user` messages only) reject an unusable request rather than change
 * the price, so this bond prices the image alone and leaves message placement to
 * the caller that knows it.
 */
const VISION_TOKENS_PER_IMAGE_UPPER_BOUND = 1024

/**
 * The host DeepSeek documents as its own API endpoint. The per-image ceiling is
 * a fact about THIS backend's accounting; the same model ids served by a
 * gateway, a proxy or another OpenAI-compatible host are billed by that host's
 * rule, which this bond cannot point at documentation for.
 */
const NATIVE_ENDPOINT_HOST = 'api.deepseek.com'

/**
 * The chat-completions path DeepSeek documents, in both of its published base
 * URL forms: `https://api.deepseek.com` + `/chat/completions`, and
 * `https://api.deepseek.com/v1` + `/chat/completions` (this bond's default is
 * the root base with `/v1/chat/completions`).
 */
const NATIVE_COMPLETIONS_PATHS: readonly string[] = ['/v1/chat/completions', '/chat/completions']

/**
 * Whether the endpoint this bond will actually POST to is DeepSeek's own
 * documented HTTPS endpoint.
 *
 * The documented per-image ceiling belongs to DeepSeek's backend, and a
 * `baseUrl`, `DEEPSEEK_BASE_URL` or `completionsPath` can point this bond at a
 * gateway, a proxy or another provider's OpenAI-compatible host. Model alias
 * resolution alone cannot catch that: a custom endpoint may keep the native
 * model names, so the wire still says `deepseek-flash` while another backend
 * does the billing. Only the RESOLVED endpoint can say which backend it is.
 *
 * Parsed with the WHATWG URL parser, so the answer is about the endpoint as the
 * request will be sent: https only, the exact hostname, no explicit
 * non-default port (an explicit `:443` normalizes away, being the same
 * endpoint), no credentials, no query or fragment, and a pathname equal to one
 * of the two documented completions paths. Neither the parser nor the request
 * normalizes duplicate or trailing slashes, so a base URL carrying one composes
 * to a different path — `/v1/chat/completions/` or `//v1/chat/completions` —
 * which is not native; anything else (another host, a port, a query, a
 * fragment, an unparsable or relative URL) is not native either.
 *
 * Returns a boolean only: no part of the URL is logged, and nothing here reads,
 * echoes or reports a credential.
 *
 * @param endpoint - The resolved request URL, `baseUrl + completionsPath`.
 * @returns True only for DeepSeek's own documented endpoint.
 */
function isNativeDeepseekEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch (_error) {
    // Not a URL this bond can reason about, so the documented rule does not
    // apply. The caller answers unknown, which needs neither a log line nor an
    // echo of the value that failed to parse.
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.hostname !== NATIVE_ENDPOINT_HOST) return false
  if (url.port !== '') return false
  if (url.username !== '' || url.password !== '') return false
  if (url.search !== '' || url.hash !== '') return false
  return NATIVE_COMPLETIONS_PATHS.includes(url.pathname)
}

/**
 * Resolve a stream bound from the config, then the environment, then the
 * default. A value that is not a positive finite number is IGNORED rather than
 * armed: these values arm `setTimeout`, and a non-positive one (or one past
 * Node's 32-bit timer ceiling, which `setTimeout` clamps to 1 ms) would abandon
 * every stream on its first tick — turning a stall bound into a universal
 * failure.
 *
 * @param configured - The value from the provider config, when set.
 * @param envValue - The raw environment value, when set.
 * @param fallback - The default to use when neither resolves.
 * @returns Milliseconds for the bound.
 */
function resolveBoundMs(
  configured: number | undefined,
  envValue: string | undefined,
  fallback: number,
): number {
  for (const candidate of [configured, Number(envValue)]) {
    if (
      typeof candidate === 'number' &&
      Number.isFinite(candidate) &&
      candidate > 0 &&
      candidate <= MAX_TIMER_MS
    ) {
      return candidate
    }
  }
  return fallback
}

/**
 * The first-token bound, from the config, then
 * `MOL_DEEPSEEK_FIRST_TOKEN_TIMEOUT_MS`, then the default.
 *
 * @param configured - The value from {@link DeepseekConfig.firstTokenTimeoutMs}.
 * @returns Milliseconds to wait for the first content event.
 */
function resolveFirstTokenTimeoutMs(configured?: number): number {
  return resolveBoundMs(
    configured,
    process.env.MOL_DEEPSEEK_FIRST_TOKEN_TIMEOUT_MS,
    DEFAULT_FIRST_TOKEN_TIMEOUT_MS,
  )
}

/**
 * The post-content inter-chunk silence bound, from the config, then
 * `MOL_DEEPSEEK_STREAM_SILENCE_TIMEOUT_MS`, then the default.
 *
 * @param configured - The value from {@link DeepseekConfig.streamSilenceTimeoutMs}.
 * @returns Milliseconds a started stream may go without a byte.
 */
function resolveStreamSilenceTimeoutMs(configured?: number): number {
  return resolveBoundMs(
    configured,
    process.env.MOL_DEEPSEEK_STREAM_SILENCE_TIMEOUT_MS,
    DEFAULT_STREAM_SILENCE_TIMEOUT_MS,
  )
}

/**
 * Whether an event means the reply has STARTED, i.e. the first-token bound no
 * longer applies. A `keep_alive` is deliberately NOT content: it is exactly what
 * a stalled upstream keeps dripping, so treating it as progress would disarm the
 * bound on the one stream it exists to catch. `usage` and `done` are not content
 * either — a stream that reports usage and closes produced no reply.
 *
 * @param event - One event from the provider stream.
 * @returns True for the first real output of a reply.
 */
function isContentEvent(event: ChatEvent): boolean {
  return (
    event.type === 'text' ||
    event.type === 'thinking' ||
    event.type === 'tool_use' ||
    event.type === 'tool_use_start' ||
    event.type === 'tool_input_delta'
  )
}

/**
 * The first-token window expired before response HEADERS arrived.
 *
 * Module-private: the only consumer is this provider's own stall loop, which
 * reports it in the existing `before_content` shape and asks once more. It is
 * never thrown for a caller cancellation — a caller abort (or the whole-attempt
 * ceiling) outranks the window and is re-thrown untouched.
 */
class FirstTokenHeaderTimeoutError extends Error {
  constructor(readonly boundMs: number) {
    super(`DeepSeek sent no response headers within ${boundMs} ms`)
    this.name = 'FirstTokenHeaderTimeoutError'
  }
}

/**
 * DeepSeek AI provider that implements the `AIProvider` interface using
 * DeepSeek's OpenAI-compatible Chat Completions API with support for streaming,
 * tool use, and reasoning.
 */
class DeepseekAIProviderImpl implements AIProvider {
  readonly name = 'deepseek'
  private apiKey: string
  private defaultModel: string
  private maxTokens: number
  private baseUrl: string
  private completionsPath: string
  private modelMap: Record<string, string>
  private onRateLimit?: AiRateLimitCallback
  private onStreamStall?: AiStreamStallCallback
  private firstTokenTimeoutMs: number
  private streamSilenceTimeoutMs: number

  constructor(config: DeepseekConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.DEEPSEEK_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'deepseek-flash'
    this.maxTokens = config.maxTokens ?? 4096
    this.baseUrl = config.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com'
    this.completionsPath =
      config.completionsPath ?? process.env.DEEPSEEK_COMPLETIONS_PATH ?? '/v1/chat/completions'
    this.modelMap = config.modelMap ?? {}
    this.onRateLimit = config.onRateLimit
    this.onStreamStall = config.onStreamStall
    this.firstTokenTimeoutMs = resolveFirstTokenTimeoutMs(config.firstTokenTimeoutMs)
    this.streamSilenceTimeoutMs = resolveStreamSilenceTimeoutMs(config.streamSilenceTimeoutMs)

    // Fail fast with an actionable local error rather than a cryptic 401 on the
    // first request. The default `provider` export constructs lazily on first
    // use (see index.ts), so this surfaces the moment the provider is actually
    // used, not at bond/module-load time.
    if (!this.apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is not set. Add it to your environment to use the DeepSeek AI provider.',
      )
    }
  }

  /**
   * Sends a chat request and yields streamed events (text chunks, tool use, done/error).
   *
   * @param params - Chat parameters including messages, model, system prompt, and tools.
   * @yields {ChatEvent} Chat events including text chunks, tool use requests, done signals, and errors.
   */
  async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
    // Canonical catalog id (used everywhere else); translate to the upstream's
    // id only for the outbound request body via `modelMap`.
    const canonicalModel = params.model ?? this.defaultModel
    const model = this.modelMap[canonicalModel] ?? canonicalModel
    const maxTokens = params.maxTokens ?? this.maxTokens

    const messages = this.formatMessages(params.messages, params.system, Boolean(params.thinking))

    // Stop sequences, capped at the API's own limit. Verified honoured by the
    // native endpoint on 2026-10-17: with `stop: ['<analysis>']` a reply that
    // would have opened with that tag streamed nothing at all, and one that
    // reached it mid-answer ended there with the tag dropped from the text.
    const stop = (params.stop ?? []).filter((s) => s.length > 0).slice(0, MAX_STOP_SEQUENCES)
    if ((params.stop?.length ?? 0) > MAX_STOP_SEQUENCES) {
      logger.warn('DeepSeek takes at most 16 stop sequences — the rest were dropped', {
        requested: params.stop?.length,
      })
    }

    const body: Record<string, unknown> = {
      // Abuse attribution (see ChatParams.endUserId): OpenAI-compatible APIs
      // scope enforcement by `user`, so an abusive tenant can be actioned
      // individually instead of the org key that serves everyone. The value is
      // the caller's opaque hash — never derived or logged here.
      ...(params.endUserId ? { user: params.endUserId } : {}),
      model,
      // DeepSeek uses `max_tokens` (not OpenAI's newer `max_completion_tokens`,
      // which it silently ignores).
      max_tokens: maxTokens,
      messages,
      stream: params.stream !== false,
      ...(params.stream !== false ? { stream_options: { include_usage: true } } : {}),
      ...(stop.length > 0 ? { stop } : {}),
    }

    // Tools: merge custom tools (function format) and server tools
    const functions = params.tools?.length ? this.formatTools(params.tools) : []
    const serverTools = (params.serverTools ?? []).map((st) => ({ ...st }))
    const allTools = [...functions, ...serverTools]
    if (allTools.length > 0) {
      body.tools = allTools
      // DeepSeek REFUSES a forced tool choice while thinking is on — the request
      // 400s with "Thinking mode does not support this tool_choice", which kills
      // the turn outright. The caller asked for both; only one can be sent, so
      // the quality setting is kept and the nudge is degraded to 'auto': a
      // weaker nudge still produces a turn, and the agent loop has its own
      // prose-only backstops, whereas a 400 produces nothing at all.
      //
      // LIVE for an entry that exposes opt-in reasoning (deepseek-flash, whose
      // effort levels include a local `off` switch): a project that uses
      // low/high/max gets thinking mode on a discovery turn, and the forced
      // nudge is degraded here instead of 400ing the first turn of the
      // conversation.
      const forcedChoice =
        params.toolChoice === 'required' ||
        (typeof params.toolChoice === 'object' && params.toolChoice?.type === 'tool')
      if (forcedChoice && params.thinking) {
        console.warn(
          '[ai-deepseek] thinking is enabled, so the forced tool choice was relaxed to ' +
            '"auto" — DeepSeek rejects the combination (400: "Thinking mode does not ' +
            'support this tool_choice").',
        )
      } else if (params.toolChoice === 'required') {
        body.tool_choice = 'required'
      } else if (typeof params.toolChoice === 'object' && params.toolChoice?.type === 'tool') {
        body.tool_choice = { type: 'function', function: { name: params.toolChoice.name } }
      }
    }

    // DeepSeek V4 defaults `thinking` to ENABLED. Per DeepSeek's thinking-mode
    // guide (https://api-docs.deepseek.com/guides/thinking_mode/), a
    // thinking-mode request that carries tools must send every retained
    // assistant turn's `reasoning_content` back — including a turn where the
    // model made no tool call — or the API answers 400. `formatMessages` replays
    // `ChatMessage.reasoning` for exactly that reason. The catalog decides
    // whether a turn carries a thinking block. No block explicitly disables
    // reasoning below; a low/high/max block enables that native effort.
    if (params.thinking) {
      body.thinking = { type: 'enabled' }
      // Prefer a caller-resolved native value (`low` | `high` | `max`) from the
      // model catalog; fall back to the budget threshold.
      body.reasoning_effort = params.thinking.effort ?? budgetToEffort(params.thinking.budgetTokens)
    } else {
      body.thinking = { type: 'disabled' }
      if (params.temperature !== undefined) {
        body.temperature = params.temperature
      }
    }

    // Correlation for THIS call (see ChatParams.requestId). It rides a header
    // rather than the body's `user`: `user` is the stable per-user
    // abuse-attribution value the provider scopes enforcement by, and varying it
    // per request would make one account look like thousands. The header is
    // ignored by every OpenAI-compatible server and is here so the vendor can
    // find our request when a reply turns out not to belong to it.
    const requestId = params.requestId ?? randomUUID()
    // What the provider tells us about the call, reported on `done` (or logged
    // when the reply has to be dropped as foreign). `responseId` and `model`
    // come off the stream itself; the trace id off the response headers.
    const call: DeepseekCallContext = {
      meta: { requestId, endpoint: `${this.baseUrl}${this.completionsPath}` },
      endUserId: params.endUserId,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-Mol-Request-Id': requestId,
    }

    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const firstTokenTimeoutMs = this.firstTokenTimeoutMs
    const MAX_STALL_RETRIES = 1

    // A stream that OPENS and then produces no content is invisible to every
    // other signal this provider has: the request returns 200, no status is ever
    // wrong, and DeepSeek keeps a stalled prefill's connection alive with
    // `: keep-alive` comments — so a byte-level idle timeout stays quiet too.
    // Left alone, the whole first-token window is spent before anything notices.
    // Measured in production: on 2026-10-01 nine turns died this way in one
    // project, each spending 540-582 s — three 180 s windows of the chat
    // handler's progress watchdog, which was the ONLY bound on the stream, and
    // their own record named no provider time at all. Bound it here instead,
    // where the same request can simply be asked again.
    for (let stalledAttempt = 0; ; stalledAttempt++) {
      const controller = new AbortController()
      const forwardAbort = (): void => controller.abort()
      if (params.signal?.aborted) controller.abort()
      else params.signal?.addEventListener('abort', forwardAbort, { once: true })
      // The provider's own ceiling bounds each ATTEMPT; the caller's signal, when
      // present, still wins over it (both abort this one controller).
      const ceiling = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
      ceiling.unref?.()

      try {
        let response: Response
        let requestSentAt = 0
        try {
          const dispatched = await this.requestWithRateLimitRetries({
            body,
            headers,
            model,
            controller,
            // The first-token window covers an attempt that never receives
            // response HEADERS too, not only one that receives them and then
            // sends no content: a window that started at the headers left the
            // whole pre-header phase to the five-minute attempt ceiling alone.
            // Passing it only while streaming keeps the non-streaming path —
            // which has no first token to wait for — on that ceiling.
            ...(params.stream === false ? {} : { firstTokenTimeoutMs }),
          })
          response = dispatched.response
          requestSentAt = dispatched.sentAt
        } catch (error) {
          if (!(error instanceof FirstTokenHeaderTimeoutError) || params.signal?.aborted)
            throw error
          // Nothing reached the consumer, so the same once-only re-ask a
          // post-header stall gets is safe here too — reported in the
          // established `before_content` shape, so hosts and analytics see one
          // kind of stall either way.
          const willRetry = stalledAttempt < MAX_STALL_RETRIES
          this.reportStreamStall(model, {
            stallMs: error.boundMs,
            attempt: stalledAttempt + 1,
            willRetry,
            streamedChars: 0,
            keepAlives: 0,
            phase: 'before_content',
          })
          if (willRetry) continue
          yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
          return
        }

        // Whatever the transport exposes about this call. DeepSeek's edge
        // answers with `x-ds-trace-id`; other OpenAI-compatible hosts use
        // `x-request-id`. Recorded rather than read for control flow: it is the
        // handle a vendor investigation needs.
        const traceId =
          response.headers.get('x-ds-trace-id') ??
          response.headers.get('x-request-id') ??
          response.headers.get('request-id') ??
          undefined
        if (traceId) call.meta.traceId = traceId

        if (!response.ok) {
          const errorBody = await response.text()
          let detail = `HTTP ${response.status}`
          try {
            const parsed = JSON.parse(errorBody) as { error?: { message?: string } }
            if (parsed.error?.message) detail = parsed.error.message
          } catch (_error) {
            // JSON.parse failed — raw text is already in `errorBody`; use it as-is.
            if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
          }
          logger.error('DeepSeek API error', { status: response.status, detail, errorBody })
          // The status ladder decides what the CALLER can do, so every branch
          // must stay distinguishable downstream: the turn classifier keys on
          // these sentences, and an exhausted account must never read as
          // "try again" (2026-10-20: a −$0.09 DeepSeek account answered 402 on
          // every request and each one surfaced as the generic error — sixteen
          // benchmark runs died at their first request, indistinguishable from
          // an outage and each given a retry that could never succeed).
          const clientMessage =
            response.status === 429
              ? 'AI rate limit exceeded. Please try again shortly.'
              : response.status === 401
                ? // The status rides in the text: the turn classifier is
                  // text-only, and an auth failure must classify `auth`
                  // (never retried) — not the unknown bucket's pity retry.
                  'AI service configuration error (HTTP 401) — the API key was rejected.'
                : response.status === 402 ||
                    /insufficient balance|credit balance|payment required/i.test(detail)
                  ? // An exhausted account is a platform billing condition, not a
                    // request problem and not a transient outage — no retry can
                    // restore a negative balance.
                    'AI service is unavailable — provider credit balance too low.'
                  : response.status === 400 &&
                      /prompt is too long|too many tokens|token.*limit|context.*length/i.test(
                        detail,
                      )
                    ? "Conversation too long for the model's context window. Use /compact to free space, or start a new conversation."
                    : response.status === 400
                      ? 'AI request was invalid — check the model and request parameters.'
                      : response.status === 500 ||
                          response.status === 502 ||
                          response.status === 503 ||
                          response.status === 504 ||
                          response.status === 529
                        ? // The outage statuses the turn classifier reads as transient —
                          // one shared sentence, so a provider shed rides the retry
                          // ladder instead of killing the turn (was: 503 only).
                          'AI service is temporarily overloaded. Please try again in a moment.'
                        : // Anything else still names its status, so a never-before-seen
                          // code is classifiable (and 5xx-shaped ones ride `http 5xx`
                          // into the transient class) instead of a bare "try again".
                          `AI service error (HTTP ${response.status}). Please try again.`
          yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
          return
        }

        if (params.stream === false) {
          const data = (await response.json()) as Record<string, unknown>
          yield* this.parseNonStreamingResponse(data)
          return
        }

        const state: DeepseekStreamState = {
          finishReason: null,
          usage: {},
          keepAlives: 0,
          streamedChars: 0,
          contentSeen: false,
        }
        // Both bounds abort the same request; `expired` says which one did, and
        // `windowStartedAt` how long that one had been running — the stall is
        // the WINDOW that expired, not the time since the request went out (an
        // inter-chunk stall after a long reply would otherwise report minutes).
        const bounds: StreamBounds = { expired: null, timer: null, windowStartedAt: 0 }
        const armBound = (ms: number, phase: 'before_content' | 'after_content'): void => {
          if (bounds.timer) clearTimeout(bounds.timer)
          bounds.windowStartedAt = Date.now()
          bounds.timer = setTimeout(() => {
            bounds.expired = phase
            controller.abort()
          }, ms)
        }
        // Headers and content share this dispatch's existing first-token window.
        // A 429/503 retry has its own send time; deliberate backoff is excluded.
        armBound(Math.max(0, firstTokenTimeoutMs - (Date.now() - requestSentAt)), 'before_content')
        bounds.windowStartedAt = requestSentAt
        try {
          yield* this.parseStreamingResponse(
            response,
            state,
            { silenceMs: this.streamSilenceTimeoutMs, arm: armBound },
            call,
          )
        } catch (error) {
          // Only a bound expiry is this provider's to absorb — anything else
          // (the caller aborting, a socket failure) belongs to the caller.
          if (!bounds.expired || params.signal?.aborted) throw error
          const stall = {
            stallMs: Date.now() - bounds.windowStartedAt,
            attempt: stalledAttempt + 1,
            // Only a stream that never started may be asked again: a reply that
            // already partly reached the consumer would be duplicated.
            willRetry: bounds.expired === 'before_content' && stalledAttempt < MAX_STALL_RETRIES,
            streamedChars: state.streamedChars,
            keepAlives: state.keepAlives,
            phase: bounds.expired,
          }
          this.reportStreamStall(model, stall)
          if (stall.willRetry) continue
          // Out of retries, or the partial reply is already on the wire. Hand it
          // to the caller's own error ladder, which keeps the partial.
          yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
          return
        } finally {
          if (bounds.timer) clearTimeout(bounds.timer)
        }
        return
      } finally {
        clearTimeout(ceiling)
        params.signal?.removeEventListener('abort', forwardAbort)
      }
    }
  }

  /**
   * DeepSeek's own documented price for one image, in input tokens.
   *
   * Priced only when BOTH conditions hold: the request is going to DeepSeek's
   * own documented endpoint ({@link isNativeDeepseekEndpoint}), and the model
   * the wire will carry is a documented DeepSeek vision id. The alias is
   * resolved exactly the way {@link chat} resolves it — the bond's `modelMap`
   * first, a miss passing through unchanged — so a host that renames the model
   * on the wire (a US re-host) is priced under the id it actually serves, and a
   * custom endpoint that keeps the native names is still unknown because
   * another backend does the billing. Anything else — another model, another
   * format, another endpoint — is an explicit unknown rather than DeepSeek's
   * ceiling.
   *
   * @param image - The selected catalog model id and the image's media type.
   * @returns 1024 tokens per image for a documented vision model and a
   *   supported format on DeepSeek's own endpoint, otherwise an explicit
   *   unknown.
   */
  estimateImageInputTokens(image: ImageInputSize): ImageInputTokenEstimate {
    if (!isNativeDeepseekEndpoint(`${this.baseUrl}${this.completionsPath}`)) return { known: false }
    const upstream = this.modelMap[image.model] ?? image.model
    if (!VISION_MODEL_IDS.includes(upstream)) return { known: false }
    if (!VISION_MEDIA_TYPES.includes(image.mediaType.toLowerCase())) return { known: false }
    return { known: true, upperBoundTokens: VISION_TOKENS_PER_IMAGE_UPPER_BOUND }
  }

  /**
   * POST the chat body, retrying with exponential backoff on a rate-limited
   * (429) or overloaded (503) status. Extracted from {@link chat} so the
   * stream-level first-token retry can wrap it: a rate-limited request and a
   * stalled stream are different failures with different budgets, and nesting
   * them in one loop made each one's attempt count depend on the other's.
   *
   * @param args - The request body, headers, upstream model and abort signal.
   * @returns The response and the final dispatch send time (deliberate backoff excluded).
   */
  private async requestWithRateLimitRetries(args: {
    body: Record<string, unknown>
    headers: Record<string, string>
    model: string
    /**
     * This ATTEMPT's controller — the same one the caller's abort and the
     * whole-attempt ceiling abort. The pre-header window aborts it too, with
     * the window's own reason, so cancellation has one path and the reason is
     * what tells a stall apart from a caller cancel.
     */
    controller: AbortController
    /**
     * The first-token window, when the caller is streaming. Armed the moment
     * each network attempt is dispatched and cleared the moment that attempt's
     * response HEADERS arrive; the SSE reader carries its remaining time until
     * first content. Deliberately NOT armed across a 429/503
     * backoff sleep: that wait is this provider's own, and no upstream can
     * stall it, so the window must not spend itself there.
     */
    firstTokenTimeoutMs?: number
  }): Promise<{ response: Response; sentAt: number }> {
    const { body, headers, model, controller, firstTokenTimeoutMs } = args
    const signal = controller.signal
    // Retry with exponential backoff for rate limits (429) and overloaded (503)
    const MAX_RETRIES = 3
    let response: Response | null = null
    let sentAt = 0
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Bound THIS dispatch, not the retry loop: a deliberate backoff sleep is
      // this provider's own wait, so no window is running while it is spent.
      let headerDeadline: ReturnType<typeof setTimeout> | null = null
      sentAt = Date.now()
      if (firstTokenTimeoutMs !== undefined) {
        headerDeadline = setTimeout(
          () => controller.abort(new FirstTokenHeaderTimeoutError(firstTokenTimeoutMs)),
          firstTokenTimeoutMs,
        )
        headerDeadline.unref?.()
      }
      try {
        response = await fetch(`${this.baseUrl}${this.completionsPath}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal,
        })
      } finally {
        // Release the header timer when fetch settles. The successful SSE reader
        // uses the remaining window; a rate-limit retry starts a new dispatch.
        if (headerDeadline) clearTimeout(headerDeadline)
      }

      if (response.status === 429 || response.status === 503) {
        const willRetry = attempt < MAX_RETRIES
        // Retry-After is equally-valid as delta-seconds or an HTTP-date;
        // parseInt on the date form yields NaN, degrading the backoff to a
        // ~0ms retry against an already rate-limiting API. Guard it.
        const retryAfter = response.headers.get('retry-after')
        const parsedRetryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : NaN
        const hasRetryAfter =
          Number.isFinite(parsedRetryAfterSeconds) && parsedRetryAfterSeconds >= 0
        // Additive jitter (<500ms): concurrent callers rejected together must
        // not sleep identical delays and re-arrive as the same burst.
        const delayMs = willRetry
          ? (hasRetryAfter
              ? Math.min(parsedRetryAfterSeconds * 1000, 60_000)
              : Math.min(1000 * 2 ** attempt, 30_000)) + Math.floor(Math.random() * 500)
          : 0
        try {
          this.onRateLimit?.({
            provider: this.name,
            model,
            status: response.status,
            attempt: attempt + 1,
            willRetry,
            retryInMs: delayMs,
            ...(hasRetryAfter ? { retryAfterSeconds: parsedRetryAfterSeconds } : {}),
          })
        } catch (error) {
          // Host-app telemetry; its failure must never break the request.
          logger.warn('onRateLimit callback threw', { error })
        }
        if (willRetry) {
          logger.warn('DeepSeek API rate limited, retrying', {
            status: response.status,
            attempt: attempt + 1,
            delayMs,
          })
          // A host may cancel inside onRateLimit, before a backoff listener exists.
          signal.throwIfAborted()
          await new Promise<void>((resolve) => {
            const finish = (): void => {
              clearTimeout(timer)
              signal.removeEventListener('abort', finish)
              resolve()
            }
            const timer = setTimeout(finish, delayMs)
            signal.addEventListener('abort', finish, { once: true })
          })
          signal.throwIfAborted()
          continue
        }
      }
      break
    }
    return { response: response!, sentAt }
  }

  /**
   * Record one stalled attempt: a warn line always, plus the host's
   * `onStreamStall` callback so the gap is queryable from the turn's own
   * analytics rather than only from a log buffer that has since rotated.
   *
   * @param model - The upstream model id the stalled request targeted.
   * @param stall - What the stalled attempt looked like.
   */
  private reportStreamStall(model: string, stall: StreamStallDetail): void {
    logger.warn('DeepSeek stream stalled', {
      model,
      phase: stall.phase,
      stallMs: stall.stallMs,
      attempt: stall.attempt,
      willRetry: stall.willRetry,
      streamedChars: stall.streamedChars,
      keepAlives: stall.keepAlives,
    })
    try {
      this.onStreamStall?.({
        provider: this.name,
        model,
        phase: stall.phase,
        stallMs: stall.stallMs,
        attempt: stall.attempt,
        willRetry: stall.willRetry,
        streamedChars: stall.streamedChars,
        keepAlives: stall.keepAlives,
      })
    } catch (error) {
      // Host-app telemetry; its failure must never break the request.
      logger.warn('onStreamStall callback threw', { error })
    }
  }

  /**
   * Converts internal `ChatMessage` objects to the OpenAI-compatible message format.
   * System prompt is prepended as a system role message.
   *
   * Thinking mode has one wire obligation that non-thinking mode does not:
   * DeepSeek's thinking-mode guide requires the `reasoning_content` of every
   * retained assistant turn to be sent back on a later request carrying `tools`,
   * including turns where the model made no tool call — omitting it is a 400.
   * So when `replayReasoning` is set (the caller passed a `thinking` block), each
   * assistant turn carries `ChatMessage.reasoning` verbatim. That reasoning is
   * never synthesized: a turn with no recorded reasoning sends `''`, which is
   * the only representation of "this turn ran without thinking" the wire has.
   * A non-thinking request keeps the historical shape (no `reasoning_content`);
   * the guide says a non-thinking request ignores the field anyway.
   *
   * @param messages - The chat messages to format.
   * @param system - Optional system prompt to prepend.
   * @param replayReasoning - Whether thinking mode is on for this request.
   * @returns The formatted messages array for the DeepSeek API.
   */
  private formatMessages(
    messages: ChatMessage[],
    system?: string,
    replayReasoning = false,
  ): Array<Record<string, unknown>> {
    const formatted: Array<Record<string, unknown>> = []

    if (system) {
      formatted.push({ role: 'system', content: system })
    }

    for (const m of messages) {
      if (m.role === 'system') continue // handled above

      // Only assistant turns have a reasoning channel. `reasoning_content: ''`
      // is deliberate for a retained turn with no recorded reasoning (a
      // non-thinking turn inside a thinking-mode history): the vendor requires
      // the field on every retained assistant turn, and an empty string is the
      // only way to say "nothing was recorded" without inventing content.
      const reasoningField =
        replayReasoning && m.role === 'assistant' ? { reasoning_content: m.reasoning ?? '' } : {}

      if (typeof m.content === 'string') {
        formatted.push({ role: m.role, content: m.content, ...reasoningField })
        continue
      }

      // Content blocks — convert to OpenAI format
      const blocks = m.content as ContentBlock[]
      const parts: Array<Record<string, unknown>> = []
      const toolCalls: Array<Record<string, unknown>> = []
      const toolResults: Array<Record<string, unknown>> = []

      for (const block of blocks) {
        switch (block.type) {
          case 'text':
            parts.push({ type: 'text', text: block.text })
            break
          case 'image':
            parts.push({
              type: 'image_url',
              image_url: { url: `data:${block.mediaType};base64,${block.data}` },
            })
            break
          case 'tool_use':
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: { name: block.name, arguments: JSON.stringify(block.input) },
            })
            break
          case 'tool_result':
            toolResults.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content:
                typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            })
            break
          default:
            // document, audio, video — unsupported, skip
            break
        }
      }

      if (toolResults.length > 0) {
        // Tool results are separate messages in OpenAI format
        for (const tr of toolResults) {
          formatted.push(tr)
        }
        // Non-tool parts of the SAME message (an image riding a tool result — the
        // screenshot tool) must not be dropped: Chat Completions accepts a user
        // message after the tool messages, so emit them instead of losing them.
        if (parts.length > 0) formatted.push({ role: m.role, content: parts, ...reasoningField })
      } else if (toolCalls.length > 0) {
        // Assistant message with tool calls
        formatted.push({
          role: 'assistant',
          content: parts.length > 0 ? parts : null,
          ...reasoningField,
          tool_calls: toolCalls,
        })
      } else {
        formatted.push({
          role: m.role,
          content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts,
          ...reasoningField,
        })
      }
    }

    return formatted
  }

  /**
   * Converts internal `AITool` definitions to the OpenAI function calling format.
   *
   * @param tools - The AI tool definitions to format.
   * @returns The formatted tools array for the DeepSeek API.
   */
  private formatTools(tools: AITool[]): Array<Record<string, unknown>> {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * Parses a non-streaming OpenAI-compatible response into `ChatEvent` objects.
   *
   * @param data - The raw API response data to parse.
   * @yields {ChatEvent} Chat events parsed from the response.
   */
  private *parseNonStreamingResponse(data: Record<string, unknown>): Iterable<ChatEvent> {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    const choice = choices?.[0]
    const message = choice?.message as Record<string, unknown> | undefined
    if (!message) {
      logger.warn('DeepSeek response has no assistant message')
      yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
      return
    }
    // Reasoning/thinking content
    if (message.reasoning_content && typeof message.reasoning_content === 'string') {
      yield { type: 'thinking', content: message.reasoning_content }
    }

    if (message.content && typeof message.content === 'string') {
      yield { type: 'text', content: message.content }
    }

    const finishReason = choice?.finish_reason
    if (finishReason !== 'stop' && finishReason !== 'tool_calls') {
      logger.warn('DeepSeek response did not complete', { finishReason })
      yield {
        type: 'error',
        message: t('ai.error.apiError', undefined, {
          defaultValue:
            finishReason === 'length'
              ? 'AI response reached the output token limit before completion.'
              : 'AI response ended before completion. Please try again.',
        }),
        errorKey: 'ai.error.apiError',
      }
      return
    }

    const toolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined
    if (finishReason === 'tool_calls' && !toolCalls?.length) {
      logger.warn('DeepSeek finished tool use without a tool call')
      yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
      return
    }
    if (toolCalls) {
      const completedTools: ChatEvent[] = []
      for (const tc of toolCalls) {
        const fn = tc.function as Record<string, unknown>
        let input: unknown
        try {
          input = JSON.parse(fn.arguments as string)
          if (
            typeof tc.id !== 'string' ||
            !tc.id ||
            typeof fn.name !== 'string' ||
            !fn.name ||
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input)
          ) {
            throw new Error('Tool call must have an identity and JSON object arguments')
          }
        } catch (error) {
          logger.warn('DeepSeek completed a tool call with invalid arguments', { error })
          yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
          return
        }
        completedTools.push({
          type: 'tool_use',
          id: tc.id as string,
          name: fn.name as string,
          input,
        })
      }
      yield* completedTools
    }

    yield {
      type: 'done',
      usage: this.parseUsage((data.usage ?? {}) as DeepseekUsage),
    }
  }

  /**
   * Normalize native usage once for streaming and JSON responses. Native flat
   * counters take precedence, including zero; other compatible hosts may expose
   * only the nested count. `inputTokens` excludes cache hits in the core contract.
   *
   * @param usage - The latest upstream counters.
   * @returns Uncached input, output and cached input without double-counting.
   */
  private parseUsage(usage: DeepseekUsage): TokenUsage {
    const cached = usage.prompt_cache_hit_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0
    return {
      inputTokens:
        usage.prompt_cache_miss_tokens ?? Math.max(0, (usage.prompt_tokens ?? 0) - cached),
      outputTokens: usage.completion_tokens ?? 0,
      cacheReadInputTokens: cached,
    }
  }

  /**
   * Parses a streaming SSE response from the DeepSeek API (OpenAI-compatible
   * format), yielding `ChatEvent` objects as they arrive.
   *
   * @param response - The fetch Response with an SSE body stream.
   * @param state - Mutable counters for this attempt's tokens, liveness frames
   *   and streamed content. Owned by the caller so a retry can read what the
   *   abandoned attempt produced.
   * @param bounds - How to re-arm the stream bound after the reply starts.
   * @param call - The request's own identity, filled in from the response —
   *   see {@link DeepseekCallContext}.
   * @yields {ChatEvent} Chat events as they arrive from the SSE stream.
   */
  private async *parseStreamingResponse(
    response: Response,
    state: DeepseekStreamState,
    bounds: StreamBoundControl,
    call: DeepseekCallContext,
  ): AsyncIterable<ChatEvent> {
    const reader = response.body?.getReader()
    if (!reader) {
      yield {
        type: 'error',
        message: t('ai.error.noResponseBody'),
        errorKey: 'ai.error.noResponseBody',
      }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    // Track pending tool calls (accumulated across deltas). `started` guards the
    // one-shot tool_use_start emission once the id + name are first known.
    const pendingTools: Map<number, { id: string; name: string; args: string; started: boolean }> =
      new Map()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let yieldedContent = false
        for (const event of this.processSSELines(lines, pendingTools, state, call)) {
          yieldedContent = true
          // The reply has started. Counting this from the EVENTS (rather than
          // from the byte stream) is what lets the first-token bound see a
          // stall whose connection is kept alive by empty frames — the shape
          // DeepSeek actually produces. And the bound is swapped the instant it
          // starts, not at the end of the batch: a first-token timer that fired
          // on a reply already yielded to the consumer would retry and
          // duplicate it.
          if (isContentEvent(event) && !state.contentSeen) {
            state.contentSeen = true
            bounds.arm(bounds.silenceMs, 'after_content')
          }
          if (event.type === 'text' || event.type === 'thinking') {
            state.streamedChars += event.content.length
          }
          yield event
          // A mid-stream error (rate-limit/overload during high load, sent as a
          // `data: {"error": {...}}` chunk) means the turn was truncated. Stop
          // here and do NOT fall through to the trailing `done`, which would
          // report the truncated turn as a successful completion and skip the
          // consumer's overload/retry recovery.
          if (event.type === 'error') return
        }

        // Signal liveness when the API sends data but no content events were produced
        // (e.g., during extended reasoning with empty chunks or keepalive comments).
        // This resets the consumer's stream timeout without forwarding to the client.
        if (!yieldedContent) {
          state.keepAlives += 1
          yield { type: 'keep_alive' }
        }
        // Any chunk at all proves the socket is alive, so the post-content bound
        // is re-armed here rather than on content events only.
        if (state.contentSeen) bounds.arm(bounds.silenceMs, 'after_content')
      }

      // Flush any remaining data in the buffer after EOF
      if (buffer.trim()) {
        for (const event of this.processSSELines(buffer.split('\n'), pendingTools, state, call)) {
          yield event
          if (event.type === 'error') return
        }
      }

      // A clean socket EOF can still cut off a response or tool arguments. Never
      // turn that into executable `{}` arguments or a successful completion.
      if (!state.finishReason || pendingTools.size > 0) {
        logger.warn('DeepSeek stream ended before an explicit completion', {
          finishReason: state.finishReason,
          pendingTools: pendingTools.size,
          requestId: call.meta.requestId,
        })
        yield {
          type: 'error',
          message: t('ai.error.apiError', undefined, {
            defaultValue: 'AI response ended before completion. Please try again.',
          }),
          errorKey: 'ai.error.apiError',
        }
        return
      }
    } finally {
      reader.releaseLock()
    }

    yield {
      type: 'done',
      usage: this.parseUsage(state.usage),
      provider: call.meta,
    }
  }

  /**
   * Processes an array of SSE lines from the DeepSeek streaming response, yielding
   * ChatEvent objects for text, thinking, tool use, and tool completion.
   *
   * @param lines - Raw SSE lines to process.
   * @param pendingTools - Mutable map tracking tool call deltas accumulated across chunks.
   * @param state - Mutable token usage counters.
   * @param call - The request's identity: the answer's own `id` and `model` are
   *   recorded on `call.meta`, and any echo of the request is verified.
   * @yields {ChatEvent} Chat events extracted from the SSE lines.
   */
  private *processSSELines(
    lines: string[],
    pendingTools: Map<number, { id: string; name: string; args: string; started: boolean }>,
    state: DeepseekStreamState,
    call: DeepseekCallContext,
  ): Iterable<ChatEvent> {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') continue

      try {
        const event = JSON.parse(json) as Record<string, unknown>

        // The reply's OWN identity, recorded for the caller: the completion id
        // (one per answer, repeated on every delta) and the model the provider
        // says answered. Recorded rather than asserted — a re-host legitimately
        // answers under its own dated snapshot id.
        if (typeof event.id === 'string') call.meta.responseId = event.id
        if (typeof event.model === 'string') call.meta.model = event.model

        // If this host echoes an identity back, verify it. A reply carrying an
        // identity that is not the one we sent is a reply that was produced for
        // somebody else's request, and it must not be streamed on as ours —
        // 2026-10-16 a conversation received a complete foreign completion on a
        // stream whose usage matched its own context, and nothing could tell.
        // DeepSeek's own API echoes nothing, so this arm is inert there; it is
        // live for any OpenAI-compatible host that does, and it is the only
        // check that runs BEFORE the text reaches the caller.
        const echoedUser = typeof event.user === 'string' ? event.user : undefined
        const echoedRequest =
          typeof event.request_id === 'string'
            ? event.request_id
            : typeof event.requestId === 'string'
              ? event.requestId
              : undefined
        const wrongUser =
          echoedUser !== undefined && call.endUserId !== undefined && echoedUser !== call.endUserId
        const wrongRequest = echoedRequest !== undefined && echoedRequest !== call.meta.requestId
        if (wrongUser || wrongRequest) {
          logger.error('Provider echoed a different identity — this reply is not ours', {
            requestId: call.meta.requestId,
            echoedUser: wrongUser ? echoedUser : undefined,
            echoedRequestId: wrongRequest ? echoedRequest : undefined,
            responseId: call.meta.responseId,
            traceId: call.meta.traceId,
            endpoint: call.meta.endpoint,
          })
          yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
          // The whole reply is somebody else's: stop reading it. The caller's
          // error ladder retries the request once.
          return
        }

        // A mid-stream error arrives as a `data: {"error": {...}}` chunk (no
        // `choices`) — most importantly rate-limit/overload during high load.
        // Without this it matches no branch below and is silently dropped, so the
        // stream falls through to a misleading `done` and the truncated turn reads
        // as a successful completion. Surface it as a real error event (also
        // satisfies the no-silent-swallow rule).
        const streamError = event.error as
          { message?: string; type?: string; code?: string } | undefined
        if (streamError) {
          const detail = `${streamError.code ?? streamError.type ?? ''} ${streamError.message ?? ''}`
          logger.error('DeepSeek streaming error event', {
            type: streamError.type,
            code: streamError.code,
            message: streamError.message,
          })
          // Same distinctions as the pre-flight ladder, in the same precedence
          // the turn classifier applies (rate → auth → context → balance →
          // transient): an exhausted account is a billing state (never
          // transient, never "try again"), an auth failure stays `auth`, a
          // context overflow stays recoverable. There is no HTTP status here —
          // the stream answered 200 — so each class keys on the provider's own
          // wording, plus numeric codes some hosts send as `code`.
          const clientMessage = /rate.?limit|\b429\b|quota/i.test(detail)
            ? 'AI rate limit exceeded. Please try again shortly.'
            : /\b401\b|authentication|unauthorized/i.test(detail)
              ? 'AI service authentication/configuration error — the API key was rejected.'
              : /context.?length|context.?window|too long|too many tokens|token.?limit/i.test(
                    detail,
                  )
                ? "Conversation too long for the model's context window. Use /compact to free space, or start a new conversation."
                : /insufficient balance|credit balance|payment required|\b402\b/i.test(detail)
                  ? 'AI service is unavailable — provider credit balance too low.'
                  : /overload|capacity|\b(?:500|502|503|504|529)\b/i.test(detail)
                    ? 'AI service is temporarily overloaded. Please try again in a moment.'
                    : 'AI service error. Please try again.'
          yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
          continue
        }

        // Usage info (may appear in the final chunk)
        const usage = event.usage as DeepseekUsage | undefined
        if (usage) {
          // These are snapshots, never increments. Preserve partial counters
          // across frames while allowing a later explicit zero to reset them.
          state.usage = {
            ...state.usage,
            ...usage,
            prompt_tokens_details: {
              ...state.usage.prompt_tokens_details,
              ...usage.prompt_tokens_details,
            },
          }
        }

        const choices = event.choices as Array<Record<string, unknown>> | undefined
        if (!choices?.length) continue

        const choice = choices[0]
        const delta = (choice.delta ?? {}) as Record<string, unknown>

        // Reasoning/thinking content
        if (delta.reasoning_content && typeof delta.reasoning_content === 'string') {
          yield { type: 'thinking', content: delta.reasoning_content }
        }

        // Text content
        if (delta.content && typeof delta.content === 'string') {
          yield { type: 'text', content: delta.content }
        }

        // Tool calls (accumulated across deltas)
        const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
        if (toolCalls) {
          for (const tc of toolCalls) {
            const idx = tc.index as number
            const fn = tc.function as Record<string, unknown> | undefined

            if (!pendingTools.has(idx)) {
              pendingTools.set(idx, {
                id: (tc.id as string) ?? '',
                name: fn?.name ? (fn.name as string) : '',
                args: '',
                started: false,
              })
            }

            const pending = pendingTools.get(idx)!
            if (tc.id) pending.id = tc.id as string
            if (fn?.name) pending.name = fn.name as string
            // Surface the tool start once id + name are known, before the
            // arguments finish streaming, so the client shows activity immediately.
            if (!pending.started && pending.id && pending.name) {
              pending.started = true
              yield { type: 'tool_use_start', id: pending.id, name: pending.name }
            }
            if (fn?.arguments) {
              const chunk = fn.arguments as string
              pending.args += chunk
              // Emit the chunk's char count as real progress (drives the live
              // token counter; re-arms the stream timeout) rather than a silent
              // keep_alive — just the count, not the content.
              yield { type: 'tool_input_delta', id: pending.id, chars: chunk.length, text: chunk }
            }
          }
        }

        // Only these upstream reasons denote a completed response. `length`
        // is the output-token cap; filters/resource failures/aborts also retain
        // partial text but must not release pending tools or emit `done`.
        const finishReason = choice.finish_reason
        if (finishReason !== undefined && finishReason !== null) {
          if (finishReason !== 'tool_calls' && finishReason !== 'stop') {
            logger.warn('DeepSeek response did not complete', {
              finishReason,
              requestId: call.meta.requestId,
            })
            yield {
              type: 'error',
              message: t('ai.error.apiError', undefined, {
                defaultValue:
                  finishReason === 'length'
                    ? 'AI response reached the output token limit before completion.'
                    : 'AI response was interrupted before completion. Please try again.',
              }),
              errorKey: 'ai.error.apiError',
            }
            return
          }
          // Validate ALL calls before releasing any: a malformed parallel call
          // must not execute alongside an apparently successful partial batch.
          if (finishReason === 'tool_calls' && pendingTools.size === 0) {
            logger.warn('DeepSeek finished tool use without a tool call')
            yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
            return
          }
          const completedTools: ChatEvent[] = []
          for (const [, pending] of pendingTools) {
            let input: unknown
            try {
              input = JSON.parse(pending.args)
              if (
                typeof pending.id !== 'string' ||
                !pending.id ||
                typeof pending.name !== 'string' ||
                !pending.name ||
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input)
              ) {
                throw new Error('Tool call must have an identity and JSON object arguments')
              }
            } catch (error) {
              logger.warn('DeepSeek completed a tool call with invalid arguments', { error })
              yield {
                type: 'error',
                message: t('ai.error.apiError'),
                errorKey: 'ai.error.apiError',
              }
              return
            }
            completedTools.push({
              type: 'tool_use',
              id: pending.id,
              name: pending.name,
              input,
            })
          }
          pendingTools.clear()
          state.finishReason = finishReason
          yield* completedTools
        }
      } catch (error) {
        logger.warn('DeepSeek returned malformed SSE JSON', { error })
        yield { type: 'error', message: t('ai.error.apiError'), errorKey: 'ai.error.apiError' }
        return
      }
    }
  }
}

/**
 * Back-compat alias for the provider class (the scaffold exported this name).
 */
export const DeepseekAIProvider = DeepseekAIProviderImpl

/**
 * Creates a DeepSeek AI provider instance.
 *
 * @param config - DeepSeek-specific configuration (API key, model, max tokens, base URL).
 * @returns An `AIProvider` backed by the DeepSeek Chat Completions API.
 */
export function createProvider(config?: DeepseekConfig): AIProvider {
  return new DeepseekAIProviderImpl(config)
}
