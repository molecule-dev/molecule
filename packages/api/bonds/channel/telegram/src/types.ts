/**
 * Type definitions for the Telegram channel provider.
 *
 * Wraps the Telegram Bot API (`https://api.telegram.org/bot<token>/...`)
 * and the inbound webhook `Update` shape so consumers stay decoupled from
 * raw Telegram payloads.
 *
 * @module
 */

/**
 * Configuration for the Telegram channel provider.
 *
 * The bot token is the credential that authorizes Bot API calls — it is
 * deliberately accepted only via this config (or the
 * `CHANNEL_TELEGRAM_BOT_TOKEN` env var) and is NEVER included in error
 * messages, log lines, or normalized payloads.
 */
export interface TelegramConfig {
  /**
   * Telegram bot token (`<bot_id>:<auth_string>`). Defaults to the
   * `CHANNEL_TELEGRAM_BOT_TOKEN` env var.
   *
   * Treat as a secret — providers redact this value in any user-facing
   * output.
   */
  botToken?: string

  /**
   * Shared secret value Telegram echoes back via the
   * `X-Telegram-Bot-Api-Secret-Token` header on every webhook request.
   *
   * Must match the `secret_token` registered via
   * `setWebhook?secret_token=...`. Defaults to the
   * `CHANNEL_TELEGRAM_WEBHOOK_SECRET` env var.
   *
   * If unset, {@link TelegramChannelProvider.verifyWebhookSignature}
   * returns `false`.
   */
  webhookSecret?: string

  /**
   * Default `parse_mode` for outbound messages — `'HTML'` or
   * `'MarkdownV2'`. Defaults to `'HTML'`.
   */
  defaultParseMode?: TelegramParseMode

  /**
   * Bot API base URL. Override only for tests / self-hosted Bot API
   * servers. Defaults to `https://api.telegram.org`.
   */
  apiBaseUrl?: string

  /**
   * Per-request timeout in milliseconds. Defaults to 10000.
   */
  timeoutMs?: number
}

/**
 * Telegram message formatting flavours supported by the Bot API. Plain
 * text is sent when no parse mode is set.
 */
export type TelegramParseMode = 'HTML' | 'MarkdownV2'

/**
 * Environment variables consumed by the Telegram channel provider.
 */
export interface ProcessEnv {
  /** Bot API token (`<bot_id>:<auth_string>`). */
  CHANNEL_TELEGRAM_BOT_TOKEN: string

  /** Shared `secret_token` value Telegram echoes back on webhook calls. */
  CHANNEL_TELEGRAM_WEBHOOK_SECRET: string
}

/**
 * Subset of the Telegram `User` object used when normalizing inbound
 * payloads. Only fields the provider actually inspects are typed.
 *
 * @see https://core.telegram.org/bots/api#user
 */
export interface TelegramUser {
  /** Telegram user identifier. */
  id: number
  /** Whether the user is a bot. */
  is_bot?: boolean
  /** First name (displayed in clients). */
  first_name?: string
  /** Optional last name. */
  last_name?: string
  /** Optional `@username`. */
  username?: string
}

/**
 * Subset of the Telegram `Chat` object used for inbound normalization.
 *
 * @see https://core.telegram.org/bots/api#chat
 */
export interface TelegramChat {
  /** Chat identifier (positive for users, negative for groups). */
  id: number
  /** Chat kind (`'private'`, `'group'`, `'supergroup'`, `'channel'`). */
  type?: string
  /** Title for group / channel chats. */
  title?: string
  /** Username for public chats. */
  username?: string
}

/**
 * Subset of the Telegram `PhotoSize` object.
 *
 * @see https://core.telegram.org/bots/api#photosize
 */
export interface TelegramPhotoSize {
  /** Identifier used to download the file via `getFile`. */
  file_id: string
  /** Stable identifier across bots for the same file. */
  file_unique_id?: string
  /** Photo width in pixels. */
  width?: number
  /** Photo height in pixels. */
  height?: number
  /** File size in bytes, if known. */
  file_size?: number
}

/**
 * Subset of the Telegram `Document` object.
 *
 * @see https://core.telegram.org/bots/api#document
 */
export interface TelegramDocument {
  /** Identifier used to download the file via `getFile`. */
  file_id: string
  /** Stable identifier across bots for the same file. */
  file_unique_id?: string
  /** Original filename, if available. */
  file_name?: string
  /** Reported MIME type. */
  mime_type?: string
  /** File size in bytes, if known. */
  file_size?: number
}

/**
 * Subset of the Telegram `Message` object inspected during inbound
 * normalization.
 *
 * @see https://core.telegram.org/bots/api#message
 */
export interface TelegramMessage {
  /** Sequential message identifier within the chat. */
  message_id: number
  /** Unix timestamp (seconds) the message was sent. */
  date?: number
  /** Author of the message. */
  from?: TelegramUser
  /** Chat the message belongs to. */
  chat: TelegramChat
  /** Plain-text body, if any. */
  text?: string
  /** Caption on a media message. */
  caption?: string
  /** Photo size variants attached to the message. */
  photo?: TelegramPhotoSize[]
  /** Document attached to the message. */
  document?: TelegramDocument
  /** Forum topic identifier (when posted in a forum supergroup). */
  message_thread_id?: number
  /** Whether the message was sent inside a forum topic. */
  is_topic_message?: boolean
}

/**
 * Subset of the Telegram `CallbackQuery` object used to surface button
 * clicks via {@link InboundMessage.payload}.
 *
 * @see https://core.telegram.org/bots/api#callbackquery
 */
export interface TelegramCallbackQuery {
  /** Identifier of this callback query. */
  id: string
  /** User who triggered the callback. */
  from: TelegramUser
  /** Message the inline keyboard was attached to. */
  message?: TelegramMessage
  /** Opaque payload originally set on the inline keyboard button. */
  data?: string
}

/**
 * Subset of the Telegram `InlineQuery` object surfaced via
 * {@link InboundMessage.payload}.
 *
 * @see https://core.telegram.org/bots/api#inlinequery
 */
export interface TelegramInlineQuery {
  /** Identifier of this inline query. */
  id: string
  /** User issuing the query. */
  from: TelegramUser
  /** Free-text query body. */
  query: string
}

/**
 * Subset of the Telegram `Update` object delivered to the webhook
 * endpoint. Only the variants the provider parses are typed; additional
 * fields are passed through opaquely on
 * {@link InboundMessage.payload}.
 *
 * @see https://core.telegram.org/bots/api#update
 */
export interface TelegramUpdate {
  /** Incremental update identifier. */
  update_id: number
  /** Standard chat message. */
  message?: TelegramMessage
  /** Edited standard chat message. */
  edited_message?: TelegramMessage
  /** Channel post. */
  channel_post?: TelegramMessage
  /** Edited channel post. */
  edited_channel_post?: TelegramMessage
  /** Inline keyboard button click. */
  callback_query?: TelegramCallbackQuery
  /** Inline-mode query. */
  inline_query?: TelegramInlineQuery
}
