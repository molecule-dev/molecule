/**
 * WhatsApp implementation of {@link ChannelProvider}.
 *
 * Calls the WhatsApp Cloud API directly via `fetch` — the surface area
 * is small enough that a dedicated SDK would add no value. Access
 * tokens MUST NOT appear in error messages, log lines, or normalized
 * payloads; this module redacts any `EAA…` token before re-throwing.
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
  ChannelButton,
  ChannelFeatures,
  ChannelProvider,
  ChannelRecipient,
  InboundMessage,
  OutboundMessage,
  SendResult,
} from '@molecule/api-channel'

import type {
  WhatsAppConfig,
  WhatsAppInboundMessage,
  WhatsAppOutboundExtensions,
  WhatsAppSendResponse,
  WhatsAppTemplateRef,
  WhatsAppWebhookPayload,
} from './types.js'

const DEFAULT_API_BASE_URL = 'https://graph.facebook.com'
const DEFAULT_API_VERSION = 'v22.0'
const DEFAULT_TIMEOUT_MS = 10000
const SIGNATURE_HEADER = 'x-hub-signature-256'
const SIGNATURE_PREFIX = 'sha256='

/**
 * Strips long-lived (`EAA…`) WhatsApp / Meta access tokens from a
 * string so leaked tokens cannot be re-emitted by this provider.
 *
 * @param input - Arbitrary string (typically an error message).
 * @returns A copy of `input` with any `EAA…` tokens replaced by
 *   `[redacted]`.
 */
function redactToken(input: string): string {
  return input.replace(/EAA[A-Za-z0-9]+/g, '[redacted]')
}

/**
 * Static capability matrix for the WhatsApp Cloud API.
 *
 * @returns The {@link ChannelFeatures} flags advertised by the
 *   provider.
 */
function whatsappFeatures(): ChannelFeatures {
  return {
    text: true,
    buttons: true,
    attachments: true,
    threads: false,
    signedWebhooks: true,
  }
}

/**
 * Lower-cases every header key so callers don't have to worry about
 * casing differences across HTTP frameworks.
 *
 * @param headers - Raw request headers.
 * @returns Headers map with lowercased keys.
 */
function normaliseHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value
  }
  return out
}

/**
 * Coerces a raw body of either string or `Uint8Array` shape into the
 * raw bytes WhatsApp signs against.
 *
 * @param body - Raw request body.
 * @returns The byte buffer representation of the body.
 */
function bodyToBuffer(body: string | Uint8Array): Buffer {
  if (typeof body === 'string') return Buffer.from(body, 'utf8')
  return Buffer.from(body)
}

/**
 * Constant-time hex string comparison. Returns `false` immediately on
 * length mismatch (lengths are not secret).
 *
 * @param a - First hex string.
 * @param b - Second hex string.
 * @returns `true` when both values are byte-identical.
 */
function safeHexEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Type guard for plain JSON objects. Rejects arrays and `null` so
 * downstream casts to {@link WhatsAppWebhookPayload} are safe.
 *
 * @param value - Candidate value.
 * @returns `true` when `value` is a non-array, non-null object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Builds the Cloud API request body for a free-form text message.
 *
 * @param to - Recipient WhatsApp id (E.164 phone number).
 * @param text - Plain-text body.
 * @returns A JSON-serializable Cloud API request body.
 */
function buildTextBody(to: ChannelRecipient, text: string): Record<string, unknown> {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  }
}

/**
 * Builds the Cloud API request body for an interactive
 * button-message (in-window only).
 *
 * @param to - Recipient WhatsApp id.
 * @param text - Body text rendered above the buttons.
 * @param buttons - Up to three normalized {@link ChannelButton}s.
 *   Buttons beyond the third are dropped per Cloud API limits.
 * @returns A JSON-serializable Cloud API request body.
 */
function buildInteractiveBody(
  to: ChannelRecipient,
  text: string | undefined,
  buttons: ChannelButton[],
): Record<string, unknown> {
  const trimmed = buttons.slice(0, 3)
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(text ? { body: { text } } : {}),
      action: {
        buttons: trimmed.map(({ label, value }) => ({
          type: 'reply',
          reply: { id: value, title: label },
        })),
      },
    },
  }
}

/**
 * Builds the Cloud API request body for a pre-approved template
 * message (the only message form allowed outside the 24h customer
 * window).
 *
 * @param to - Recipient WhatsApp id.
 * @param template - Template descriptor.
 * @returns A JSON-serializable Cloud API request body.
 */
