/**
 * Stripe Identity KYC provider.
 *
 * Implements the {@link KycProvider} contract against the Stripe Identity
 * REST API (`/v1/identity/verification_sessions`) using `fetch` + manual
 * `stripe-signature` verification. Avoids pulling in the heavyweight
 * `stripe` SDK so this bond stays light and deterministic to test.
 *
 * Token-bearing values (`STRIPE_SECRET_KEY`, `STRIPE_IDENTITY_WEBHOOK_SECRET`,
 * Authorization headers, raw Stripe error bodies that may echo request data)
 * are NEVER thrown or logged — every error path is funneled through
 * {@link sanitizeError}.
 *
 * @module
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import type {
  CreateKycSessionOptions,
  KycProvider,
  KycSession,
  KycSessionStatus,
  KycStatus,
  KycVerificationType,
  KycWebhookEvent,
  KycWebhookEventType,
  KycWebhookHeaders,
} from '@molecule/api-kyc'

import type { StripeIdentityProviderOptions } from './types.js'

const DEFAULT_API_BASE_URL = 'https://api.stripe.com'
const DEFAULT_API_VERSION = '2024-06-20'
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300

interface StripeVerificationSession {
  id?: string
  url?: string | null
  client_secret?: string | null
  expires_at?: number | null
  status?: string
  type?: string
  metadata?: Record<string, string> | null
  last_error?: { code?: string | null; reason?: string | null } | null
  [k: string]: unknown
}

interface StripeWebhookEvent {
  id?: string
  type?: string
  data?: { object?: StripeVerificationSession }
  [k: string]: unknown
}

/**
 * Strips potentially-sensitive values out of any thrown error and returns a
 * safe, generic Error.
 *
 * Stripe error bodies may contain partial request data, customer ids, or
 * other secrets — we never include them verbatim.
 *
 * @param scope - Short label of the calling operation (e.g. `"createSession"`).
 * @param status - HTTP status code, when known.
 * @param code - Stripe error `code` field, when known.
 * @returns A new Error safe to throw and log.
 */
const sanitizeError = (scope: string, status?: number, code?: string): Error => {
  const parts = [`Stripe Identity ${scope} failed`]
  if (status !== undefined) parts.push(`status=${status}`)
  if (code) parts.push(`code=${code}`)
  return new Error(parts.join(' '))
}

/**
 * Maps Stripe's `verification_session.status` to the normalized
 * {@link KycStatus}.
 *
 * @param raw - The Stripe status string. Unknown values map to `pending`.
 * @returns The normalized status.
 */
const mapStatus = (raw?: string): KycStatus => {
  switch (raw) {
    case 'verified':
      return 'verified'
    case 'canceled':
      return 'canceled'
    case 'processing':
      return 'processing'
    case 'requires_input':
      return 'requires_input'
    case 'requires_action':
      return 'requires_input'
    default:
      return 'pending'
  }
}

/**
 * Stripe Identity uses these `type` values; we mirror them on
 * {@link KycVerificationType}. Non-Stripe types (e.g. `address`) are passed
 * through but Stripe will reject them at session creation.
 *
 * @param raw - The Stripe `type` string from the API response.
 * @returns The normalized verification type, or undefined if missing.
 */
const mapType = (raw?: string): KycVerificationType | undefined => {
  if (raw === 'document') return 'document'
  if (raw === 'id_number') return 'id_number'
  if (raw === 'address') return 'address'
  return undefined
}

/**
 * Stripe webhook event-type → normalized {@link KycWebhookEventType}.
 *
 * @param raw - The Stripe `event.type` string.
 * @returns The normalized event type, or undefined if not a known KYC event.
 */
const mapWebhookEventType = (raw?: string): KycWebhookEventType | undefined => {
  switch (raw) {
    case 'identity.verification_session.verified':
      return 'verification.verified'
    case 'identity.verification_session.requires_input':
      return 'verification.requires_input'
    case 'identity.verification_session.canceled':
      return 'verification.canceled'
    default:
      return undefined
  }
}

/**
 * Encodes a flat object as `application/x-www-form-urlencoded` body. Nested
 * keys (e.g. `metadata[user_id]`) are flattened — Stripe expects this shape.
 *
 * @param body - Flat key/value pairs (values coerced to strings).
 * @returns The encoded request body.
 */
const encodeForm = (body: Record<string, string>): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    params.append(key, value)
  }
  return params.toString()
}

/**
 * Builds the form-encoded body for `POST /v1/identity/verification_sessions`.
 *
 * @param options - Caller-supplied session parameters.
 * @returns The encoded request body string.
 */
const buildCreateBody = (options: CreateKycSessionOptions): string => {
  const body: Record<string, string> = {
    type: options.type,
    'metadata[molecule_user_id]': options.userId,
    'metadata[molecule_verification_type]': options.type,
  }
  if (options.returnUrl) body.return_url = options.returnUrl
  if (options.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      body[`metadata[${key}]`] = value
    }
  }
  return encodeForm(body)
}

