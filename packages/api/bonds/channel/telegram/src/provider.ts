/**
 * Telegram implementation of {@link ChannelProvider}.
 *
 * Calls the Telegram Bot API directly via `fetch` — the surface area is
 * small enough that a dedicated SDK would add no value. Bot tokens MUST
 * NOT appear in error messages, log lines, or normalized payloads; this
 * module never echoes them back.
 *
 * @module
 */

import { timingSafeEqual } from 'node:crypto'

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

import type { TelegramConfig, TelegramMessage, TelegramParseMode, TelegramUpdate } from './types.js'

const DEFAULT_API_BASE_URL = 'https://api.telegram.org'
const DEFAULT_TIMEOUT_MS = 10000
const SECRET_TOKEN_HEADER = 'x-telegram-bot-api-secret-token'

/**
 * Telegram channel provider — implements the framework-agnostic
 * {@link ChannelProvider} contract on top of the Bot API.
 */
export class TelegramChannelProvider implements ChannelProvider {
  /**
   * Stable channel name. Conventionally matches the bond name this
   * provider is registered under (`bond('channel', 'telegram', ...)`).
   */
  readonly name = 'telegram'

  private readonly botToken: string | undefined
  private readonly webhookSecret: string | undefined
  private readonly defaultParseMode: TelegramParseMode
  private readonly apiBaseUrl: string
  private readonly timeoutMs: number

