/**
 * Minimal HTTP client for the Fly Machines API.
 *
 * Speaks the documented REST surface at `https://api.machines.dev/v1` with a
 * `Authorization: Bearer <token>` header
 * (https://fly.io/docs/machines/api/working-with-machines-api/).
 *
 * The one non-obvious responsibility here is RATE LIMITING. Fly documents the
 * Machines API at "1 request, per second, per action (i.e. Create Machine, Start
 * Machine etc.) — with a short-term burst limit up to 3 req/s, per action", and
 * 5 req/s (burst 10) for Get Machine. A sandbox boot issues a burst of calls
 * (ensure app → create volume → create machine → wait → several execs), so a
 * client with no 429 handling WILL trip that limit under concurrent boots and
 * fail the whole boot. Retries are therefore part of the transport, not the
 * caller's problem.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

/** Default per-request timeout (ms). */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

/** Default number of attempts for a retryable failure. */
const DEFAULT_ATTEMPTS = 4

/** Upper bound on a `Retry-After`-derived delay, so a hostile header cannot stall a boot. */
const MAX_RETRY_DELAY_MS = 10_000

/**
 * An error from the Fly Machines API. Carries the HTTP status and the raw
 * response body so callers can branch on `404` (absent) or `409` (conflict)
 * without string-matching a message.
 */
export class FlyApiError extends Error {
  /** HTTP status code, or 0 for a transport-level failure (timeout, DNS, reset). */
  readonly status: number
  /** Raw response body text, truncated to a sane length for logging. */
  readonly body: string
  /** HTTP method of the failed request. */
  readonly method: string
  /** API path of the failed request (no base URL). */
  readonly path: string

  /**
   * Creates a Fly API error.
   * @param method - HTTP method of the failed request.
   * @param path - API path of the failed request.
   * @param status - HTTP status code, or 0 for a transport failure.
   * @param body - Raw response body text.
   * @param options - Standard error options (used to carry a `cause`).
   */
  constructor(
    method: string,
    path: string,
    status: number,
    body: string,
    options?: { cause?: unknown },
  ) {
    super(
      t(
        'codeSandbox.flyio.error.apiError',
        { method, path, status: String(status), error: body },
        { defaultValue: `Fly API ${method} ${path}: ${status} ${body}` },
      ),
      options,
    )
    this.name = 'FlyApiError'
    this.status = status
    this.body = body
    this.method = method
    this.path = path
  }
}

/** Options for a single Fly API request. */
export interface FlyRequestOptions {
  /** HTTP method. Defaults to `GET`. */
  method?: string
  /** JSON request body. Omitted entirely when undefined. */
  body?: unknown
  /** Per-request timeout in ms. Defaults to the client's configured timeout. */
  timeoutMs?: number
  /** Max attempts for a retryable failure. Defaults to 4. Pass 1 to disable retries. */
  attempts?: number
  /**
   * Treat these HTTP statuses as a successful `null` result instead of throwing.
   * Used for idempotent deletes and existence checks (`[404]`).
   */
  nullOn?: number[]
  /**
   * Extra HTTP statuses to treat as transient (retry) beyond the default
   * `429`/`5xx`. The exec endpoint passes `[404]`: a machine-not-found for a
   * Machine we just created and are actively driving is Fly API inconsistency
   * under exec-burst load, not a real absence, so it is worth repeating.
   */
  retryStatuses?: number[]
}

/**
 * Decides whether a failed attempt is worth repeating.
 *
 * `429` (the documented per-action rate limit) and `5xx` are transient — the
 * request was well-formed and the same call can succeed moments later. Every
 * other `4xx` is a real answer (no such app, name taken, bad token) and
 * retrying it only wastes the rate-limit budget that the retry exists to
 * protect. Status `0` means the transport failed before any answer arrived.
 * @param status - HTTP status, or 0 for a transport-level failure.
 * @returns `true` when the request should be retried.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500
}

/**
 * Resolves how long to wait before the next attempt.
 *
 * Honors a `Retry-After` header when the server sent one (Fly returns it on
 * 429), clamped to {@link MAX_RETRY_DELAY_MS}; otherwise uses exponential
 * backoff from a 500 ms base. Fly's documented budget is one request per second
 * per action, so the first backoff step deliberately exceeds a second.
 * @param attempt - The 1-based attempt number that just failed.
 * @param retryAfter - Raw `Retry-After` header value, if present.
 * @returns The delay in milliseconds before the next attempt.
 */
