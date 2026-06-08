/**
 * Discord implementation of the {@link ChannelProvider} interface.
 *
 * Two surfaces are implemented:
 *
 * 1. **Outbound** — {@link DiscordChannelProvider.sendMessage} POSTs to
 *    `/channels/{channel.id}/messages` via the REST API. When a
 *    `discord.js` `REST` instance is supplied via {@link DiscordConfig.rest}
 *    the bond delegates to it; otherwise it falls back to a built-in
 *    `fetch` call so the bond is usable in environments that haven't
 *    bundled `discord.js` (the dependency is declared as a
 *    `peerDependency`).
 * 2. **Inbound** — {@link DiscordChannelProvider.verifyWebhookSignature}
 *    validates Discord's `X-Signature-Ed25519` /
 *    `X-Signature-Timestamp` headers against the application's public key
 *    using Node's built-in `crypto.verify('ed25519', …)`. No external
 *    crypto library required.
 *
 *    {@link DiscordChannelProvider.parseInbound} normalises the
 *    `MESSAGE_COMPONENT` and `APPLICATION_COMMAND` interaction shapes into
 *    a {@link InboundMessage}. The original Discord payload is preserved
 *    on `payload` for forensic / advanced use.
 *
 * @module
 */

import { createPublicKey, verify as cryptoVerify } from 'node:crypto'

import type {
  ChannelAttachment,
  ChannelFeatures,
  ChannelProvider,
  ChannelRecipient,
  InboundMessage,
  OutboundMessage,
  SendResult,
} from '@molecule/api-channel'

import type { DiscordConfig, DiscordRestLike } from './types.js'

/**
 * Default Discord REST API base URL.
 */
const DEFAULT_API_BASE = 'https://discord.com/api/v10'

/**
 * Default REST request timeout in milliseconds.
 */
const DEFAULT_TIMEOUT_MS = 10000

/**
 * Discord ed25519 public-key DER prefix. Discord publishes the raw 32-byte
 * key as hex; Node's `createPublicKey` requires it to be wrapped in the
 * standard SubjectPublicKeyInfo / DER preamble.
 *
 * The prefix `302a300506032b6570032100` is the SPKI header for
 * `id-Ed25519` (RFC 8410) followed by a 32-byte BIT STRING.
 */
const ED25519_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

/**
 * Discord application command interaction type.
 */
const INTERACTION_APPLICATION_COMMAND = 2

/**
 * Discord message-component interaction type (button click, select-menu).
 */
const INTERACTION_MESSAGE_COMPONENT = 3

/**
 * Capability matrix for the Discord channel.
 *
 * - `text: true` — plain content messages.
 * - `buttons: true` — Discord supports interactive components on rich
 *   messages.
 * - `attachments: true` — Discord supports file uploads / linked media.
 * - `threads: true` — Discord exposes first-class threaded conversations.
 * - `signedWebhooks: true` — interaction webhooks are ed25519-signed.
 */
const FEATURES: ChannelFeatures = Object.freeze({
  text: true,
  buttons: true,
  attachments: true,
  threads: true,
  signedWebhooks: true,
})

/**
 * Concrete Discord implementation of {@link ChannelProvider}.
 */
export class DiscordChannelProvider implements ChannelProvider {
  /**
   * Stable channel name. Always `'discord'`.
   */
  readonly name = 'discord'

  private readonly botToken: string | undefined
  private readonly publicKeyHex: string | undefined
  private readonly apiBaseUrl: string
  private readonly rest: DiscordRestLike | undefined
  private readonly timeoutMs: number

