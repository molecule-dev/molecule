/**
 * Facebook Messenger Platform implementation of {@link ChannelProvider}.
 *
 * Calls the Messenger Send API directly via `fetch` — the surface area is
 * small enough that a dedicated SDK would add no value. Page access tokens
 * (`EAA…`) and the app secret MUST NOT appear in error messages, log
 * lines, or normalized payloads; this module redacts both.
 *
 * Two surfaces are implemented:
 *
 * 1. **Outbound** — {@link MessengerChannelProvider.sendMessage} POSTs to
 *    `https://graph.facebook.com/v22.0/me/messages?access_token=…`. Plain
 *    text → `{ message: { text } }`. Buttons → `attachment` /
 *    `button_template` (1–3 buttons) or `quick_replies` (4+).
 *    Media → `attachment` of the matching type with a `payload.url`.
 * 2. **Inbound** — {@link MessengerChannelProvider.verifyWebhookSignature}
 *    validates `X-Hub-Signature-256: sha256=…` against the configured app
 *    secret using `crypto.createHmac('sha256', appSecret)`.
 *
 *    {@link MessengerChannelProvider.parseInbound} normalizes the
 *    `entry[].messaging[]` array — `message`, `postback`, `quick_reply`,
 *    `delivery`, and `read` events — into a {@link InboundMessage}. The
 *    original payload is preserved on `payload` for forensic / advanced
 *    use.
 *
 * @module
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  ChannelAttachment,
  ChannelFeatures,
  ChannelProvider,
  ChannelRecipient,
  InboundMessage,
  OutboundMessage,
  SendResult,
} from '@molecule/api-channel'

import type {
  MessengerConfig,
  MessengerInboundAttachment,
  MessengerMessagingEntry,
  MessengerMessagingType,
  MessengerSendApiResponse,
  MessengerWebhookPayload,
} from './types.js'

/**
 * Default Graph API base URL.
 */
const DEFAULT_API_BASE_URL = 'https://graph.facebook.com'

/**
 * Default Graph API version (`v22.0` — current stable as of May 2026).
 */
const DEFAULT_API_VERSION = 'v22.0'

/**
 * Default per-request timeout in milliseconds.
 */
const DEFAULT_TIMEOUT_MS = 10000

/**
 * Maximum number of buttons supported by `button_template`. More than
 * this and the bond falls back to `quick_replies`.
 */
const MAX_TEMPLATE_BUTTONS = 3

/**
 * Header carrying Messenger's HMAC-SHA256 webhook signature.
 */
const SIGNATURE_HEADER = 'x-hub-signature-256'

/**
 * Pattern matching Facebook page access tokens. Used solely for
 * defensive redaction in error strings — never for validation.
 */
const PAGE_ACCESS_TOKEN_PATTERN = /EAA[A-Za-z0-9]+/g

/**
 * Static capability matrix for the Messenger channel.
 *
 * - `text: true` — plain message bodies.
 * - `buttons: true` — supported via `button_template` (≤3) or
 *   `quick_replies` (≥4).
 * - `attachments: true` — supported via the `attachment` payload.
 * - `threads: false` — Messenger does not have first-class threads on the
 *   Send API; conversations are 1:1 or per-page.
 * - `signedWebhooks: true` — `X-Hub-Signature-256` is HMAC-verified.
 */
const FEATURES: ChannelFeatures = Object.freeze({
  text: true,
  buttons: true,
  attachments: true,
  threads: false,
  signedWebhooks: true,
})

/**
 * Concrete Messenger Platform implementation of {@link ChannelProvider}.
 */
export class MessengerChannelProvider implements ChannelProvider {
  /**
   * Stable channel name. Conventionally matches the bond name this
   * provider is registered under (`bond('channel', 'messenger', ...)`).
   */
  readonly name = 'messenger'

  private readonly pageAccessToken: string | undefined
  private readonly appSecret: string | undefined
  private readonly apiBaseUrl: string
  private readonly apiVersion: string
  private readonly timeoutMs: number
  private readonly defaultMessagingType: MessengerMessagingType

