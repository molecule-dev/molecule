/**
 * Type definitions for the inbound-emails core interface.
 *
 * @module
 */

/**
 * A binary attachment carried by an inbound email.
 *
 * Providers normalize whatever multipart/MIME representation they receive
 * into this neutral shape. The body is base64-encoded so the type is
 * JSON-serializable across IPC, queue, and webhook boundaries.
 */
export interface InboundEmailAttachment {
  /**
   * The original filename as supplied by the sender, or a provider-derived
   * fallback when the sender omitted one.
   */
  name: string

  /**
   * MIME type of the attachment (e.g. `'application/pdf'`, `'image/png'`).
   * Defaults to `'application/octet-stream'` when the provider cannot
   * determine the type.
   */
  contentType: string

  /**
   * Attachment payload, base64-encoded.
   */
  contentBase64: string

  /**
   * Optional size hint in bytes of the decoded payload. Providers MAY set
   * this from upstream headers without decoding the payload themselves.
   */
  sizeBytes?: number

  /**
   * Optional Content-ID, used for inline images referenced from the HTML
   * body via `cid:` URLs.
   */
  contentId?: string
}

/**
 * A normalized inbound email, produced by parsing a provider webhook
 * payload through {@link InboundEmailProvider.parseWebhookPayload}.
 *
 * All providers (Mailgun Routes, SES Inbound, fixtures, etc.) return this
 * same shape so handler code can treat inbound mail uniformly. Provider
 * specifics (raw MIME, signing tokens, etc.) MUST NOT leak into this type.
 */
export interface InboundEmail {
  /**
   * Stable provider-supplied identifier for the message. Used for
   * deduplication when the same webhook is retried.
   */
  id: string

  /**
   * Sender address (RFC 5322 mailbox), e.g. `'alice@example.com'`.
   */
  from: string

  /**
   * Primary recipient addresses (the values from the `To:` header).
   */
  to: string[]

  /**
   * Carbon-copy recipient addresses, if present.
   */
  cc?: string[]

  /**
   * Subject line, decoded to a plain string. May be empty.
   */
  subject: string

  /**
   * Plain-text body of the message, if present.
   */
  textBody?: string

  /**
   * HTML body of the message, if present.
   */
  htmlBody?: string

  /**
   * Decoded attachments. An empty array when the message has none.
   */
  attachments?: InboundEmailAttachment[]

  /**
   * All headers from the raw message, lowercased keys to canonicalize the
   * many capitalizations that mail servers use. Multi-value headers
   * (`Received:`, etc.) are joined with newlines or returned as arrays at
   * provider discretion — see provider docs.
   */
  headers: Record<string, string | string[]>

  /**
   * Server-side timestamp the inbound provider received the message.
   */
  receivedAt: Date

  /**
   * Optional `Message-ID` header value for threading. Surfaced separately
   * from {@link headers} because helpdesk handlers almost always need it.
   */
  messageId?: string

  /**
   * Optional `In-Reply-To` header value for threading replies into an
   * existing ticket.
   */
  inReplyTo?: string

  /**
   * Optional `References` header values for threading.
   */
  references?: string[]
}

/**
 * Outgoing reply produced by handler code in response to an
 * {@link InboundEmail}. Providers that support the optional
 * {@link InboundEmailProvider.replyTo} method translate this into whatever
 * outbound mechanism their upstream offers (Mailgun reply route, SES
 * SendEmail, etc.).
 *
 * For providers that do NOT expose an outbound reply path, handler code
 * SHOULD fall back to the regular `@molecule/api-emails` outbound bond.
 */
export interface InboundEmailReply {
  /**
   * Subject line for the outbound reply. If omitted, providers SHOULD
   * default to the original subject prefixed with `'Re: '` (locale-aware
   * prefixing is the caller's responsibility).
   */
  subject?: string

  /**
   * Plain-text body of the reply, if any.
   */
  textBody?: string

  /**
   * HTML body of the reply, if any.
   */
  htmlBody?: string

  /**
   * Attachments to send with the reply.
   */
  attachments?: InboundEmailAttachment[]

  /**
   * Optional override for the `From:` address. Defaults to the address
   * the original message was sent to (the inbound mailbox).
   */
  from?: string

  /**
   * Optional additional headers to set on the outbound message.
   */
  headers?: Record<string, string>
}

/**
 * Result of a successful reply dispatch via
 * {@link InboundEmailProvider.replyTo}.
 */
export interface InboundEmailReplyResult {
  /**
   * Provider-supplied identifier for the dispatched outbound message.
   */
  id: string
}