  /**
   * Constructs a Discord channel provider.
   *
   * @param config - Optional configuration. Any field omitted falls back
   *   to the corresponding environment variable.
   */
  constructor(config: DiscordConfig = {}) {
    this.botToken = config.botToken ?? process.env.CHANNEL_DISCORD_BOT_TOKEN
    this.publicKeyHex = config.publicKey ?? process.env.CHANNEL_DISCORD_PUBLIC_KEY
    this.apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE
    this.rest = config.rest
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  /**
   * Posts a message to a Discord channel via the REST API.
   *
   * The recipient `to` is treated as a Discord channel snowflake ID (the
   * same identifier yielded by the inbound interaction `channel.id`).
   * Threaded replies are posted to the thread channel directly; pass the
   * thread's channel ID as `to` (Discord threads are channels themselves).
   *
   * @param to - Discord channel snowflake to post into.
   * @param message - Normalized {@link OutboundMessage}.
   * @returns Result describing the delivered message.
   * @throws {Error} When the bot token is missing, the recipient is empty,
   *   or the REST call fails.
   */
  async sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult> {
    if (!to) {
      throw new Error('Discord channel ID is required.')
    }
    if (!this.botToken && !this.rest) {
      throw new Error(
        'Discord bot token not configured. Set CHANNEL_DISCORD_BOT_TOKEN or provide a REST client.',
      )
    }

    const body = buildOutboundBody(message)
    const route = `/channels/${encodeURIComponent(to)}/messages`

    const responseJson = this.rest
      ? ((await this.rest.post(route, { body })) as DiscordMessageResponse)
      : await this.fetchPost(route, body)

    const messageId = responseJson?.id ?? ''
    const timestamp = responseJson?.timestamp ? new Date(responseJson.timestamp) : new Date()

    return { messageId, deliveredAt: timestamp }
  }

  /**
   * Verifies the ed25519 signature on an inbound Discord interaction
   * webhook.
   *
   * Discord signs each request with the application's ed25519 private
   * key. The signature covers `timestamp + body` and is delivered in the
   * `X-Signature-Ed25519` header (hex-encoded). The `X-Signature-Timestamp`
   * header carries the timestamp that was signed.
   *
   * @param headers - Lowercased request header map.
   * @param body - Raw, unparsed request body.
   * @returns `true` if the signature is valid for the configured public key.
   */
  verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean {
    if (!this.publicKeyHex) return false

    const signatureHex = pickHeader(headers, 'x-signature-ed25519')
    const timestamp = pickHeader(headers, 'x-signature-timestamp')
    if (!signatureHex || !timestamp) return false

    let signatureBytes: Buffer
    try {
      signatureBytes = Buffer.from(signatureHex, 'hex')
    } catch (_error) {
      // Malformed hex in the signature header — treat as invalid, not a server error.
      return false
    }
    if (signatureBytes.length !== 64) return false

    const bodyBytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body)
    const signedPayload = Buffer.concat([Buffer.from(timestamp, 'utf8'), bodyBytes])

    let publicKey
    try {
      const keyDer = Buffer.concat([ED25519_DER_PREFIX, Buffer.from(this.publicKeyHex, 'hex')])
      publicKey = createPublicKey({ key: keyDer, format: 'der', type: 'spki' })
    } catch (_error) {
      // Malformed public key config — treat as unverifiable rather than crashing per-request.
      return false
    }

    try {
      return cryptoVerify(null, signedPayload, publicKey, signatureBytes)
    } catch (_error) {
      // cryptoVerify throws on invalid input (wrong key type, etc.) — treat as failed verification.
      return false
    }
  }

  /**
   * Parses a Discord interaction payload into a normalised
   * {@link InboundMessage}.
   *
   * Handles two interaction types:
   *
   * - `2` (`APPLICATION_COMMAND`) — slash command. The `text` field is
   *   set to the command name (`'/<command>'`).
   * - `3` (`MESSAGE_COMPONENT`) — button click / select-menu. The `text`
   *   field is set to the component's `custom_id`.
   *
   * Other interaction types (e.g. modal submit, autocomplete) are
   * surfaced as an `InboundMessage` with no `text` and the raw payload
   * preserved on `payload`.
   *
   * @param payload - The parsed Discord interaction body.
   * @returns Normalized {@link InboundMessage}.
   * @throws {Error} If `payload` is null/undefined or not an object.
   */
  parseInbound(payload: unknown): InboundMessage {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Discord inbound payload must be an object.')
    }

    const interaction = payload as DiscordInteractionPayload
    const channelId = interaction.channel?.id ?? interaction.channel_id ?? ''
    const userId =
      interaction.member?.user?.id ?? interaction.user?.id ?? interaction.author?.id ?? ''

    const attachments = normaliseAttachments(interaction.message?.attachments)

    let text: string | undefined
    if (interaction.type === INTERACTION_APPLICATION_COMMAND) {
      text = interaction.data?.name ? `/${interaction.data.name}` : undefined
    } else if (interaction.type === INTERACTION_MESSAGE_COMPONENT) {
      text = interaction.data?.custom_id ?? undefined
    } else if (typeof interaction.content === 'string') {
      // Pass-through for non-interaction inbound shapes (e.g. raw
      // gateway message events forwarded through a relay).
      text = interaction.content
    }