export function retryDelayMs(attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS)
    }
  }
  return Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS)
}

/**
 * Normalizes a configured API base into a URL prefix ending in `/v1`.
 *
 * `FLY_API_HOSTNAME` is documented as a bare host (`https://api.machines.dev`,
 * or `http://_api.internal:4280` from inside a Fly private network), so a value
 * with no path gets `/v1` appended. A value that already carries a path is used
 * verbatim, which is how an operator points at a proxy or a pinned version.
 * @param value - Configured base URL, or undefined.
 * @returns The base URL with no trailing slash.
 */
export function normalizeApiUrl(value: string | undefined): string {
  const raw = value?.trim()
  if (!raw) return 'https://api.machines.dev/v1'
  const withoutSlash = raw.replace(/\/+$/, '')
  try {
    const url = new URL(withoutSlash)
    if (url.pathname === '' || url.pathname === '/') return `${withoutSlash}/v1`
    return withoutSlash
  } catch (error) {
    // Not an absolute URL — the operator gave something we cannot safely extend.
    // Surface it instead of silently guessing a base for every subsequent call.
    throw new Error(
      t(
        'codeSandbox.flyio.error.badApiUrl',
        { value: raw },
        { defaultValue: `Invalid Fly API URL "${raw}" — expected an absolute URL.` },
      ),
      { cause: error },
    )
  }
}

/** Constructor options for {@link FlyApiClient}. */
export interface FlyApiClientOptions {
  /** Bearer token. Resolved lazily so env/secrets can land after construction. */
  token: () => string | undefined
  /** Base URL including `/v1`. */
  baseUrl: string
  /** Default per-request timeout (ms). */
  timeoutMs?: number
  /** Injectable fetch, for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
  /** Injectable sleep, for tests. Defaults to `setTimeout`. */
  sleep?: (ms: number) => Promise<void>
}

/**
 * Thin, retrying JSON client for the Fly Machines API.
 *
 * Deliberately not a generated SDK: this provider touches ~12 endpoints, and a
 * generated client would drag in the whole Machines + Postgres + tokens surface
 * for no benefit.
 */
/**
 * Minimum gap between Fly Machines API requests, PROCESS-WIDE. Fly rate-limits
 * per account (most tightly the exec endpoint, ~a few req/s), and one molecule
 * process makes every call with one token — so without pacing, a sandbox boot's
 * burst of exec calls trips `429`, and retrying under the cap sustains a storm
 * that LIVELOCKS the boot (observed live 2026-08-09: a workspace stuck
 * "creating" with continuous per-second 429s that never drained). ~220 ms ≈
 * 4.5 req/s keeps us under the cap. Tunable via `FLY_API_MIN_REQUEST_GAP_MS`.
 */
function minRequestGapMs(): number {
  const v = Number(process.env.FLY_API_MIN_REQUEST_GAP_MS)
  return Number.isFinite(v) && v >= 0 ? v : 220
}

/**
 * Serializes every request through a shared chain so no two fire closer than
 * {@link MIN_REQUEST_GAP_MS}. Module-level (not per-client) so concurrent
 * sandbox boots share ONE pacer and cannot collectively exceed the account cap.
 * Errors in the chain are swallowed so one failed wait never wedges the queue.
 */