  /**
   * Constructs a Telegram channel provider.
   *
   * @param config - Optional configuration. Bot token and webhook secret
   *   fall back to `CHANNEL_TELEGRAM_BOT_TOKEN` and
   *   `CHANNEL_TELEGRAM_WEBHOOK_SECRET` environment variables when
   *   omitted.
   */
  constructor(config: TelegramConfig = {}) {
    this.botToken = config.botToken ?? process.env.CHANNEL_TELEGRAM_BOT_TOKEN
    this.webhookSecret = config.webhookSecret ?? process.env.CHANNEL_TELEGRAM_WEBHOOK_SECRET
    this.defaultParseMode = config.defaultParseMode ?? 'HTML'
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  /**
   * Sends an outbound message via the Bot API.
   *
   * Routes to `sendMessage`, `sendPhoto`, or `sendDocument` based on the
   * normalized payload. When buttons are present an `inline_keyboard`
   * `reply_markup` is attached. Forum-topic threading is honored via
   * `message_thread_id`.
   *
   * @param to - Telegram chat id (numeric `chat.id`, or `@username` for
   *   public chats), passed straight through to the Bot API.
   * @param message - Normalized {@link OutboundMessage}.
   * @returns A {@link SendResult} keyed by Telegram's `message_id`.
   * @throws {Error} If the bot token is unset or the Bot API rejects
   *   the call. The bot token is never included in error messages.
   */
  async sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult> {
    if (!this.botToken) {
      throw new Error('Telegram bot token is not configured.')
    }

    const method = pickBotMethod(message)
    const body = buildRequestBody(to, message, this.defaultParseMode, method)

    const result = await this.callBotApi<TelegramMessage>(method, body)
    const deliveredAt = result.date ? new Date(result.date * 1000) : new Date()

    return {
      messageId: String(result.message_id),
      deliveredAt,
    }
  }

  /**
   * Verifies the inbound webhook signature.
   *
   * Telegram does not HMAC-sign webhooks; instead, when registering the
   * webhook with `setWebhook?secret_token=...`, every incoming request
   * carries an `X-Telegram-Bot-Api-Secret-Token` header equal to that
   * value. We compare it constant-time against the configured secret.
   *
   * @param headers - Request headers (case-insensitive lookup).
   * @param _body - Raw request body. Unused — included for interface
   *   parity with HMAC-signed providers.
   * @returns `true` when the configured secret matches the header value.
   */
  verifyWebhookSignature(headers: Record<string, string>, _body: string | Uint8Array): boolean {
    if (!this.webhookSecret) {
      return false
    }

    const provided = lookupHeader(headers, SECRET_TOKEN_HEADER)
    if (!provided) {
      return false
    }

    return constantTimeEqual(provided, this.webhookSecret)
  }

  /**
   * Normalizes a raw Telegram `Update` into an {@link InboundMessage}.
   *
   * Handles `message`, `edited_message`, `channel_post`,
   * `edited_channel_post`, `callback_query`, and `inline_query`.
   * Anything not recognized throws — callers MUST verify the signature
   * before reaching this method.
   *
   * @param payload - Raw Telegram `Update` object (as parsed JSON).
   * @returns Canonical {@link InboundMessage}. The original update is
   *   preserved on `payload` for forensic / channel-specific handling.
   * @throws {Error} If the payload does not match a recognized Telegram
   *   update variant.
   */
  parseInbound(payload: unknown): InboundMessage {
    if (!isPlainObject(payload)) {
      throw new Error('Telegram inbound payload is not an object.')
    }

    const update = payload as unknown as TelegramUpdate

    const msg =
      update.message ?? update.edited_message ?? update.channel_post ?? update.edited_channel_post

    if (msg) {
      return inboundFromMessage(msg, update)
    }

    if (update.callback_query) {
      const cb = update.callback_query
      const inner = cb.message
      const receivedAt = new Date()
      const result: InboundMessage = {
        from: String(cb.from.id),
        channel: 'telegram',
        text: cb.data,
        payload: update,
        receivedAt,
      }
      if (inner?.message_thread_id !== undefined) {
        result.thread_id = String(inner.message_thread_id)
      }
      return result
    }

    if (update.inline_query) {
      const iq = update.inline_query
      return {
        from: String(iq.from.id),
        channel: 'telegram',
        text: iq.query,
        payload: update,
        receivedAt: new Date(),
      }
    }

    throw new Error('Telegram inbound payload did not match a supported update variant.')
  }

  /**
   * Returns the static capability matrix for the Telegram Bot API.
   *
   * Telegram supports rich text (HTML / MarkdownV2), inline-keyboard
   * buttons, photo and document attachments, and forum-topic threading
   * via `message_thread_id`. Reactions are user-only on the Bot API
   * (bots can't post reactions to arbitrary messages) and webhook
   * authenticity is via the secret-token header rather than a
   * cryptographic signature, so `signedWebhooks` is conservatively
   * `false`.
   *
   * @returns The {@link ChannelFeatures} flags for Telegram.
   */
  listSupportedFeatures(): ChannelFeatures {
    return {
      text: true,
      buttons: true,
      attachments: true,
      threads: true,
      signedWebhooks: false,
    }
  }

  /**
   * Performs a single Bot API method call. Centralizes redaction so the
   * bot token never ends up in thrown error messages.
   *
   * @param method - Bot API method name (e.g. `'sendMessage'`).
   * @param body - JSON-serializable request payload.
   * @returns The `result` field of a `{ ok: true }` Bot API envelope.
   * @throws {Error} On non-2xx responses, `{ ok: false }` envelopes, or
   *   network failures. Errors quote the redacted method URL only.
   */
  private async callBotApi<T>(method: string, body: unknown): Promise<T> {
    const url = `${this.apiBaseUrl}/bot${this.botToken}/${method}`
    const safeUrl = `${this.apiBaseUrl}/bot<redacted>/${method}`

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
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Telegram Bot API request failed (${safeUrl}): ${message}`, { cause: error })
    } finally {
      clearTimeout(timer)
    }

    let parsed: { ok: boolean; result?: T; description?: string }
    try {
      parsed = (await response.json()) as { ok: boolean; result?: T; description?: string }
    } catch (error) {
      throw new Error(
        `Telegram Bot API returned non-JSON response (${safeUrl}, HTTP ${response.status}).`,
        { cause: error },
      )
    }

    if (!response.ok || !parsed.ok || parsed.result === undefined) {
      const description = parsed.description ?? `HTTP ${response.status}`
      throw new Error(`Telegram Bot API call ${method} failed: ${description}`)
    }

    return parsed.result
  }
}

/**
 * Picks the Bot API method for a normalized outbound message.
 *
 * - First photo attachment → `sendPhoto`
 * - First non-photo attachment → `sendDocument`
 * - Otherwise → `sendMessage`
 *
 * @param message - Normalized outbound message.
 * @returns The Bot API method name.
 */
function pickBotMethod(message: OutboundMessage): 'sendMessage' | 'sendPhoto' | 'sendDocument' {
  if (message.kind === 'media' && message.attachments && message.attachments.length > 0) {
    const first = message.attachments[0]
    if (first && isImageAttachment(first)) {
      return 'sendPhoto'
    }
    return 'sendDocument'
  }
  return 'sendMessage'
}

/**
 * Constructs the Bot API request body for a chosen method.
 *
 * @param to - Recipient chat id.
 * @param message - Normalized outbound message.
 * @param defaultParseMode - Provider-level default parse mode.
 * @param method - Bot API method that will receive this body.
 * @returns A JSON-serializable request body.
 */
function buildRequestBody(
  to: ChannelRecipient,
  message: OutboundMessage,
  defaultParseMode: TelegramParseMode,
  method: 'sendMessage' | 'sendPhoto' | 'sendDocument',
): Record<string, unknown> {
  const body: Record<string, unknown> = { chat_id: to }

  if (message.thread_id) {
    const parsed = Number(message.thread_id)
    body.message_thread_id = Number.isFinite(parsed) ? parsed : message.thread_id
  }

  if (message.text) {
    body.parse_mode = defaultParseMode
  }

  if (method === 'sendMessage') {
    if (message.text !== undefined) {
      body.text = message.text
    }
  } else {
    const attachment = message.attachments?.[0]
    if (attachment) {
      const fileUrl = attachment.url
      if (fileUrl) {
        body[method === 'sendPhoto' ? 'photo' : 'document'] = fileUrl
      }
      const caption = message.text ?? attachment.caption
      if (caption !== undefined) {
        body.caption = caption
      }
    }
  }

  if (message.buttons && message.buttons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [
        message.buttons.map(({ label, value }) => ({ text: label, callback_data: value })),
      ],
    }
  }

  return body
}

/**
 * Best-effort detection of whether an attachment should be sent via
 * `sendPhoto` rather than `sendDocument`.
 *
 * @param attachment - Attachment to inspect.
 * @returns `true` when the attachment is image-typed.
 */
function isImageAttachment(attachment: ChannelAttachment): boolean {
  if (attachment.contentType && attachment.contentType.startsWith('image/')) {
    return true
  }
  if (attachment.filename && /\.(?:png|jpg|jpeg|gif|webp)$/i.test(attachment.filename)) {
    return true
  }
  return false
}

/**
 * Normalizes a Telegram `Message` (or its edited / channel variants)
 * into an {@link InboundMessage}.
 *
 * @param msg - The Telegram message object.
 * @param fullUpdate - Original update wrapper, preserved on `payload`.
 * @returns Normalized inbound message.
 */
function inboundFromMessage(msg: TelegramMessage, fullUpdate: TelegramUpdate): InboundMessage {
  const result: InboundMessage = {
    from: String(msg.from?.id ?? msg.chat.id),
    channel: 'telegram',
    payload: fullUpdate,
    receivedAt: msg.date ? new Date(msg.date * 1000) : new Date(),
  }

  const text = msg.text ?? msg.caption
  if (text !== undefined) {
    result.text = text
  }

  const attachments: ChannelAttachment[] = []
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1]
    if (largest) {
      attachments.push({
        filename: largest.file_unique_id ?? largest.file_id,
        contentType: 'image/jpeg',
        ...(msg.caption ? { caption: msg.caption } : {}),
      })
    }
  }
  if (msg.document) {
    const att: ChannelAttachment = {}
    if (msg.document.file_name) att.filename = msg.document.file_name
    if (msg.document.mime_type) att.contentType = msg.document.mime_type
    if (msg.caption) att.caption = msg.caption
    attachments.push(att)
  }
  if (attachments.length > 0) {
    result.attachments = attachments
  }

  if (msg.message_thread_id !== undefined) {
    result.thread_id = String(msg.message_thread_id)
  }

  return result
}

/**
 * Case-insensitive header lookup that does not allocate a new headers
 * object.
 *
 * @param headers - Request header map.
 * @param name - Lowercase header name to find.
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
 * Constant-time string comparison for short secrets. Falls back to a
 * length-mismatch fast path so leaking length is not a concern (the
 * webhook secret is operator-chosen).
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` when both values are byte-identical.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a, 'utf8')
  const bBytes = Buffer.from(b, 'utf8')
  if (aBytes.length !== bBytes.length) {
    return false
  }
  return timingSafeEqual(aBytes, bBytes)
}

/**
 * Type guard for plain JSON objects. Rejects arrays and `null` so
 * downstream casts to {@link TelegramUpdate} are safe.
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
 * @param config - Optional Telegram config.
 * @returns A new {@link TelegramChannelProvider} instance.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-telegram'
 *
 * setProvider('telegram', createProvider())
 * ```
 */
export function createProvider(config?: TelegramConfig): TelegramChannelProvider {
  return new TelegramChannelProvider(config)
}

let _provider: TelegramChannelProvider | null = null

/**
 * Lazily-instantiated singleton instance for app-startup wiring. Reads
 * configuration from environment variables on first use.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-telegram'
 *
 * setProvider('telegram', provider)
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
