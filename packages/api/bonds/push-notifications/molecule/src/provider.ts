/**
 * molecule.dev hosted push notifications.
 *
 * `send` calls `POST <servicesUrl>/push/send` and `getPublicKey` calls
 * `POST <servicesUrl>/push/vapid-key` with the project's API key. VAPID is
 * handled by molecule.dev — the app never sees a private key.
 *
 * @module
 */

import type {
  NotificationPayload,
  PushNotificationProvider,
  PushSubscription,
  SendManyResult,
  SendResult,
  VapidConfig,
} from '@molecule/api-push-notifications'

import type { MoleculePushConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL must never send it across the PUBLIC internet in cleartext.
 * Mirroring the docker sandbox bond's plain-TCP production refusal, non-https
 * URLs are refused unless the host is loopback (a self-hosted services
 * instance for local development) or a PRIVATE-network endpoint — RFC 1918
 * addresses and `*.docker.internal` — which is how an in-sandbox app reaches
 * its platform's hosted-services gateway (`http://host.docker.internal:…`),
 * traffic that never leaves the host's virtual network. Public cleartext is
 * still refused. Duplicated across the molecule service bonds on purpose:
 * they are independent published packages with no shared runtime dependency.
 *
 * @param raw - The configured or defaulted base URL.
 * @returns The validated base URL, without trailing slashes.
 * @throws {Error} When the URL is not https and not loopback/private http.
 */
function resolveServicesUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch (_error) {
    // Not a URL at all (e.g. a bare hostname) — refuse it with the fix spelled out.
    throw new Error(
      `Invalid MOLECULE_SERVICES_URL "${raw}" — it must be an absolute https URL (default ${DEFAULT_SERVICES_URL}).`,
      { cause: _error },
    )
  }
  const host = parsed.hostname.toLowerCase()
  if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isPrivateHttpHost(host))) {
    return trimmed
  }
  throw new Error(
    `MOLECULE_SERVICES_URL "${raw}" must use https: the project API key is sent as a Bearer token on every request and must not cross the public internet in cleartext. ` +
      `Point it at ${DEFAULT_SERVICES_URL} or a private https endpoint; only loopback and private-network (RFC 1918 / *.docker.internal) http is allowed, for a local services instance or an in-sandbox app reaching its own platform.`,
  )
}

/**
 * Whether a plain-http URL to this host never leaves a trusted network: the
 * loopback addresses, the RFC 1918 private ranges (each octet range-checked —
 * a public address must not parse its way past this guard), and the docker
 * host-gateway names an in-sandbox app uses to reach its own platform.
 *
 * @param host - Lowercased URL hostname.
 * @returns True when plain http to this host is a private-network hop.
 */
function isPrivateHttpHost(host: string): boolean {
  if (host === 'localhost' || host === '[::1]' || host === '::1' || host.startsWith('127.')) {
    return true
  }
  if (host === 'host.docker.internal' || host.endsWith('.docker.internal')) return true
  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!octets) return false
  const [a, b, c, d] = octets.slice(1).map(Number)
  if ([a, b, c, d].some((n) => n > 255)) return false
  if (a === 10) return true
  if (a === 172) return b >= 16 && b <= 31
  if (a === 192) return b === 168
  return false
}

/** Per-request limits of the hosted service. */
export const PUSH_SERVICE_LIMITS = {
  /** Serialized JSON payload cap — the Web Push spec allows 4096 bytes ENCRYPTED; encryption adds overhead on top of the JSON. */
  maxPayloadChars: 3072,
  /** Subscription key string cap (the browser values are ~88 and ~24 base64url chars). */
  maxKeyChars: 512,
  /** Endpoint URL cap. */
  maxEndpointChars: 2048,
} as const

