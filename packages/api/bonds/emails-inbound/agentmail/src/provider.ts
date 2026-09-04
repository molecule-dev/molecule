/**
 * AgentMail inbound-email provider implementation.
 *
 * AgentMail gives an application its own inbox and POSTs a JSON
 * `message.received` event to a registered webhook URL for every message
 * that lands there. Deliveries are signed by Svix: the `svix-id`,
 * `svix-timestamp` and `svix-signature` headers carry an HMAC-SHA256 over
 * `${id}.${timestamp}.${rawBody}` keyed by the webhook's `whsec_` secret.
 *
 * The webhook is deliberately incomplete on the wire — attachments arrive
 * as metadata only, and `text`/`html` are dropped once the payload would
 * exceed 1 MB — so `parseWebhookPayload` hydrates what is missing through
 * the API (`api.ts`). Replies go through AgentMail's own reply endpoint
 * from the inbox that received the message.
 *
 * @see https://docs.agentmail.to/webhooks
 * @see https://docs.agentmail.to/webhook-verification
 * @see https://docs.svix.com/receiving/verifying-payloads/how-manual
 *
 * @module
 */

import { createHmac } from 'node:crypto'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  InboundEmail,
  InboundEmailAttachment,
  InboundEmailProvider,
  InboundEmailReply,
  InboundEmailReplyResult,
} from '@molecule/api-emails-inbound'
import { configNotConfiguredError } from '@molecule/api-secrets'

import { downloadAttachment, getMessage, replyToMessage } from './api.js'
import type {
  AgentMailAttachmentMeta,
  AgentMailMessage,
  AgentMailReplyAttachment,
  AgentMailReplyRequest,
  AgentMailWebhookEvent,
} from './types.js'
import {
  buildSignedContent,
  decodeWebhookSecret,
  DEFAULT_REPLAY_WINDOW_SECONDS,
  getHeader,
  isRecord,
  lowercaseHeaderMap,
  normalizeAddressList,
  parseJsonBody,
  parseSignatureHeader,
  parseTimestamp,
  safeEqualBase64,
  unwrapMessageId,
} from './utilities.js'

/** Event-type prefix shared by every inbound-message event AgentMail emits. */
const INBOUND_EVENT_PREFIX = 'message.received'

/**
 * Upper bound on the in-process `email.id → inbox_id` record kept by
 * {@link parseWebhookPayload} for {@link replyTo}. Oldest entries are
 * evicted first.
 */
const INBOX_MEMO_LIMIT = 1000

/**
 * `email.id` → `inbox_id` for messages parsed in this process, so a reply
 * issued from the same webhook handler (the agent-auto-responder case)
 * needs no configuration. Cross-process/after-restart replies use
 * `AGENTMAIL_INBOX_ID` instead.
 */
const inboxByEmailId = new Map<string, string>()

/**
 * Clears the in-process inbox record. Exposed for tests.
 */
export const _resetInboxMemo = (): void => {
  inboxByEmailId.clear()
}

/**
 * Records which inbox a parsed message belongs to, evicting the oldest
 * entry once the record is full.
 *
 * @param emailId - The normalized email's `id`.
 * @param inboxId - AgentMail's `inbox_id`.
 */
const rememberInbox = (emailId: string, inboxId: string): void => {
  if (inboxByEmailId.size >= INBOX_MEMO_LIMIT) {
    const oldest = inboxByEmailId.keys().next()
    if (!oldest.done) inboxByEmailId.delete(oldest.value)
  }
  inboxByEmailId.set(emailId, inboxId)
}

/**
 * Reads the webhook signing secret from the environment, throwing the
 * tagged `config.notConfigured` error (never revealing any value) when unset.
 *
 * @returns The signing secret.
 */
const getWebhookSecret = (): string => {
  const secret = process.env.AGENTMAIL_WEBHOOK_SECRET
  if (!secret) {
    // Tagged config-missing error → clean 503 + 'config.notConfigured', with the
    // registered definition's description + setup URL (see classifyTaggedError).
    throw configNotConfiguredError('AGENTMAIL_WEBHOOK_SECRET', 'inbound email')
  }
  return secret
}

/**
 * Reads the configured replay window (seconds) for inbound webhooks. Falls
 * back to {@link DEFAULT_REPLAY_WINDOW_SECONDS} when unset or invalid.
 *
 * @returns The replay window in seconds.
 */
const getReplayWindowSeconds = (): number => {
  const raw = process.env.AGENTMAIL_INBOUND_REPLAY_WINDOW_SECONDS
  if (!raw) return DEFAULT_REPLAY_WINDOW_SECONDS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REPLAY_WINDOW_SECONDS
}

/**
 * The optional inbox this deployment owns.
 *
 * @returns `AGENTMAIL_INBOX_ID` when set and non-empty, else `undefined`.
 */