  /**
   * Constructs a Messenger channel provider.
   *
   * @param config - Optional configuration. Page access token and app
   *   secret fall back to `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN` and
   *   `CHANNEL_MESSENGER_APP_SECRET` environment variables when omitted.
   */
  constructor(config: MessengerConfig = {}) {
    this.pageAccessToken = config.pageAccessToken ?? process.env.CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN
    this.appSecret = config.appSecret ?? process.env.CHANNEL_MESSENGER_APP_SECRET
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '')
    this.apiVersion = config.apiVersion ?? DEFAULT_API_VERSION
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.defaultMessagingType = config.defaultMessagingType ?? 'RESPONSE'
  }

  /**
   * Sends an outbound message via the Messenger Send API.
   *
   * Plain text messages POST `{ message: { text } }`. Rich messages with
   * 1–3 buttons render as a `button_template`; 4+ buttons fall back to
   * `quick_replies` (which is the only Messenger affordance that scales
   * past three options on a single message). Media messages POST an
   * `attachment` whose `type` is inferred from the attachment's content
   * type or filename extension.
   *
   * @param to - Page-scoped user identifier (PSID) of the recipient.
   * @param message - Normalized {@link OutboundMessage}.
   * @returns A {@link SendResult} keyed by Messenger's `message_id`.
   * @throws {Error} If the page access token is unset or the Send API
   *   rejects the call. The token is never included in error messages.
   */
  async sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult> {
    if (!to) {
      throw new Error('Messenger recipient (PSID) is required.')
    }
    if (!this.pageAccessToken) {
      throw new Error('Messenger page access token is not configured.')
    }

    const body = buildRequestBody(to, message, this.defaultMessagingType)
    const result = await this.callSendApi(body)

    return {
      messageId: result.message_id ?? '',
      deliveredAt: new Date(),
    }
  }

  /**
   * Verifies the inbound webhook signature.
   *
   * Messenger signs each webhook request with HMAC-SHA256 of the raw body
   * keyed by the app secret, prefixed with `'sha256='` and delivered in
   * the `X-Hub-Signature-256` header. We compute the same digest and
   * compare in constant time.
   *
   * @param headers - Request headers (case-insensitive lookup).
   * @param body - Raw, unparsed request body.
   * @returns `true` when the signature is valid for the configured app
   *   secret. Returns `false` if the secret is unset, the header is
   *   missing, or the digests do not match.
   */
  verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean {
    if (!this.appSecret) {
      return false
    }

    const provided = lookupHeader(headers, SIGNATURE_HEADER)
    if (!provided) {
      return false
    }

    const match = /^sha256=([0-9a-fA-F]+)$/.exec(provided.trim())
    if (!match) {
      return false
    }
    const providedDigest = match[1]!.toLowerCase()

    const bodyBytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body)
    const computed = createHmac('sha256', this.appSecret).update(bodyBytes).digest('hex')

    return constantTimeHexEqual(computed, providedDigest)
  }

  /**
   * Normalizes a raw Messenger webhook payload into an
   * {@link InboundMessage}.
   *
   * Messenger delivers events as `entry[].messaging[]` — typically a
   * single messaging entry per webhook, but the spec allows batching.
   * This method walks the messaging array and returns the first event it
   * recognizes:
   *
   * - `message` (text or attachment) → text + attachments
   * - `message.quick_reply` → quick-reply payload as `text`
   * - `postback` → button payload as `text`
   * - `delivery` / `read` → bare receipt with `payload` preserved
   *
   * Anything else throws — callers MUST verify the signature before
   * reaching this method.
   *
   * @param payload - Raw Messenger webhook envelope (parsed JSON).
   * @returns Canonical {@link InboundMessage}. The original payload is
   *   preserved on `payload` for forensic / channel-specific handling.
   * @throws {Error} If the payload does not match a recognized variant.
   */
  parseInbound(payload: unknown): InboundMessage {
    if (!isPlainObject(payload)) {
      throw new Error('Messenger inbound payload is not an object.')
    }

    const envelope = payload as MessengerWebhookPayload
    const entry = envelope.entry?.[0]
    const messaging = entry?.messaging?.[0]
    if (!messaging) {
      throw new Error('Messenger inbound payload has no messaging entries.')
    }

    return inboundFromMessaging(messaging, payload)
  }

  /**
   * Returns the static capability matrix for the Messenger Send API.
   *
   * Reactions are technically supported on Messenger but the Bot Send API
   * surface is limited (bots cannot react to arbitrary messages); the
   * normalized contract has no `reactions` flag, so the capability is not
   * advertised. Threads are reported as `false` because Messenger has no
   * first-class thread concept on the Send API — conversations are
   * 1:1 / per-page.
   *
   * @returns The {@link ChannelFeatures} flags for Messenger.
   */
  listSupportedFeatures(): ChannelFeatures {
    return FEATURES
  }

  /**
   * Performs a single Send API call. Centralizes redaction so the page
   * access token never ends up in thrown error messages.
   *
   * @param body - JSON-serializable Send API request payload.
   * @returns The successful Send API response body.
   * @throws {Error} On non-2xx responses, error envelopes, or network
   *   failures. Errors quote a redacted method URL only.
   */
  private async callSendApi(body: unknown): Promise<MessengerSendApiResponse> {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/me/messages?access_token=${this.pageAccessToken}`
    const safeUrl = `${this.apiBaseUrl}/${this.apiVersion}/me/messages?access_token=<redacted>`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      const original = error instanceof Error ? error.message : String(error)
      throw new Error(`Messenger Send API request failed (${safeUrl}): ${redact(original)}`, {
        cause: error,
      })
    } finally {
      clearTimeout(timer)
    }

    let parsed: {
      error?: { message?: string; code?: number }
      message_id?: string
      recipient_id?: string
    }
    try {
      parsed = (await response.json()) as typeof parsed
    } catch (error) {
      throw new Error(
        `Messenger Send API returned non-JSON response (${safeUrl}, HTTP ${response.status}).`,
        { cause: error },
      )
    }

    if (!response.ok || parsed.error) {
      const description = parsed.error?.message ?? `HTTP ${response.status}`
      throw new Error(`Messenger Send API call failed: ${redact(description)}`)
    }

    return parsed
  }
}

/**
 * Builds the Send API request body for a normalized outbound message.
 *
 * @param to - Recipient PSID.
 * @param message - Normalized outbound message.
 * @param defaultMessagingType - Provider-level default `messaging_type`.
 * @returns A JSON-serializable Send API request body.
 */
function buildRequestBody(
  to: ChannelRecipient,
  message: OutboundMessage,
  defaultMessagingType: MessengerMessagingType,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    recipient: { id: to },
    messaging_type: defaultMessagingType,
    message: buildMessagePart(message),
  }
  return body
}

/**
 * Builds the `message` field of a Send API request from an
 * {@link OutboundMessage}.
 *
 * @param message - Normalized outbound message.
 * @returns The Send API `message` object.
 */
function buildMessagePart(message: OutboundMessage): Record<string, unknown> {
  const buttons = message.buttons ?? []
  const attachments = message.attachments ?? []

  // Media path: first attachment becomes an `attachment` payload.
  if (message.kind === 'media' && attachments.length > 0) {
    const first = attachments[0]!
    const part: Record<string, unknown> = {
      attachment: {
        type: pickAttachmentType(first),
        payload: first.url ? { url: first.url, is_reusable: false } : {},
      },
    }
    return part
  }

  // Rich path with buttons.
  if (message.kind === 'rich' && buttons.length > 0) {
    if (buttons.length <= MAX_TEMPLATE_BUTTONS) {
      return {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: message.text ?? '',
            buttons: buttons.map((btn) => ({
              type: 'postback',
              title: btn.label,
              payload: btn.value,
            })),
          },
        },
      }
    }
    // Too many buttons for a button_template — fall back to quick replies.
    const part: Record<string, unknown> = {
      quick_replies: buttons.map((btn) => ({
        content_type: 'text',
        title: btn.label,
        payload: btn.value,
      })),
    }
    if (message.text !== undefined) {
      part.text = message.text
    }
    return part
  }

  // Text path (default).
  const part: Record<string, unknown> = {}
  if (message.text !== undefined) {
    part.text = message.text
  }
  return part
}

/**
 * Picks the Messenger attachment `type` for a normalized attachment.
 *
 * @param attachment - Normalized channel attachment.
 * @returns The Messenger attachment type (`'image'`, `'video'`,
 *   `'audio'`, or `'file'`).
 */
function pickAttachmentType(attachment: ChannelAttachment): 'image' | 'video' | 'audio' | 'file' {
  const ct = attachment.contentType?.toLowerCase() ?? ''
  if (ct.startsWith('image/')) return 'image'
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('audio/')) return 'audio'

  const filename = attachment.filename?.toLowerCase() ?? ''
  if (/\.(?:png|jpg|jpeg|gif|webp|bmp)$/.test(filename)) return 'image'
  if (/\.(?:mp4|mov|webm|avi|mkv)$/.test(filename)) return 'video'
  if (/\.(?:mp3|wav|ogg|m4a|aac|flac)$/.test(filename)) return 'audio'

  return 'file'
}

/**
 * Normalizes a single Messenger `messaging` entry into an
 * {@link InboundMessage}.
 *
 * @param messaging - The messaging entry.
 * @param fullPayload - Original webhook envelope, preserved on `payload`.
 * @returns Canonical inbound message.
 * @throws {Error} If the messaging entry has no recognized event type.
 */
function inboundFromMessaging(
  messaging: MessengerMessagingEntry,
  fullPayload: unknown,
): InboundMessage {
  const from = messaging.sender?.id ?? ''
  const receivedAt = messaging.timestamp ? new Date(messaging.timestamp) : new Date()

  const result: InboundMessage = {
    from,
    channel: 'messenger',
    payload: fullPayload,
    receivedAt,
  }

  if (messaging.message) {
    const msg = messaging.message
    if (msg.quick_reply?.payload !== undefined) {
      result.text = msg.quick_reply.payload
    } else if (msg.text !== undefined) {
      result.text = msg.text
    }

    const attachments = normalizeInboundAttachments(msg.attachments)
    if (attachments.length > 0) {
      result.attachments = attachments
    }
    return result
  }

  if (messaging.postback) {
    if (messaging.postback.payload !== undefined) {
      result.text = messaging.postback.payload
    } else if (messaging.postback.title !== undefined) {
      result.text = messaging.postback.title
    }
    return result
  }

  if (messaging.delivery || messaging.read) {
    // Bare receipt — no normalized text. Caller can inspect `payload`.
    return result
  }

  throw new Error('Messenger inbound payload did not match a supported messaging variant.')
}

/**
 * Normalizes Messenger inbound attachments into {@link ChannelAttachment}.
 *
 * @param attachments - Raw attachments array from a Messenger message.
 * @returns Normalized attachments. Empty array when input is absent.
 */
function normalizeInboundAttachments(
  attachments: MessengerInboundAttachment[] | undefined,
): ChannelAttachment[] {
  if (!attachments?.length) return []
  const out: ChannelAttachment[] = []
  for (const att of attachments) {
    const url = att.payload?.url
    const norm: ChannelAttachment = {}
    if (url) norm.url = url
    const ct = inferContentTypeFromAttachmentType(att.type)
    if (ct) norm.contentType = ct
    out.push(norm)
  }
  return out
}

/**
 * Maps a Messenger attachment `type` value to a coarse IETF media type
 * group (e.g. `'image'` → `'image/*'`).
 *
 * @param type - Messenger attachment kind.
 * @returns A coarse content-type string, or `undefined` if unknown.
 */
function inferContentTypeFromAttachmentType(type: string | undefined): string | undefined {
  switch (type) {
    case 'image':
      return 'image/*'
    case 'video':
      return 'video/*'
    case 'audio':
      return 'audio/*'
    case 'file':
      return 'application/octet-stream'
    default:
      return undefined
  }
}

/**
 * Case-insensitive header lookup.
 *
 * @param headers - Request header map.
 * @param name - Lowercase header name.
 * @returns The header value, or `undefined` if missing.
 */
function lookupHeader(headers: Record<string, string>, name: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(headers, name)) {
    return headers[name]
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) {
      return headers[key]
    }
  }
  return undefined
}

/**
 * Constant-time hex-string comparison. Falls back to a length-mismatch
 * fast path so leaking digest length is not a concern (digests are
 * fixed-width per algorithm).
 *
 * @param a - First hex string.
 * @param b - Second hex string.
 * @returns `true` when both strings represent the same bytes.
 */
function constantTimeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aBytes = Buffer.from(a, 'utf8')
  const bBytes = Buffer.from(b, 'utf8')
  return timingSafeEqual(aBytes, bBytes)
}

/**
 * Strips Facebook page access tokens (`EAA…`) from a string so leaked
 * tokens cannot be re-emitted via this provider's error chain.
 *
 * @param message - Original error message.
 * @returns A token-redacted copy of the message.
 */
function redact(message: string): string {
  return message.replace(PAGE_ACCESS_TOKEN_PATTERN, '<redacted>')
}

/**
 * Type guard for plain JSON objects. Rejects arrays and `null` so
 * downstream casts to {@link MessengerWebhookPayload} are safe.
 *
 * @param value - Candidate value.
 * @returns `true` when `value` is a non-array, non-null object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Convenience factory for the named-multi-provider bond pattern.
 *
 * @param config - Optional Messenger config.
 * @returns A new {@link MessengerChannelProvider} instance.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-messenger'
 *
 * setProvider('messenger', createProvider())
 * ```
 */
export function createProvider(config?: MessengerConfig): MessengerChannelProvider {
  return new MessengerChannelProvider(config)
}

let _provider: MessengerChannelProvider | null = null

/**
 * Lazily-instantiated singleton instance for app-startup wiring. Reads
 * configuration from environment variables on first use.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-messenger'
 *
 * setProvider('messenger', provider)
 * ```
 */
export const provider: ChannelProvider = new Proxy({} as ChannelProvider, {
  get(_target, prop, receiver) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_target, prop, value) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.set(_provider, prop, value)
  },
})