/** Error thrown for a refused or failed hosted-service call. */
export class MoleculeServiceError extends Error {
  /** HTTP status from molecule.dev. */
  readonly status: number
  /** Stable error key from molecule.dev, e.g. `broker.error.budgetExceeded`. */
  readonly errorKey: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status.
   * @param errorKey - Stable error key, when the service sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, errorKey?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MoleculeServiceError'
    this.status = status
    this.errorKey = errorKey
  }
}

/** What to tell the developer for each refusal the service can return. */
const HINTS: Record<number, string> = {
  400: 'The subscription or payload was refused — check that `keys.p256dh`/`keys.auth` are the exact base64url values pushManager.subscribe() returned and that the endpoint URL is unchanged.',
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:push-notifications" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another push provider.",
  413: 'The serialized payload is too large (the limit is 3072 characters of JSON).',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/** Validates a subscription locally, throwing before any request leaves the process. */
function assertValidSubscription(subscription: PushSubscription): void {
  if (
    !subscription ||
    typeof subscription !== 'object' ||
    typeof subscription.endpoint !== 'string' ||
    subscription.endpoint.length === 0
  ) {
    throw new MoleculeServiceError(
      'The subscription needs an "endpoint" URL string (from pushManager.subscribe()).',
      400,
      'hostedServices.error.invalidInput',
    )
  }
  if (subscription.endpoint.length > PUSH_SERVICE_LIMITS.maxEndpointChars) {
    throw new MoleculeServiceError(
      `The subscription endpoint is ${subscription.endpoint.length} characters; the limit is ${PUSH_SERVICE_LIMITS.maxEndpointChars}.`,
      413,
      'hostedServices.error.inputTooLarge',
    )
  }
  const keys = (subscription as { keys?: unknown }).keys as
    { p256dh?: unknown; auth?: unknown } | undefined
  if (
    !keys ||
    typeof keys.p256dh !== 'string' ||
    keys.p256dh.length === 0 ||
    typeof keys.auth !== 'string' ||
    keys.auth.length === 0
  ) {
    throw new MoleculeServiceError(
      'The subscription needs "keys.p256dh" and "keys.auth" (the base64url values pushManager.subscribe() returned).',
      400,
      'hostedServices.error.invalidInput',
    )
  }
  if (
    keys.p256dh.length > PUSH_SERVICE_LIMITS.maxKeyChars ||
    keys.auth.length > PUSH_SERVICE_LIMITS.maxKeyChars
  ) {
    throw new MoleculeServiceError(
      `The subscription keys are too long; the limit is ${PUSH_SERVICE_LIMITS.maxKeyChars} characters each.`,
      413,
      'hostedServices.error.inputTooLarge',
    )
  }
}

/** Validates a payload locally, throwing before any request leaves the process. */
function assertValidPayload(payload: NotificationPayload): void {
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.title !== 'string' ||
    payload.title.length === 0
  ) {
    throw new MoleculeServiceError(
      'The payload needs a non-empty "title" string.',
      400,
      'hostedServices.error.invalidInput',
    )
  }
  const serialized = JSON.stringify(payload)
  if (serialized.length > PUSH_SERVICE_LIMITS.maxPayloadChars) {
    throw new MoleculeServiceError(
      `The payload is ${serialized.length} characters serialized; the limit is ${PUSH_SERVICE_LIMITS.maxPayloadChars} (the Web Push protocol caps the encrypted payload at 4096 bytes).`,
      413,
      'hostedServices.error.inputTooLarge',
    )
  }
}

/**
 * Push provider backed by molecule.dev's hosted service.
 */