const getConfiguredInboxId = (): string | undefined => {
  const raw = process.env.AGENTMAIL_INBOX_ID?.trim()
  return raw && raw.length > 0 ? raw : undefined
}

/**
 * Verifies an AgentMail (Svix) webhook signature: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${rawBody}` keyed by the base64-decoded
 * `whsec_` secret, base64-encoded, matched against ANY `v1,…` entry of the
 * `svix-signature` header in constant time. The Standard-Webhooks aliases
 * `webhook-id` / `webhook-timestamp` / `webhook-signature` are accepted
 * too. Timestamps outside the replay window are rejected.
 *
 * `body` MUST be the exact bytes received — a parsed-then-re-serialized
 * JSON body will not verify.
 *
 * Distinguishes SERVER MISCONFIGURATION from a genuinely invalid webhook:
 * an unset `AGENTMAIL_WEBHOOK_SECRET` THROWS the tagged
 * `config.notConfigured` error (mapped by the API error middleware to a
 * clean 503) instead of returning `false`. Missing signature headers, a
 * stale timestamp and a tampered signature all resolve `false` (401) —
 * those ARE the "this request is not from AgentMail" class.
 *
 * @param headers - HTTP headers; the three `svix-*` signing headers.
 * @param body - Raw HTTP request body (JSON bytes, unchanged).
 * @returns `true` when the signature verifies and the timestamp is fresh;
 *   `false` for a malformed/stale/forged webhook.
 * @throws {Error} The tagged `config.notConfigured` error when
 *   `AGENTMAIL_WEBHOOK_SECRET` is unset — a caller MUST NOT treat this as
 *   `false` (that would 401-with-no-trace every inbound webhook instead of
 *   surfacing the actionable 503).
 */
export const verifySignature = async (
  headers: Record<string, string | string[] | undefined>,
  body: Buffer | string,
): Promise<boolean> => {
  // Deliberately NOT caught here: an unconfigured secret is a server
  // misconfiguration, not "signature invalid," and must propagate as the
  // tagged config error so the caller (the API error middleware) can 503
  // instead of silently 401ing every webhook. See @throws above.
  const secret = getWebhookSecret()

  const id = getHeader(headers, 'svix-id') ?? getHeader(headers, 'webhook-id')
  const timestamp = getHeader(headers, 'svix-timestamp') ?? getHeader(headers, 'webhook-timestamp')
  const signatureHeader =
    getHeader(headers, 'svix-signature') ?? getHeader(headers, 'webhook-signature')

  if (!id || !timestamp || !signatureHeader) return false

  // Reject stale timestamps to defend against replay.
  if (!/^\d+$/u.test(timestamp)) return false
  const ts = Number.parseInt(timestamp, 10)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - ts) > getReplayWindowSeconds()) return false

  const key = decodeWebhookSecret(secret)
  if (key.length === 0) return false

  const expected = createHmac('sha256', key)
    .update(buildSignedContent(id, timestamp, body))
    .digest('base64')

  // Compare against every v1 entry: Svix sends several during a secret
  // rotation. `some` short-circuits on the first MATCH only, and each
  // comparison is itself constant-time.
  return parseSignatureHeader(signatureHeader).some((candidate) =>
    safeEqualBase64(expected, candidate),
  )
}

/**
 * Type guard for the subset of {@link AgentMailMessage} this bond requires
 * (`inbox_id` + `message_id` strings). Every other field is optional in the
 * schema and read defensively downstream.
 *
 * @param value - Candidate `message` object.
 * @returns `true` when `value` carries the required ids.
 */
const isAgentMailMessage = (value: unknown): value is AgentMailMessage => {
  if (!isRecord(value)) return false
  return (
    typeof value.inbox_id === 'string' &&
    value.inbox_id.length > 0 &&
    typeof value.message_id === 'string' &&
    value.message_id.length > 0
  )
}

/**
 * Validates a parsed webhook body as an inbound-message event.
 *
 * @param parsed - The parsed JSON body.
 * @returns The typed event.
 * @throws {Error} When the body is not an object, has no `event_type`, is
 *   an event other than `message.received*`, or lacks a usable `message`.
 */
const asInboundEvent = (parsed: unknown): AgentMailWebhookEvent => {
  if (!isRecord(parsed)) {
    throw new Error('AgentMail webhook payload is not a JSON object.')
  }
  const eventType = parsed.event_type
  if (typeof eventType !== 'string' || eventType.length === 0) {
    throw new Error('AgentMail webhook payload has no `event_type`.')
  }
  if (!eventType.startsWith(INBOUND_EVENT_PREFIX)) {
    throw new Error(
      `AgentMail event "${eventType}" is not an inbound message — register this webhook URL for ` +
        `\`message.received\` (and, if wanted, its .spam/.blocked/.unauthenticated variants) only.`,
    )
  }
  const message = parsed.message
  if (!isAgentMailMessage(message)) {
    throw new Error(
      'AgentMail webhook payload has no `message` with string `inbox_id` and `message_id`.',
    )
  }
  const event: AgentMailWebhookEvent = { event_type: eventType, message }
  if (typeof parsed.event_id === 'string') event.event_id = parsed.event_id
  if (typeof parsed.type === 'string') event.type = parsed.type
  return event
}