/**
 * Reads the first header value (case-insensitively) from a header bag whose
 * values may be `string | string[] | undefined`.
 *
 * @param headers - Inbound webhook headers.
 * @param name - Header name to look up. Comparison is case-insensitive.
 * @returns The header value, or undefined.
 */
const headerValue = (headers: KycWebhookHeaders, name: string): string | undefined => {
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== target) continue
    if (Array.isArray(value)) return value[0]
    if (typeof value === 'string') return value
  }
  return undefined
}

/**
 * Parses a `stripe-signature` header (`t=...,v1=...,v1=...`).
 *
 * @param raw - The raw header value.
 * @returns Parsed timestamp and v1 signatures (may be multiple).
 */
const parseSignatureHeader = (raw: string): { timestamp: number; signatures: string[] } | null => {
  let timestamp: number | undefined
  const signatures: string[] = []
  for (const pair of raw.split(',')) {
    const [key, value] = pair.split('=')
    if (!key || !value) continue
    if (key === 't') {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isNaN(parsed)) timestamp = parsed
    } else if (key === 'v1') {
      signatures.push(value)
    }
  }
  if (timestamp === undefined || signatures.length === 0) return null
  return { timestamp, signatures }
}

/**
 * Constant-time hex-string comparison that tolerates differing input
 * lengths without throwing.
 *
 * @param a - First hex string.
 * @param b - Second hex string.
 * @returns True if the strings are byte-equal.
 */
const safeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}

/**
 * Verifies a Stripe webhook signature. Equivalent to
 * `Stripe.webhooks.constructEvent` minus the SDK dependency.
 *
 * @param payload - The raw request body.
 * @param signatureHeader - The `stripe-signature` header value.
 * @param secret - The webhook signing secret.
 * @param toleranceSeconds - Allowed clock-drift between hosts.
 * @param now - Current epoch millis (injectable for tests).
 * @returns Nothing on success.
 * @throws {Error} If the signature is missing, malformed, expired, or invalid.
 */
export const verifyStripeSignature = (
  payload: string | Buffer,
  signatureHeader: string | undefined,
  secret: string,
  toleranceSeconds: number,
  now: number = Date.now(),
): void => {
  if (!signatureHeader) {
    throw new Error('Stripe Identity webhook signature missing')
  }
  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed) {
    throw new Error('Stripe Identity webhook signature malformed')
  }

  const ageSeconds = Math.abs(Math.floor(now / 1000) - parsed.timestamp)
  if (ageSeconds > toleranceSeconds) {
    throw new Error('Stripe Identity webhook signature expired')
  }

  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8')
  const signedPayload = `${parsed.timestamp}.${payloadString}`
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

  for (const candidate of parsed.signatures) {
    if (safeEqualHex(candidate, expected)) return
  }
  throw new Error('Stripe Identity webhook signature mismatch')
}

/**
 * Performs a `fetch` call against Stripe's REST API with a timeout, basic
 * auth, and standard headers. Errors are sanitized before they leave this
 * function so secret material never escapes.
 *
 * @param method - HTTP method (`GET` or `POST`).
 * @param path - API path beginning with `/`.
 * @param scope - Calling-operation label for sanitized error messages.
 * @param secretKey - Stripe API secret.
 * @param apiBaseUrl - API base URL.
 * @param apiVersion - `Stripe-Version` header value.
 * @param timeoutMs - Request timeout.
 * @param fetchImpl - Fetch implementation.
 * @param body - Form-encoded body string for POSTs.
 * @returns The parsed JSON response.
 */
const stripeFetch = async <T>(
  method: 'GET' | 'POST',
  path: string,
  scope: string,
  secretKey: string,
  apiBaseUrl: string,
  apiVersion: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  body?: string,
): Promise<T> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const headers: Record<string, string> = {
      authorization: `Bearer ${secretKey}`,
      accept: 'application/json',
      'stripe-version': apiVersion,
    }
    if (method === 'POST') {
      headers['content-type'] = 'application/x-www-form-urlencoded'
    }
    const response = await fetchImpl(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    })
    if (!response.ok) {
      let code: string | undefined
      try {
        const errorJson = (await response.json()) as { error?: { code?: string } }
        code = errorJson?.error?.code
      } catch {
        // Body wasn't JSON — keep code undefined; the message stays safe.
      }
      throw sanitizeError(scope, response.status, code)
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Stripe Identity ')) {
      throw error
    }
    if ((error as { name?: string })?.name === 'AbortError') {
      throw sanitizeError(scope, undefined, 'timeout')
    }
    throw sanitizeError(scope)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Translates a Stripe `verification_session` payload into the normalized
 * {@link KycSession} shape.
 *
 * @param raw - The Stripe verification session JSON.
 * @returns A normalized session.
 */
