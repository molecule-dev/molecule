/**
 * Type definitions for the Facebook Messenger channel provider.
 *
 * Wraps the Messenger Send API (`https://graph.facebook.com/v22.0/me/messages`)
 * and the inbound webhook envelope so consumers stay decoupled from raw
 * Messenger payloads.
 *
 * @module
 */

/**
 * Configuration for the Messenger channel provider.
 *
 * The page access token authorizes Send API calls; the app secret signs
 * inbound webhooks via `X-Hub-Signature-256`. Both are deliberately
 * accepted only via this config (or the `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN`
 * / `CHANNEL_MESSENGER_APP_SECRET` env vars) and are NEVER included in
 * error messages, log lines, or normalized payloads.
 */
export interface MessengerConfig {
  /**
   * Page access token (`EAA…`). Required for outbound `sendMessage`.
   * Defaults to the `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN` env var.
   *
   * Treat as a secret — providers redact this value in any user-facing
   * output.
   */
  pageAccessToken?: string

  /**
   * Facebook app secret used to verify `X-Hub-Signature-256` on inbound
   * webhook requests. Defaults to the `CHANNEL_MESSENGER_APP_SECRET` env
   * var.
   *
   * If unset, {@link MessengerChannelProvider.verifyWebhookSignature}
   * returns `false`.
   */
  appSecret?: string

  /**
   * Graph API base URL. Override only for tests or alternative regional
   * endpoints. Defaults to `https://graph.facebook.com`.
   */
  apiBaseUrl?: string

  /**
   * Graph API version to target. Defaults to `'v22.0'`.
   */
  apiVersion?: string

  /**
   * Per-request timeout in milliseconds. Defaults to 10000.
   */
  timeoutMs?: number

  /**
   * Optional default `messaging_type` applied to outbound sends. Defaults
   * to `'RESPONSE'` (replies to user-initiated conversations within the
   * 24-hour window). Override to `'UPDATE'` or `'MESSAGE_TAG'` when
   * sending unsolicited messages — note the Messenger Platform policy
   * restrictions.
   */
  defaultMessagingType?: MessengerMessagingType
}

/**
 * Messenger `messaging_type` values accepted on the Send API.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/send-messages
 */
export type MessengerMessagingType = 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG'

/**
 * Environment variables consumed by the Messenger channel provider.
 */
export interface ProcessEnv {
  /** Page access token (`EAA…`). Required for outbound sends. */
  CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN: string

  /** Facebook app secret used to verify inbound webhook signatures. */
  CHANNEL_MESSENGER_APP_SECRET: string
}

/**
 * Subset of the Messenger `Sender`/`Recipient` shape used during inbound
 * normalization.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/webhook
 */
export interface MessengerActor {
  /** Page-scoped user identifier. */
  id: string
}

/**
 * Subset of an inbound Messenger `attachment` object.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages
 */
export interface MessengerInboundAttachment {
  /** Attachment kind (`'image'`, `'video'`, `'audio'`, `'file'`, …). */
  type?: string
  /** Optional payload object — typically `{ url }`. */
  payload?: { url?: string; sticker_id?: number }
}

/**
 * Subset of an inbound Messenger `message` object.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages
 */
export interface MessengerInboundMessage {
  /** Provider-assigned message identifier (mid). */
  mid?: string
  /** Plain-text body. */
  text?: string
  /** Quick-reply payload, when the user clicked a quick reply. */
  quick_reply?: { payload?: string }
  /** Attachments (images, files, …) included with the message. */
  attachments?: MessengerInboundAttachment[]
  /** Whether the message was an echo of one this app sent. */
  is_echo?: boolean
}

/**
 * Subset of an inbound Messenger `postback` object — the payload returned
 * when a user taps a button on a `button_template` or persistent menu.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messaging_postbacks
 */
export interface MessengerInboundPostback {
  /** Opaque payload originally set on the button. */
  payload?: string
  /** Visible title shown on the button when it was tapped. */
  title?: string
}

/**
 * Subset of an inbound Messenger `delivery` object.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/message-deliveries
 */
export interface MessengerInboundDelivery {
  /** Mids of the messages confirmed delivered. */
  mids?: string[]
  /** Watermark — all messages sent before this timestamp are delivered. */
  watermark?: number
}

/**
 * Subset of an inbound Messenger `read` object.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/message-reads
 */
export interface MessengerInboundRead {
  /** Watermark — all messages sent before this timestamp are read. */
  watermark?: number
}

/**
 * A single `messaging` entry inside an inbound webhook envelope.
 */
export interface MessengerMessagingEntry {
  /** Sender of the inbound event. */
  sender?: MessengerActor
  /** Recipient (typically the page receiving the event). */
  recipient?: MessengerActor
  /** Unix timestamp in milliseconds. */
  timestamp?: number
  /** Inbound user message. */
  message?: MessengerInboundMessage
  /** Inbound button-tap postback. */
  postback?: MessengerInboundPostback
  /** Delivery confirmation. */
  delivery?: MessengerInboundDelivery
  /** Read receipt. */
  read?: MessengerInboundRead
}

/**
 * A single `entry` inside an inbound webhook envelope.
 */
export interface MessengerWebhookEntry {
  /** Page identifier the events belong to. */
  id?: string
  /** Unix timestamp in milliseconds. */
  time?: number
  /** Per-conversation events. Typically a single-element array. */
  messaging?: MessengerMessagingEntry[]
}

/**
 * Top-level Messenger webhook envelope.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/webhook
 */
export interface MessengerWebhookPayload {
  /** Always `'page'` for Messenger Platform webhooks. */
  object?: string
  /** Per-page event groups. */
  entry?: MessengerWebhookEntry[]
}

/**
 * Successful Send API response shape used by the provider.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/send-messages
 */
export interface MessengerSendApiResponse {
  /** Page-scoped recipient identifier (echoed). */
  recipient_id?: string
  /** Messenger-assigned outbound message id. */
  message_id?: string
}