function buildTemplateBody(
  to: ChannelRecipient,
  template: WhatsAppTemplateRef,
): Record<string, unknown> {
  const components = template.bodyParameters?.length
    ? [
        {
          type: 'body',
          parameters: template.bodyParameters.map((value) => ({ type: 'text', text: value })),
        },
      ]
    : []
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length > 0 ? { components } : {}),
    },
  }
}

/**
 * Builds the Cloud API request body for a media message.
 *
 * @param to - Recipient WhatsApp id.
 * @param attachment - First normalized attachment from the outbound
 *   message.
 * @returns A JSON-serializable Cloud API request body, or `null` when
 *   the attachment cannot be represented (no URL).
 */
function buildMediaBody(
  to: ChannelRecipient,
  attachment: ChannelAttachment,
): Record<string, unknown> | null {
  const url = attachment.url
  if (!url) return null

  const type = pickMediaType(attachment)
  const inner: Record<string, unknown> = { link: url }
  if (attachment.caption !== undefined && type !== 'audio' && type !== 'sticker') {
    inner.caption = attachment.caption
  }
  if (type === 'document' && attachment.filename) {
    inner.filename = attachment.filename
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type,
    [type]: inner,
  }
}

/**
 * Picks the Cloud API media type discriminator for an attachment.
 *
 * @param attachment - Normalized attachment.
 * @returns One of `'image'`, `'audio'`, `'video'`, `'sticker'`,
 *   `'document'`.
 */
function pickMediaType(
  attachment: ChannelAttachment,
): 'image' | 'audio' | 'video' | 'sticker' | 'document' {
  const ct = attachment.contentType ?? ''
  if (ct.startsWith('image/')) {
    return ct === 'image/webp' ? 'sticker' : 'image'
  }
  if (ct.startsWith('audio/')) return 'audio'
  if (ct.startsWith('video/')) return 'video'
  if (attachment.filename) {
    if (/\.(?:png|jpe?g|gif)$/i.test(attachment.filename)) return 'image'
    if (/\.webp$/i.test(attachment.filename)) return 'sticker'
    if (/\.(?:mp3|ogg|amr|aac|m4a)$/i.test(attachment.filename)) return 'audio'
    if (/\.(?:mp4|3gp|mov)$/i.test(attachment.filename)) return 'video'
  }
  return 'document'
}

/**
 * Normalizes a single inbound `messages[]` entry into the canonical
 * {@link InboundMessage} shape.
 *
 * @param msg - Raw inbound message envelope.
 * @param fullPayload - Original webhook body, preserved on `payload`.
 * @returns A normalized {@link InboundMessage}.
 */
function inboundFromMessage(
  msg: WhatsAppInboundMessage,
  fullPayload: WhatsAppWebhookPayload,
): InboundMessage {
  const receivedAt = msg.timestamp
    ? new Date(Number.parseInt(msg.timestamp, 10) * 1000)
    : new Date()
  const result: InboundMessage = {
    from: msg.from,
    channel: 'whatsapp',
    payload: fullPayload,
    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
  }

  switch (msg.type) {
    case 'text': {
      if (msg.text?.body !== undefined) result.text = msg.text.body
      break
    }
    case 'button': {
      const text = msg.button?.payload ?? msg.button?.text
      if (text !== undefined) result.text = text
      break
    }
    case 'interactive': {
      const reply = msg.interactive
      const id =
        reply?.button_reply?.id ??
        reply?.list_reply?.id ??
        reply?.button_reply?.title ??
        reply?.list_reply?.title
      if (id !== undefined) result.text = id
      break
    }
    case 'location': {
      const loc = msg.location
      if (loc) {
        const parts = [`${loc.latitude},${loc.longitude}`]
        if (loc.name) parts.push(loc.name)
        if (loc.address) parts.push(loc.address)
        result.text = parts.join(' ')
      }
      break
    }
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker': {
      const media = msg[msg.type]
      if (media) {
        const att: ChannelAttachment = {}
        if (media.filename) att.filename = media.filename
        if (media.mime_type) att.contentType = media.mime_type
        if (media.caption) att.caption = media.caption
        result.attachments = [att]
        if (media.caption !== undefined) result.text = media.caption
      }
      break
    }
    default: {
      // Unknown / unsupported variant — leave text/attachments unset.
      // The original payload is preserved on result.payload so the app
      // can choose how to react.
      break
    }
  }

  return result
}