/**
 * Inbound-email provider interface.
 *
 * Implementations (Mailgun Routes, SES Inbound, etc.) live in separate
 * bond packages (`@molecule/api-emails-inbound-mailgun-routes`,
 * `@molecule/api-emails-inbound-ses`). The interface is deliberately
 * minimal: a webhook arrives at the host application's HTTP layer, the
 * raw headers and body are handed to the provider, and the provider
 * returns a normalized {@link InboundEmail}.
 *
 * Signature verification is mandatory for any provider that runs against
 * a public webhook endpoint; {@link verifySignature} is the hook for
 * that. Providers without signed webhooks SHOULD return `false` rather
 * than `true` so callers can decide whether to accept unsigned mail.
 */
export interface InboundEmailProvider {
  /**
   * Parses the raw webhook payload (HTTP headers + body) into a
   * normalized {@link InboundEmail}.
   *
   * @param headers - HTTP request headers received by the webhook
   *   endpoint. Lowercased keys are recommended but not required;
   *   implementations MUST handle either casing.
   * @param body - Raw HTTP request body. May be a `Buffer` (e.g. from a
   *   raw body parser), a `string`, or an already-parsed object provided
   *   by an upstream JSON middleware.
   * @returns The normalized inbound email.
   */
  parseWebhookPayload(
    headers: Record<string, string | string[] | undefined>,
    body: Buffer | string | Record<string, unknown>,
  ): Promise<InboundEmail>

  /**
   * Verifies the signature of a webhook request, using whatever scheme
   * the provider exposes (Mailgun HMAC, SES SNS subscription
   * confirmation, etc.). Implementations MUST be constant-time when
   * comparing secrets.
   *
   * A genuinely invalid webhook (forged, stale, malformed, tampered
   * signature) resolves `false` — that is the normal, expected failure
   * path and callers map it to a `401`. Implementations MAY instead THROW
   * a tagged configuration error (e.g. via `configNotConfiguredError()`
   * from `@molecule/api-secrets`) when the provider itself is
   * misconfigured — for example a missing signing key/secret. This is a
   * DISTINCT failure class from a `false` return: a misconfigured server
   * is not the same problem as a forged request, and collapsing both into
   * the same `false` makes a broken deployment indistinguishable from an
   * attack, with no trace either way. `@molecule/api-emails-inbound-mailgun`
   * follows this pattern — `verifySignature` throws the tagged
   * `config.notConfigured` error when `MAILGUN_API_KEY` is unset, and
   * resolves `false` for every other verification failure.
   *
   * @param headers - HTTP request headers received by the webhook
   *   endpoint.
   * @param body - Raw HTTP request body. Implementations that need the
   *   exact bytes (e.g. for HMAC) MUST be passed a `Buffer`.
   * @returns `true` when the signature is valid, `false` for an
   *   invalid/forged/stale/malformed webhook.
   * @throws {Error} Implementations MAY throw a tagged configuration error
   *   when the provider is missing required configuration (e.g. an unset
   *   signing key) — a server misconfiguration, not an invalid request.
   * @example
   * ```typescript
   * // In an HTTP handler bound to the inbound webhook URL:
   * const ok = await verifySignature(req.headers, req.rawBody)
   * if (!ok) return res.status(401).end()
   * // A thrown configuration error (server misconfigured) is deliberately
   * // NOT caught above — do not wrap this call in a try/catch that maps
   * // every failure to the same 401. Let it propagate to standard error
   * // middleware, which maps a tagged config error to a 503, distinct
   * // from the 401 an invalid/forged webhook gets.
   * ```
   */
  verifySignature(
    headers: Record<string, string | string[] | undefined>,
    body: Buffer | string,
  ): Promise<boolean>

  /**
   * Optional: dispatches an outbound reply through the provider's own
   * reply mechanism. Providers that do not support reply dispatch (e.g.
   * pure inbound-only adapters) SHOULD omit this method; callers MUST
   * use {@link InboundEmailProvider.supportsReply} to detect support.
   *
   * @param email - The original inbound email being replied to.
   * @param reply - The reply payload.
   * @returns Result of the dispatch.
   */
  replyTo?(email: InboundEmail, reply: InboundEmailReply): Promise<InboundEmailReplyResult>

  /**
   * Indicates whether the provider supports outbound reply dispatch via
   * {@link replyTo}. Implementations SHOULD return a stable `true` /
   * `false` based on their own configuration; the property is a function
   * so providers can defer to runtime configuration if needed.
   *
   * @returns `true` when {@link replyTo} is implemented and ready to use.
   */
  supportsReply(): boolean
}
