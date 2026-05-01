/**
 * Type definitions for the KYC / identity verification core interface.
 *
 * Defines a stack-neutral contract for KYC bonds (Stripe Identity, Persona,
 * Onfido, Sumsub, etc.). Sessions are the unit of verification — the caller
 * creates one per user-attempted verification, redirects the user to the
 * provider-hosted flow, then either polls {@link KycProvider.getVerificationStatus}
 * or processes provider webhooks via {@link KycProvider.processWebhook}.
 *
 * @module
 */

/**
 * Type of identity check requested for a verification session.
 *
 * - `document` — government-issued photo ID + selfie liveness check.
 * - `id_number` — verifies a government-issued number (e.g. SSN) without a document.
 * - `address` — verifies the user's residential address.
 *
 * Provider support varies; bonds MAY throw when asked for a type they do not
 * support.
 */
export type KycVerificationType = 'document' | 'id_number' | 'address'

/**
 * Normalized verification status, common across all KYC bonds.
 *
 * - `pending` — the session has been created but the user has not started.
 * - `requires_input` — provider has rejected or paused; the user must take
 *   another action (resubmit document, retry selfie, etc.).
 * - `processing` — provider is currently reviewing submitted material.
 * - `verified` — verification succeeded.
 * - `canceled` — the session was canceled (by caller, user, or provider).
 */
export type KycStatus = 'pending' | 'requires_input' | 'processing' | 'verified' | 'canceled'

/**
 * Caller-supplied parameters when creating a verification session.
 */
export interface CreateKycSessionOptions {
  /**
   * Caller's stable identifier for the end user. Stored as provider metadata
   * so webhook events and status lookups can be correlated.
   */
  userId: string
  /** Type of identity check to request. */
  type: KycVerificationType
  /**
   * URL to send the user to after they complete or abandon the
   * provider-hosted flow. Some providers also expose a hosted URL — see
   * {@link KycSession.url}.
   */
  returnUrl?: string
  /**
   * Free-form key/value pairs forwarded to the provider as session metadata.
   * Useful for correlating with caller-side records (case id, app id, etc.).
   * Values are coerced to strings by the provider.
   */
  metadata?: Record<string, string>
}

/**
 * A verification session created with a KYC provider.
 *
 * Sessions are the unit of state — once created they progress through
 * statuses ({@link KycStatus}) until terminal (`verified` or `canceled`).
 */
export interface KycSession {
  /** Provider-specific session identifier. Opaque to callers. */
  sessionId: string
  /**
   * Provider-hosted URL to redirect the user to. Some providers (e.g. those
   * using a client-side SDK with a single-use token) MAY return `null` —
   * callers must then use the SDK directly.
   */
  url: string | null
  /**
   * Optional epoch-millis expiry of the hosted session. After this time the
   * session URL stops working and the caller must create a new session.
   */
  expiresAt?: number
}

/**
 * Result of {@link KycProvider.getVerificationStatus}.
 */
export interface KycSessionStatus {
  /** Provider-specific session identifier. */
  sessionId: string
  /** Normalized status across providers. */
  status: KycStatus
  /**
   * Verification type at create time. Useful for callers that do not store
   * the type alongside the session id.
   */
  type?: KycVerificationType
  /**
   * Provider-specific reason code when status is `requires_input` or
   * `canceled`. Opaque string — meant for logging / display, not branching.
   */
  lastErrorCode?: string
  /** Provider-specific human-readable error reason. */
  lastErrorReason?: string
}

/**
 * Headers required for {@link KycProvider.processWebhook}. Lower-cased keys.
 *
 * Different providers use different header names for the signature; bonds
 * are responsible for picking the right one(s) from this map. Callers
 * should pass the request's headers verbatim.
 */
export type KycWebhookHeaders = Record<string, string | string[] | undefined>

/**
 * Discriminated event type emitted by {@link KycProvider.processWebhook}.
 *
 * Bonds normalize provider-specific event names into one of these three
 * variants. Provider-specific raw payload is preserved in {@link KycWebhookEvent.raw}
 * so callers needing extra detail can opt in.
 */
export type KycWebhookEventType =
  | 'verification.verified'
  | 'verification.requires_input'
  | 'verification.canceled'

/**
 * A normalized webhook event. Returned by {@link KycProvider.processWebhook}
 * after the signature has been verified.
 */
export interface KycWebhookEvent {
  /** The normalized event type. */
  type: KycWebhookEventType
  /** Provider-specific session identifier the event applies to. */
  sessionId: string
  /** Caller-supplied user id stored in session metadata. */
  userId?: string
  /** Verification type at create time. */
  verificationType?: KycVerificationType
  /** Caller-supplied metadata stored on the session. */
  metadata?: Record<string, string>
  /** Provider-specific reason code for failure events. */
  lastErrorCode?: string
  /** Provider-specific human-readable failure reason. */
  lastErrorReason?: string
  /** Raw provider event object — kept for round-tripping / debugging. */
  raw?: Record<string, unknown>
}

/**
 * KYC provider contract.
 *
 * Each method is stack-neutral; bonds for different providers (Stripe Identity,
 * Persona, Onfido, Sumsub) expose the same shape. Providers throw on errors
 * with sanitized messages — never leaking API keys, webhook secrets, or
 * verbatim provider error bodies that may echo credentials.
 */
export interface KycProvider {
  /**
   * Creates a new verification session at the provider.
   *
   * @param options - Session parameters (user, type, return URL, metadata).
   * @returns The created session, including a hosted URL where applicable.
   */
  createVerificationSession(options: CreateKycSessionOptions): Promise<KycSession>

  /**
   * Fetches the current status of a verification session.
   *
   * @param sessionId - Provider-specific session id from
   *   {@link KycSession.sessionId}.
   * @returns The normalized session status.
   */
  getVerificationStatus(sessionId: string): Promise<KycSessionStatus>

  /**
   * Cancels a verification session. Idempotent — canceling an already-canceled
   * session SHOULD return the same status without throwing.
   *
   * @param sessionId - Provider-specific session id from
   *   {@link KycSession.sessionId}.
   * @returns The session status after cancellation.
   */
  cancelVerificationSession(sessionId: string): Promise<KycSessionStatus>

  /**
   * Verifies the signature of an inbound webhook and returns the normalized
   * event. Throws if the signature is invalid or the payload cannot be parsed.
   *
   * @param headers - Inbound request headers (verbatim — bonds extract the
   *   right signature header).
   * @param body - Raw request body bytes (do NOT pass a parsed JSON object —
   *   most providers sign the exact byte sequence).
   * @returns The normalized webhook event.
   */
  processWebhook(headers: KycWebhookHeaders, body: string | Buffer): Promise<KycWebhookEvent>
}