/**
 * WhatsApp channel provider — implements the framework-agnostic
 * {@link ChannelProvider} contract on top of the WhatsApp Cloud API.
 */
export class WhatsAppChannelProvider implements ChannelProvider {
  /**
   * Stable channel name. Conventionally matches the bond name this
   * provider is registered under (`bond('channel', 'whatsapp', ...)`).
   */
  readonly name = 'whatsapp'

  private readonly accessToken: string | undefined
  private readonly phoneNumberId: string | undefined
  private readonly appSecret: string | undefined
  private readonly apiBaseUrl: string
  private readonly apiVersion: string
  private readonly timeoutMs: number

  /**
   * Constructs a WhatsApp channel provider.
   *
   * @param config - Optional configuration. Access token, phone-number
   *   id, and app secret fall back to `CHANNEL_WHATSAPP_ACCESS_TOKEN`,
   *   `CHANNEL_WHATSAPP_PHONE_NUMBER_ID`, and
   *   `CHANNEL_WHATSAPP_APP_SECRET` environment variables when
   *   omitted.
   */
  constructor(config: WhatsAppConfig = {}) {
    this.accessToken = config.accessToken ?? process.env.CHANNEL_WHATSAPP_ACCESS_TOKEN
    this.phoneNumberId = config.phoneNumberId ?? process.env.CHANNEL_WHATSAPP_PHONE_NUMBER_ID
    this.appSecret = config.appSecret ?? process.env.CHANNEL_WHATSAPP_APP_SECRET
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '')
    this.apiVersion = config.apiVersion ?? DEFAULT_API_VERSION
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  /**
   * Sends an outbound message via the Cloud API.
   *
   * Routes to a text, interactive, template, or media message based on
   * the normalized payload:
   * - `kind === 'rich'` with `payload.template` → template message
   * - `kind === 'rich'` with `buttons` → interactive button message
   *   (in-window only)
   * - `kind === 'media'` with at least one `url` attachment → media
   *   message
   * - Otherwise → plain text
   *
   * @param to - WhatsApp recipient id (E.164 phone number).
   * @param message - Normalized {@link OutboundMessage}.
   * @returns A {@link SendResult} keyed by the WhatsApp `wamid`.
   * @throws {Error} If the access token / phone-number id is unset or
   *   the Cloud API rejects the call. The access token is never
   *   included in error messages.
   */
  async sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult> {
    if (!this.accessToken) {
      throw new Error('WhatsApp access token is not configured.')
    }
    if (!this.phoneNumberId) {
      throw new Error('WhatsApp phone-number id is not configured.')
    }

    const extensions = (message as OutboundMessage & { payload?: WhatsAppOutboundExtensions })
      .payload
    const body = this.pickRequestBody(to, message, extensions)

    const result = await this.callCloudApi<WhatsAppSendResponse>(body)
    const id = result.messages?.[0]?.id
    if (!id) {
      throw new Error('WhatsApp Cloud API response did not include a message id.')
    }

    return {
      messageId: id,
      deliveredAt: new Date(),
    }
  }

  /**
   * Verifies the inbound webhook signature.
   *
   * WhatsApp signs the raw request body with HMAC-SHA256 keyed on the
   * Meta App secret and delivers the digest in the
   * `X-Hub-Signature-256: sha256=<hex>` header. We recompute and
   * compare in constant time.
   *
   * @param headers - Request headers (case-insensitive lookup).
   * @param body - Raw request body bytes.
   * @returns `true` when the signature matches the configured secret.
   */
  verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean {
    if (!this.appSecret) return false

    const lower = normaliseHeaders(headers)
    const provided = lower[SIGNATURE_HEADER]
    if (!provided || !provided.startsWith(SIGNATURE_PREFIX)) return false

    const givenHex = provided.slice(SIGNATURE_PREFIX.length)
    const expectedHex = createHmac('sha256', this.appSecret)
      .update(bodyToBuffer(body))
      .digest('hex')

    return safeHexEqual(givenHex, expectedHex)
  }