/**
 * Maps one attachment's metadata + downloaded bytes onto the normalized
 * shape.
 *
 * @param meta - Attachment metadata (webhook or API).
 * @param contentBase64 - The downloaded bytes, base64-encoded.
 * @returns The normalized attachment.
 */
const toInboundAttachment = (
  meta: AgentMailAttachmentMeta,
  contentBase64: string,
): InboundEmailAttachment => {
  const attachment: InboundEmailAttachment = {
    name:
      typeof meta.filename === 'string' && meta.filename.length > 0
        ? meta.filename
        : meta.attachment_id,
    contentType:
      typeof meta.content_type === 'string' && meta.content_type.length > 0
        ? meta.content_type
        : 'application/octet-stream',
    contentBase64,
  }
  if (typeof meta.size === 'number' && Number.isFinite(meta.size)) attachment.sizeBytes = meta.size
  if (typeof meta.content_id === 'string' && meta.content_id.length > 0) {
    attachment.contentId = meta.content_id
  }
  return attachment
}

/**
 * Downloads every attachment of a message — the webhook carries metadata
 * only. Sequential on purpose: AgentMail rate-limits per API key, and a
 * `429` here must surface (so the webhook is retried later), not fan out.
 *
 * @param message - The message whose attachments to fetch.
 * @returns Normalized attachments (empty when the message has none).
 */
const fetchAttachments = async (message: AgentMailMessage): Promise<InboundEmailAttachment[]> => {
  const out: InboundEmailAttachment[] = []
  const metas = Array.isArray(message.attachments) ? message.attachments : []
  for (const meta of metas) {
    if (
      !isRecord(meta) ||
      typeof meta.attachment_id !== 'string' ||
      meta.attachment_id.length === 0
    ) {
      continue
    }
    const { content } = await downloadAttachment(
      message.inbox_id,
      message.message_id,
      meta.attachment_id,
    )
    out.push(toInboundAttachment(meta, content.toString('base64')))
  }
  return out
}

/**
 * Parses an AgentMail `message.received` webhook payload into a normalized
 * {@link InboundEmail}, hydrating through the API whatever the webhook
 * left out:
 *
 * - **Bodies.** When BOTH `text` and `html` are absent (AgentMail drops
 *   them once the payload would exceed 1 MB), the message is fetched via
 *   `GET /v0/inboxes/{inbox_id}/messages/{message_id}`.
 * - **Attachments.** The webhook carries metadata only; each attachment's
 *   bytes are downloaded (metadata → presigned URL → bytes).
 *
 * Either needs `AGENTMAIL_API_KEY`; a message that needs neither makes no
 * network call at all. When `AGENTMAIL_INBOX_ID` is set, an event for any
 * other inbox is rejected.
 *
 * `id` is AgentMail's `message_id` VERBATIM (the Message-ID with its angle
 * brackets — the exact string every per-message endpoint takes as its path
 * parameter); `messageId` is the same value without the brackets, for
 * threading headers. Both are stable across Svix redeliveries, so dedupe
 * on `id`.
 *
 * @param _headers - HTTP headers (unused — AgentMail puts everything in the body).
 * @param body - The raw JSON body, a string, or an already-parsed object.
 * @returns The normalized inbound email.
 * @throws {Error} When the body is not JSON, is not a `message.received*`
 *   event, lacks the message ids, or is for a different inbox than
 *   `AGENTMAIL_INBOX_ID`.
 * @throws {AgentMailApiError} When hydration (message fetch / attachment
 *   download) fails — let it propagate as a 5xx so AgentMail retries.
 * @throws {Error} The tagged `config.notConfigured` error when hydration
 *   is needed and `AGENTMAIL_API_KEY` is unset.
 */