const toSession = (raw: StripeVerificationSession): KycSession => {
  const sessionId = raw.id
  if (!sessionId) {
    throw new Error('Stripe Identity createSession failed: missing id in response')
  }
  return {
    sessionId,
    url: raw.url ?? null,
    expiresAt: raw.expires_at ? raw.expires_at * 1000 : undefined,
  }
}

/**
 * Translates a Stripe `verification_session` payload into the normalized
 * {@link KycSessionStatus} shape.
 *
 * @param raw - The Stripe verification session JSON.
 * @returns A normalized status.
 */
const toStatus = (raw: StripeVerificationSession): KycSessionStatus => {
  const sessionId = raw.id
  if (!sessionId) {
    throw new Error('Stripe Identity getStatus failed: missing id in response')
  }
  return {
    sessionId,
    status: mapStatus(raw.status),
    type: mapType(raw.type),
    lastErrorCode: raw.last_error?.code ?? undefined,
    lastErrorReason: raw.last_error?.reason ?? undefined,
  }
}

/**
 * Creates a Stripe Identity provider.
 *
 * @param options - Optional configuration. Falls back to
 *   `STRIPE_SECRET_KEY` / `STRIPE_IDENTITY_WEBHOOK_SECRET` env vars when
 *   `secretKey` / `webhookSecret` are omitted.
 * @returns A {@link KycProvider} implementation.
 */
export const createProvider = (options: StripeIdentityProviderOptions = {}): KycProvider => {
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const apiVersion = options.apiVersion ?? DEFAULT_API_VERSION
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const webhookToleranceSeconds =
    options.webhookToleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS
  const fetchImpl = options.fetch ?? fetch

  const getSecretKey = (): string => {
    const key = options.secretKey ?? process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('Stripe Identity bond is missing STRIPE_SECRET_KEY (or secretKey option).')
    }
    return key
  }

  const getWebhookSecret = (): string => {
    const secret = options.webhookSecret ?? process.env.STRIPE_IDENTITY_WEBHOOK_SECRET
    if (!secret) {
      throw new Error(
        'Stripe Identity bond is missing STRIPE_IDENTITY_WEBHOOK_SECRET (or webhookSecret option).',
      )
    }
    return secret
  }

  return {
    async createVerificationSession(createOptions: CreateKycSessionOptions): Promise<KycSession> {
      const body = buildCreateBody(createOptions)
      const raw = await stripeFetch<StripeVerificationSession>(
        'POST',
        '/v1/identity/verification_sessions',
        'createSession',
        getSecretKey(),
        apiBaseUrl,
        apiVersion,
        timeoutMs,
        fetchImpl,
        body,
      )
      return toSession(raw)
    },

    async getVerificationStatus(sessionId: string): Promise<KycSessionStatus> {
      const raw = await stripeFetch<StripeVerificationSession>(
        'GET',
        `/v1/identity/verification_sessions/${encodeURIComponent(sessionId)}`,
        'getStatus',
        getSecretKey(),
        apiBaseUrl,
        apiVersion,
        timeoutMs,
        fetchImpl,
      )
      return toStatus(raw)
    },

    async cancelVerificationSession(sessionId: string): Promise<KycSessionStatus> {
      const raw = await stripeFetch<StripeVerificationSession>(
        'POST',
        `/v1/identity/verification_sessions/${encodeURIComponent(sessionId)}/cancel`,
        'cancelSession',
        getSecretKey(),
        apiBaseUrl,
        apiVersion,
        timeoutMs,
        fetchImpl,
      )
      return toStatus(raw)
    },

    async processWebhook(
      headers: KycWebhookHeaders,
      rawBody: string | Buffer,
    ): Promise<KycWebhookEvent> {
      const signature = headerValue(headers, 'stripe-signature')
      verifyStripeSignature(rawBody, signature, getWebhookSecret(), webhookToleranceSeconds)

      const payloadString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')

      let event: StripeWebhookEvent
      try {
        event = JSON.parse(payloadString) as StripeWebhookEvent
      } catch {
        throw new Error('Stripe Identity webhook payload is not valid JSON')
      }

      const normalizedType = mapWebhookEventType(event.type)
      if (!normalizedType) {
        throw new Error(`Stripe Identity webhook event type not supported: ${event.type ?? ''}`)
      }

      const session = event.data?.object ?? {}
      const sessionId = session.id
      if (!sessionId) {
        throw new Error('Stripe Identity webhook payload missing session id')
      }

      const metadata = session.metadata ?? undefined
      const userId = metadata?.molecule_user_id

      return {
        type: normalizedType,
        sessionId,
        userId,
        verificationType: mapType(session.type),
        metadata: metadata ?? undefined,
        lastErrorCode: session.last_error?.code ?? undefined,
        lastErrorReason: session.last_error?.reason ?? undefined,
        raw: event as unknown as Record<string, unknown>,
      }
    },
  }
}