    return {
      from: userId,
      channel: 'discord',
      text,
      attachments: attachments.length > 0 ? attachments : undefined,
      thread_id: channelId || undefined,
      payload,
      receivedAt: new Date(),
    }
  }

  /**
   * Returns the static feature matrix for the Discord channel.
   *
   * @returns A frozen {@link ChannelFeatures} record.
   */
  listSupportedFeatures(): ChannelFeatures {
    return FEATURES
  }

  /**
   * Built-in REST `POST` used when no `discord.js` REST instance is
   * configured. Issues a JSON request with the bot token and applies the
   * configured timeout.
   *
   * @param route - Path beneath the Discord API base.
   * @param body - JSON-serialisable body.
   * @returns The parsed JSON response.
   * @throws {Error} If the response is non-2xx or the request times out.
   */
  private async fetchPost(route: string, body: unknown): Promise<DiscordMessageResponse> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.apiBaseUrl}${route}`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.botToken!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Discord REST returned HTTP ${response.status}`)
      }
      return (await response.json()) as DiscordMessageResponse
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * Convenience factory for {@link DiscordChannelProvider}.
 *
 * @param config - Optional configuration.
 * @returns A configured Discord channel provider.
 */
export function createProvider(config: DiscordConfig = {}): DiscordChannelProvider {
  return new DiscordChannelProvider(config)
}

/**
 * Builds the JSON body POSTed to `/channels/:id/messages`.
 *
 * Translates molecule's normalised {@link OutboundMessage} into Discord's
 * REST shape:
 *
 * - `text` → `content`
 * - `buttons` → a single `ACTION_ROW` of `BUTTON` components
 *   (`type: 1` row, `type: 2` button, `style: 1` primary).
 * - `attachments[*].url` → an `embeds` entry surfacing the URL.
 *   (Raw `data` byte payloads are not supported by this REST shortcut;
 *   callers wanting binary uploads should pass a `discord.js` `REST`
 *   client via {@link DiscordConfig.rest} and use multipart manually.)
 * - `thread_id` → also forwarded as a top-level `thread_id` field, which
 *   Discord interprets as "create / reply in this thread when posting
 *   to a parent channel".
 *
 * @param message - The outbound message to translate.
 * @returns The Discord REST payload.
 */
function buildOutboundBody(message: OutboundMessage): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (message.text) body.content = message.text

  if (message.buttons && message.buttons.length > 0) {
    body.components = [
      {
        type: 1,
        components: message.buttons.map((button) => ({
          type: 2,
          style: 1,
          label: button.label,
          custom_id: button.value,
        })),
      },
    ]
  }

  if (message.attachments && message.attachments.length > 0) {
    const embeds: Array<Record<string, unknown>> = []
    for (const attachment of message.attachments) {
      if (!attachment.url) continue
      const embed: Record<string, unknown> = { url: attachment.url }
      if (attachment.caption) embed.description = attachment.caption
      if (attachment.contentType?.startsWith('image/')) {
        embed.image = { url: attachment.url }
      }
      embeds.push(embed)
    }
    if (embeds.length > 0) body.embeds = embeds
  }

  if (message.thread_id) body.thread_id = message.thread_id

  return body
}

/**
 * Normalises a Discord attachment array into molecule's
 * {@link ChannelAttachment} shape.
 *
 * @param attachments - Discord-shaped attachment array (may be undefined).
 * @returns Array of normalised attachments (possibly empty).
 */
function normaliseAttachments(
  attachments: DiscordInboundAttachment[] | undefined,
): ChannelAttachment[] {
  if (!attachments?.length) return []
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    contentType: attachment.content_type,
    url: attachment.url,
  }))
}

/**
 * Case-insensitively retrieves a header value.
 *
 * @param headers - Header map.
 * @param name - Header name (lowercase).
 * @returns The header value or `undefined`.
 */
function pickHeader(headers: Record<string, string>, name: string): string | undefined {
  if (name in headers) return headers[name]
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) return headers[key]
  }
  return undefined
}

/**
 * Subset of Discord's interaction REST response we read after a send.
 */
interface DiscordMessageResponse {
  id?: string
  timestamp?: string
}

/**
 * Subset of Discord's interaction webhook payload we parse.
 */
interface DiscordInteractionPayload {
  type?: number
  channel_id?: string
  channel?: { id?: string }
  member?: { user?: { id?: string } }
  user?: { id?: string }
  author?: { id?: string }
  data?: { name?: string; custom_id?: string }
  message?: { attachments?: DiscordInboundAttachment[] }
  content?: string
}

/**
 * Subset of Discord's inbound attachment shape we surface.
 */
interface DiscordInboundAttachment {
  filename?: string
  content_type?: string
  url?: string
}