export const parseWebhookPayload = async (
  _headers: Record<string, string | string[] | undefined>,
  body: Buffer | string | Record<string, unknown>,
): Promise<InboundEmail> => {
  let parsed: unknown
  try {
    parsed = parseJsonBody(body)
  } catch (error) {
    throw new Error('AgentMail webhook body is not valid JSON.', { cause: error })
  }
  const event = asInboundEvent(parsed)
  let message = event.message

  const configuredInboxId = getConfiguredInboxId()
  if (configuredInboxId !== undefined && message.inbox_id !== configuredInboxId) {
    throw new Error(
      `AgentMail webhook is for inbox "${message.inbox_id}", not the configured AGENTMAIL_INBOX_ID — ` +
        'scope the webhook to this inbox (inbox_ids on the webhook) or unset AGENTMAIL_INBOX_ID.',
    )
  }

  if (typeof message.text !== 'string' && typeof message.html !== 'string') {
    // Payload cap (1 MB): AgentMail omitted both bodies — fetch them. The
    // ids come from the webhook (authoritative); everything else from the
    // full message.
    const full = await getMessage(message.inbox_id, message.message_id)
    message = { ...message, ...full, inbox_id: message.inbox_id, message_id: message.message_id }
  }

  const from = normalizeAddressList(message.from ?? message.from_)[0] ?? ''
  const subject = typeof message.subject === 'string' ? message.subject : ''
  const messageId = unwrapMessageId(message.message_id)

  const email: InboundEmail = {
    id: message.message_id,
    from,
    to: normalizeAddressList(message.to),
    subject,
    headers: lowercaseHeaderMap(message.headers),
    receivedAt:
      parseTimestamp(message.timestamp) ?? parseTimestamp(message.created_at) ?? new Date(),
  }

  const cc = normalizeAddressList(message.cc)
  if (cc.length > 0) email.cc = cc

  if (typeof message.text === 'string') email.textBody = message.text
  if (typeof message.html === 'string') email.htmlBody = message.html

  const attachments = await fetchAttachments(message)
  if (attachments.length > 0) email.attachments = attachments

  if (messageId) email.messageId = messageId
  const inReplyTo = unwrapMessageId(message.in_reply_to)
  if (inReplyTo) email.inReplyTo = inReplyTo
  const references = normalizeAddressList(message.references)
    .map((ref) => unwrapMessageId(ref))
    .filter((ref): ref is string => ref !== undefined)
  if (references.length > 0) email.references = references

  rememberInbox(email.id, message.inbox_id)
  return email
}

/**
 * Resolves the inbox a reply must be sent from: `AGENTMAIL_INBOX_ID` when
 * set, else the inbox recorded when this process parsed the message.
 *
 * @param email - The original inbound email.
 * @returns The inbox id.
 * @throws {Error} When neither source knows the inbox.
 */
const resolveInboxId = (email: InboundEmail): string => {
  const inboxId = getConfiguredInboxId() ?? inboxByEmailId.get(email.id)
  if (!inboxId) {
    throw new Error(
      `Cannot reply to AgentMail message ${email.id}: its inbox is unknown in this process. ` +
        'Set AGENTMAIL_INBOX_ID to the inbox_id that receives mail (required for replies sent from a later request or after a restart).',
    )
  }
  return inboxId
}

/**
 * Dispatches a reply through AgentMail's reply endpoint from the inbox
 * that received the original message. AgentMail threads the reply itself
 * (`In-Reply-To`, `References`, subject), so `reply.subject` and
 * `reply.from` have no effect — the reply always comes from the inbox,
 * under the original subject.
 *
 * @param email - The original inbound email being replied to.
 * @param reply - The reply payload.
 * @returns The reply dispatch result (`id` = the new message's Message-ID).
 * @throws {Error} When the inbox cannot be resolved (see
 *   {@link parseWebhookPayload} for the two sources).
 * @throws {AgentMailApiError} On a non-2xx API response.
 */
export const replyTo = async (
  email: InboundEmail,
  reply: InboundEmailReply,
): Promise<InboundEmailReplyResult> => {
  const inboxId = resolveInboxId(email)

  const request: AgentMailReplyRequest = {}
  if (email.from.length > 0) request.to = email.from
  if (reply.textBody !== undefined) request.text = reply.textBody
  if (reply.htmlBody !== undefined) request.html = reply.htmlBody
  if (reply.headers && Object.keys(reply.headers).length > 0) request.headers = { ...reply.headers }
  if (reply.attachments && reply.attachments.length > 0) {
    request.attachments = reply.attachments.map((a): AgentMailReplyAttachment => {
      const attachment: AgentMailReplyAttachment = {
        filename: a.name,
        content_type: a.contentType,
        content: a.contentBase64,
      }
      if (a.contentId !== undefined) {
        attachment.content_id = a.contentId
        attachment.content_disposition = 'inline'
      }
      return attachment
    })
  }

  const result = await replyToMessage(inboxId, email.id, request)
  return { id: result.message_id }
}

/**
 * Indicates that this provider supports outbound reply dispatch via
 * {@link replyTo}. Replies use AgentMail's own API — no outbound
 * `@molecule/api-emails` transport is involved.
 *
 * @returns Always `true`.
 */
export const supportsReply = (): boolean => true

/**
 * The AgentMail inbound-email provider implementing the
 * {@link InboundEmailProvider} interface.
 */
export const provider: InboundEmailProvider = {
  parseWebhookPayload,
  verifySignature,
  replyTo,
  supportsReply,
}