export class MoleculePushProvider implements PushNotificationProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number
  private cachedPublicKey: string | undefined

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculePushConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 15_000
  }

  /**
   * Nothing to configure locally — molecule.dev holds the VAPID keys and
   * signs every send. The parameter is accepted so the provider satisfies
   * the core interface; a self-hosted setup should use
   * `@molecule/api-push-notifications-web-push` instead.
   *
   * @param _config - Ignored.
   */
  configure(_config?: VapidConfig): void {}

  /**
   * Sends a push notification to a subscription endpoint.
   *
   * @param subscription - The push subscription (endpoint + keys).
   * @param payload - The notification payload (title + display options).
   * @returns The push service's answer: `statusCode` 201 means delivered;
   * 404/410 mean the subscription is dead and should be pruned.
   */
  async send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult> {
    assertValidSubscription(subscription)
    assertValidPayload(payload)
    return this.request<SendResult>('send', { subscription, payload })
  }

  /**
   * Sends a push notification to multiple subscriptions. One refused or
   * failed subscription never aborts the batch — each entry carries either
   * `result` or `error` (a dead subscription arrives as a `result` whose
   * `statusCode` is 404/410; prune on it).
   *
   * @param subscriptions - The push subscriptions to send to.
   * @param payload - The notification payload with title and optional display options.
   * @returns One result entry per subscription.
   */
  async sendMany(
    subscriptions: PushSubscription[],
    payload: NotificationPayload,
  ): Promise<SendManyResult[]> {
    const settled = await Promise.allSettled(
      (subscriptions ?? []).map((subscription) => this.send(subscription, payload)),
    )
    return settled.map((outcome, i) =>
      outcome.status === 'fulfilled'
        ? { subscription: subscriptions[i], result: outcome.value }
        : { subscription: subscriptions[i], error: outcome.reason as Error },
    )
  }

  /**
   * Returns molecule.dev's public VAPID key — the `applicationServerKey` a
   * browser's `pushManager.subscribe()` must be given for the resulting
   * subscriptions to be sendable through molecule.dev.
   *
   * The core's method is SYNCHRONOUS while the key lives behind a service
   * call, so this returns the cache: `undefined` until {@link fetchPublicKey}
   * has run (or a send cached it). Await the fetch first:
   *
   * ```typescript
   * await provider.fetchPublicKey() // once, e.g. at startup
   * const applicationServerKey = provider.getPublicKey()
   * ```
   *
   * @returns The cached public key, or `undefined` before the first fetch.
   */
  getPublicKey(): string | undefined {
    return this.cachedPublicKey
  }

  /**
   * Fetches molecule.dev's public VAPID key from the hosted service and
   * caches it for {@link getPublicKey}.
   *
   * @returns The public key string.
   */
  async fetchPublicKey(): Promise<string> {
    const { publicKey } = await this.request<{ publicKey: string }>('vapid-key', {})
    this.cachedPublicKey = publicKey
    return publicKey
  }

  /**
   * Not supported on the hosted path: sends are signed with molecule.dev's
   * VAPID identity, and subscriptions are bound to the key they were created
   * with — a locally generated pair could never receive a hosted send. Use
   * `@molecule/api-push-notifications-web-push` (which serves your own keys)
   * when you need your own identity.
   *
   * @throws {MoleculeServiceError} Always, with the self-hosted pointer.
   */
  generateVapidKeys(): never {
    throw new MoleculeServiceError(
      "generateVapidKeys() is a self-hosted concern: the hosted service signs sends with molecule.dev's VAPID identity. Use @molecule/api-push-notifications-web-push to serve your own keys.",
      400,
      'hostedServices.error.invalidInput',
    )
  }

  /** One POST to the hosted service. */
  private async request<T>(
    operation: 'send' | 'vapid-key',
    body: Record<string, unknown>,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/push/${operation}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch (error) {
      // A proxy/gateway error page, not the service: report the status only.
      throw new MoleculeServiceError(
        `molecule.dev returned ${response.status} with a non-JSON body.`,
        response.status,
        undefined,
        error,
      )
    }
    if (!response.ok) {
      const err = data as { error?: string; errorKey?: string }
      const hint = HINTS[response.status]
      throw new MoleculeServiceError(
        `molecule.dev push/${operation} failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as T
  }
}

/**
 * Create a hosted push notifications provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `PushNotificationProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculePushConfig): PushNotificationProvider {
  return new MoleculePushProvider(config)
}