  /**
   * Normalizes a raw WhatsApp Cloud API webhook body into an
   * {@link InboundMessage}.
   *
   * Handles `entry[].changes[].value.messages[]` events — the
   * `messages` change. Status / template-status events return a
   * payload-only inbound (no text, no attachments).
   *
   * @param payload - Raw webhook body (parsed JSON).
   * @returns Canonical {@link InboundMessage}. The original payload is
   *   preserved on `payload` for forensic / channel-specific handling.
   * @throws {Error} If the payload is not a valid Cloud API webhook
   *   body.
   */
  parseInbound(payload: unknown): InboundMessage {
    if (!isPlainObject(payload)) {
      throw new Error('WhatsApp inbound payload is not an object.')
    }

    const wrapper = payload as WhatsAppWebhookPayload
    const change = wrapper.entry?.[0]?.changes?.[0]
    const value = change?.value

    if (!value) {
      throw new Error('WhatsApp inbound payload did not match a supported webhook variant.')
    }

    const message = value.messages?.[0]
    if (message) {
      return inboundFromMessage(message, wrapper)
    }

    // Status / template-status updates are still well-formed Cloud API
    // events; surface them as a sender-less inbound so consumers can
    // route on `payload` rather than throwing.
    return {
      from: value.metadata?.display_phone_number ?? '',
      channel: 'whatsapp',
      payload: wrapper,
      receivedAt: new Date(),
    }
  }

  /**
   * Returns the static capability matrix for WhatsApp Cloud.
   *
   * WhatsApp supports plain text, interactive buttons (in 24h window),
   * pre-approved templates (anytime), media attachments, and
   * reactions. Threading is not supported (only reply-to via
   * `context.message_id`). Inbound webhooks are HMAC-SHA256 signed.
   *
   * @returns The {@link ChannelFeatures} flags for WhatsApp.
   */
  listSupportedFeatures(): ChannelFeatures {
    return whatsappFeatures()
  }

  /**
   * Picks the Cloud API request body for a normalized outbound
   * message.
   *
   * @param to - Recipient WhatsApp id.
   * @param message - Normalized outbound message.
   * @param extensions - Optional WhatsApp-specific extensions read
   *   from `OutboundMessage.payload`.
   * @returns A JSON-serializable Cloud API request body.
   */
  private pickRequestBody(
    to: ChannelRecipient,
    message: OutboundMessage,
    extensions: WhatsAppOutboundExtensions | undefined,
  ): Record<string, unknown> {
    if (extensions?.template) {
      return buildTemplateBody(to, extensions.template)
    }

    if (message.kind === 'rich' && message.buttons && message.buttons.length > 0) {
      return buildInteractiveBody(to, message.text, message.buttons)
    }

    if (message.kind === 'media' && message.attachments && message.attachments.length > 0) {
      const first = message.attachments[0]
      if (first) {
        const media = buildMediaBody(to, {
          ...first,
          ...(message.text !== undefined && first.caption === undefined
            ? { caption: message.text }
            : {}),
        })
        if (media) return media
      }
    }

    return buildTextBody(to, message.text ?? '')
  }

  /**
   * Performs a single Cloud API call. Centralizes redaction so the
   * access token never ends up in thrown error messages.
   *
   * @param body - JSON-serializable request payload.
   * @returns The parsed Cloud API response body on `{ messages: ... }`
   *   success.
   * @throws {Error} On non-2xx responses, error envelopes, or network
   *   failures. Errors quote the redacted endpoint URL only.
   */
  private async callCloudApi<T>(body: unknown): Promise<T> {
    const url = `${this.apiBaseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`WhatsApp Cloud API request failed (${url}): ${redactToken(message)}`, {
        cause: error,
      })
    } finally {
      clearTimeout(timer)
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new Error(
        `WhatsApp Cloud API returned non-JSON response (${url}, HTTP ${response.status}).`,
        { cause: error },
      )
    }

    if (!response.ok) {
      const errorBody = (parsed as WhatsAppSendResponse | undefined)?.error
      const description = errorBody?.message ?? `HTTP ${response.status}`
      throw new Error(`WhatsApp Cloud API call failed: ${redactToken(description)}`)
    }

    return parsed as T
  }
}

/**
 * Convenience factory for the named-multi-provider bond pattern.
 *
 * @param config - Optional WhatsApp config.
 * @returns A new {@link WhatsAppChannelProvider} instance.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-whatsapp'
 *
 * setProvider('whatsapp', createProvider())
 * ```
 */
export function createProvider(config?: WhatsAppConfig): WhatsAppChannelProvider {
  return new WhatsAppChannelProvider(config)
}

let _provider: WhatsAppChannelProvider | null = null

/**
 * Lazily-instantiated singleton instance for app-startup wiring. Reads
 * configuration from environment variables on first use.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-whatsapp'
 *
 * setProvider('whatsapp', provider)
 * ```
 */
export const provider: ChannelProvider = new Proxy({} as ChannelProvider, {
  get(_target, prop, receiver) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