let flyPacerTail: Promise<void> = Promise.resolve()
let flyLastRequestAt = 0
function paceFlyRequest(sleep: (ms: number) => Promise<void>): Promise<void> {
  const mine = flyPacerTail.then(async () => {
    const wait = Math.max(0, flyLastRequestAt + minRequestGapMs() - Date.now())
    if (wait > 0) await sleep(wait)
    flyLastRequestAt = Date.now()
  })
  flyPacerTail = mine.catch(() => {})
  return mine
}

/** Test-only: reset the shared pacer so timing tests start from a clean slate. */
export function resetFlyPacerForTests(): void {
  flyPacerTail = Promise.resolve()
  flyLastRequestAt = 0
}

export class FlyApiClient {
  private readonly token: () => string | undefined
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>

  /**
   * Creates a Fly Machines API client.
   * @param options - Token resolver, base URL, and injectable fetch/sleep.
   */
  constructor(options: FlyApiClientOptions) {
    this.token = options.token
    this.baseUrl = options.baseUrl
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
    this.sleep =
      options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  }

  /**
   * Issues a request against the Machines API and parses the JSON response.
   *
   * @template T - Expected shape of the parsed response body.
   * @param path - API path relative to the base URL, e.g. `/apps/foo/machines`.
   * @param options - Method, body, timeout, attempts, and statuses to null on.
   * @returns The parsed body, or `null` for an empty body or a status listed in
   *   `options.nullOn`.
   * @throws {FlyApiError} On a non-2xx status that is not listed in `nullOn`,
   *   or when every retryable attempt is exhausted.
   */
  async request<T>(path: string, options: FlyRequestOptions = {}): Promise<T | null> {
    const method = options.method ?? 'GET'
    const attempts = options.attempts ?? DEFAULT_ATTEMPTS
    const token = this.token()
    if (!token) {
      throw new Error(
        t('codeSandbox.flyio.error.noToken', undefined, {
          defaultValue:
            'No Fly API token — set FLY_API_TOKEN (or FLY_ACCESS_TOKEN), or pass config.apiToken.',
        }),
      )
    }

    let lastError: FlyApiError | undefined
    for (let attempt = 1; attempt <= attempts; attempt++) {
      // Pace EVERY network call (including retries) through the process-wide
      // limiter so a boot's burst of exec calls never trips Fly's account 429.
      await paceFlyRequest(this.sleep)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs)
      // Initialized to 0 ("no answer received"), which is the value that
      // stands when the request throws before a response arrives.
      let status = 0
      let retryAfter: string | null = null
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
          signal: controller.signal,
        })
        status = response.status
        retryAfter = response.headers?.get?.('retry-after') ?? null
        const text = await response.text()

        if (status >= 200 && status < 300) {
          if (!text.trim()) return null
          try {
            return JSON.parse(text) as T
          } catch (error) {
            // A 2xx with a non-JSON body is a real protocol surprise (an
            // intercepting proxy, an HTML error page behind a 200). Refusing it
            // loudly beats handing the caller a silently-empty result.
            throw new FlyApiError(method, path, status, text.slice(0, 500), { cause: error })
          }
        }
        if (options.nullOn?.includes(status)) return null
        lastError = new FlyApiError(method, path, status, text.slice(0, 500))
      } catch (error) {
        if (error instanceof FlyApiError) throw error
        // Transport-level failure (abort/timeout, DNS, connection reset) — no
        // status was ever received, so it is modelled as status 0 and retried.
        lastError = new FlyApiError(
          method,
          path,
          0,
          error instanceof Error ? error.message : String(error),
          { cause: error },
        )
      } finally {
        clearTimeout(timer)
      }

      const retryable =
        isRetryableStatus(status) || (options.retryStatuses?.includes(status) ?? false)
      if (!retryable || attempt === attempts) break
      const delay = retryDelayMs(attempt, retryAfter)
      logger.warn(`Fly API transient failure on ${method} ${path} — retrying`, {
        attempt,
        attempts,
        status,
        delay,
      })
      await this.sleep(delay)
    }

    throw lastError ?? new FlyApiError(method, path, 0, 'unknown failure')
  }
}
