/**
 * Type definitions for the channel core interface.
 *
 * Channel providers represent outbound messaging surfaces (Slack, Discord,
 * WhatsApp, Telegram, Facebook Messenger, etc.) that an application can
 * post into and receive inbound webhook events from. The interface is
 * deliberately minimal so providers with very different upstream APIs can
 * satisfy it identically.
 *
 * @module
 */

/**
 * Stable identifier for a channel kind (e.g. `'slack'`, `'discord'`,
 * `'whatsapp'`, `'telegram'`, `'messenger'`).
 *
 * Kept as a plain `string` alias rather than a literal union so additional
 * channels can be added without touching this core package.
 */
export type ChannelName = string

/**
 * Provider-specific recipient identifier (channel id, user id, room id,
 * phone number, page id, etc.). Providers SHOULD document their accepted
 * formats; consumers MUST treat this opaquely.
 */
export type ChannelRecipient = string

/**
 * The supported flavours of {@link OutboundMessage}.
 *
 * - `'text'` — plain text message body.
 * - `'rich'` — text plus structured elements (buttons, etc.) supported by
 *   the channel.
 * - `'media'` — primarily an attachment (image, document, audio, video).
 */
export type OutboundMessageKind = 'text' | 'rich' | 'media'

/**
 * A single attachment to be sent or received.
 *
 * Providers MAY ignore unsupported attachment kinds; consumers SHOULD use
 * {@link ChannelFeatures} to gate which kinds are sent in the first place.
 */
export interface ChannelAttachment {
  /**
   * Human-readable filename. Used as a fallback display label.
   */
  filename?: string

  /**
   * IETF media type (e.g. `'image/png'`, `'application/pdf'`).
   */
  contentType?: string

  /**
   * Public URL to the asset. Mutually exclusive with {@link data}.
   */
  url?: string

  /**
   * Raw bytes (e.g. PDF rendered server-side). Mutually exclusive with
   * {@link url}.
   */
  data?: Uint8Array

  /**
   * Optional caption / alt text rendered alongside the attachment.
   */
  caption?: string
}

/**
 * A single interactive button on a rich message.
 */
export interface ChannelButton {
  /**
   * Visible label rendered on the button.
   */
  label: string

  /**
   * Opaque value sent back in the inbound payload when the user clicks.
   */
  value: string
}

/**
 * A normalized outbound message ready to be sent through any channel
 * provider. Providers SHOULD render whichever fields they support and
 * silently ignore the rest (subject to {@link ChannelFeatures}).
 */
export interface OutboundMessage {
  /**
   * The flavour of message being sent.
   */
  kind: OutboundMessageKind

  /**
   * Plain-text body. Required for `'text'` and `'rich'` kinds; optional
   * caption for `'media'` kinds.
   */
  text?: string

  /**
   * Optional attachments (images, files, audio, video). Required for
   * `'media'` kind.
   */
  attachments?: ChannelAttachment[]

  /**
   * Optional interactive buttons. Only meaningful for `'rich'` kind.
   */
  buttons?: ChannelButton[]

  /**
   * Optional thread / conversation identifier so the message is posted as
   * a reply rather than a top-level message. Format is provider-specific.
   */
  thread_id?: string
}

/**
 * Result of a successful {@link ChannelProvider.sendMessage} call.
 */
export interface SendResult {
  /**
   * Provider-assigned identifier for the delivered message. Use this to
   * correlate inbound webhook events back to the originating send.
   */
  messageId: string

  /**
   * Timestamp the provider reports the message as delivered (or accepted
   * for delivery, if the provider does not surface an explicit delivery
   * timestamp).
   */
  deliveredAt: Date
}

/**
 * A single inbound message received via webhook. Providers normalize their
 * raw payload shape into this canonical form; the original payload is
 * preserved on {@link payload} for forensic inspection.
 */
export interface InboundMessage {
  /**
   * Provider-specific sender identifier (user id, phone number, etc.).
   */
  from: ChannelRecipient

  /**
   * Channel name the message was received on (e.g. `'slack'`).
   */
  channel: ChannelName

  /**
   * Plain-text content of the inbound message, if any.
   */
  text?: string

  /**
   * Inbound attachments, normalized into the same shape as outbound
   * attachments.
   */
  attachments?: ChannelAttachment[]

  /**
   * Original provider payload (untouched). Useful for provider-specific
   * fields the normalized shape doesn't capture (e.g. button click values,
   * reactions, edit/delete events).
   */
  payload?: unknown

  /**
   * Optional thread / conversation identifier the message belongs to.
   */
  thread_id?: string

  /**
   * Timestamp the provider reports the message as received.
   */
  receivedAt: Date
}

/**
 * Capability flags describing which features a given channel provider
 * supports. Consumers should consult these before constructing an
 * {@link OutboundMessage} that depends on optional capabilities.
 */
export interface ChannelFeatures {
  /**
   * Provider supports plain text messages.
   */
  text: boolean

  /**
   * Provider supports rich messages with interactive buttons.
   */
  buttons: boolean

  /**
   * Provider supports media attachments.
   */
  attachments: boolean

  /**
   * Provider supports threaded replies (via
   * {@link OutboundMessage.thread_id}).
   */
  threads: boolean

  /**
   * Provider verifies inbound webhook signatures. If `false`, callers
   * should NOT trust {@link ChannelProvider.verifyWebhookSignature} as
   * sufficient authentication.
   */
  signedWebhooks: boolean
}

/**
 * Outbound messaging channel provider interface.
 *
 * All channel providers (Slack, Discord, WhatsApp, Telegram, Messenger,
 * fixtures, etc.) implement this interface. Multiple providers coexist in
 * the same process by being bonded under distinct names — see
 * {@link setProvider} in the provider module.
 */
export interface ChannelProvider {
  /**
   * Stable channel name (e.g. `'slack'`). Conventionally matches the bond
   * name the provider is registered under.
   */
  readonly name: ChannelName

  /**
   * Sends an outbound message to {@link to}.
   *
   * @param to - Provider-specific recipient identifier.
   * @param message - Normalized {@link OutboundMessage}.
   * @returns Result describing the delivered message.
   */
  sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult>

  /**
   * Verifies the signature on an inbound webhook request, given the raw
   * request headers and body bytes. Returns `true` when the signature is
   * valid for this provider's signing scheme.
   *
   * Providers that do not sign webhooks MUST return `false` and MUST set
   * {@link ChannelFeatures.signedWebhooks} to `false`.
   *
   * @param headers - Lowercased request header map.
   * @param body - Raw, unparsed request body.
   * @returns `true` if the signature is valid.
   */
  verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean

  /**
   * Parses a raw inbound webhook payload into a normalized
   * {@link InboundMessage}. Implementations SHOULD throw if the payload
   * is malformed; callers MUST verify the signature first via
   * {@link verifyWebhookSignature}.
   *
   * @param payload - The provider-shaped inbound webhook body.
   * @returns Normalized inbound message.
   */
  parseInbound(payload: unknown): InboundMessage

  /**
   * Returns the capability matrix for this provider.
   *
   * @returns Static {@link ChannelFeatures} describing what the provider
   *   supports.
   */
  listSupportedFeatures(): ChannelFeatures
}
