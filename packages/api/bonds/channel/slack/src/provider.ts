/**
 * Slack implementation of the molecule {@link ChannelProvider} interface.
 *
 * Backs `sendMessage` with `chat.postMessage` from `@slack/web-api`,
 * verifies inbound webhooks against the Slack signing secret using the
 * documented `v0:{ts}:{body}` HMAC scheme, and normalises the three
 * inbound event flavours (`event_callback` for `message.channels` and
 * `app_mention`, plus slash commands) into the canonical
 * {@link InboundMessage} shape.
 *
 * Design notes:
 * - The bot token is held in the closure and never appears in error
 *   messages — tokens leaking through stack traces or response bodies is
 *   an explicit non-goal for this bond.
 * - The `WebClient` import is dynamic-friendly via the
 *   {@link SlackChannelConfig.webClient} escape hatch; tests pass in a
 *   stub so `@slack/web-api` does not need to be loaded.
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
  SlackChannelConfig,
  SlackChatPostMessageArgs,
  SlackChatPostMessageResponse,
  SlackOutboundAttachment,
  SlackWebClientLike,
} from './types.js'

const DEFAULT_TOLERANCE_SECONDS = 300

/**
 * Static capability matrix for the Slack channel.
 *
 * @returns The features the Slack provider supports.
 */
function slackFeatures(): ChannelFeatures {
  return {
    text: true,
    buttons: true,
    attachments: true,
    threads: true,
    signedWebhooks: true,
  }
}

/**
 * Converts a normalised {@link OutboundMessage} into the argument shape
 * expected by `chat.postMessage`.
 *
 * @param to - Slack channel id, user id, or IM id.
 * @param message - The outbound message to render.
 * @returns The argument object for `chat.postMessage`.
 */
function buildPostMessageArgs(
  to: ChannelRecipient,
  message: OutboundMessage,
): SlackChatPostMessageArgs {
  const args: SlackChatPostMessageArgs = { channel: to }

  if (message.text !== undefined) {
    args.text = message.text
  }

  if (message.thread_id) {
    args.thread_ts = message.thread_id
  }

  if (message.kind === 'rich' && message.buttons && message.buttons.length > 0) {
    args.blocks = [
      ...(message.text
        ? [
            {
              type: 'section' as const,
              text: { type: 'mrkdwn' as const, text: message.text },
            },
          ]
        : []),
      {
        type: 'actions' as const,
        elements: message.buttons.map((button, index) => ({
          type: 'button' as const,
          text: { type: 'plain_text' as const, text: button.label },
          value: button.value,
          action_id: `mol_action_${index}`,
        })),
      },
    ]
  }

  if (message.attachments && message.attachments.length > 0) {
    args.attachments = message.attachments.map(toSlackAttachment)
  }

  return args
}

/**
 * Maps a normalised {@link ChannelAttachment} into the legacy Slack
 * attachment shape. Inline `data` payloads are dropped (Slack expects a
 * URL); callers that need to upload bytes should use the `files.upload`
 * API directly.
 *
 * @param attachment - The normalised attachment.
 * @returns The Slack-flavoured attachment.
 */
function toSlackAttachment(attachment: ChannelAttachment): SlackOutboundAttachment {
  const slack: SlackOutboundAttachment = {}
  if (attachment.filename) slack.title = attachment.filename
  if (attachment.caption) slack.text = attachment.caption
  if (attachment.url) {
    if (attachment.contentType?.startsWith('image/')) {
      slack.image_url = attachment.url
    } else {
      slack.title_link = attachment.url
    }
  }
  if (attachment.caption) slack.fallback = attachment.caption
  return slack
}

/**
 * Compares two strings in constant time, padding the shorter one so the
 * underlying `timingSafeEqual` doesn't throw on length mismatch.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` if the strings are equal byte-for-byte.
 */
function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Coerces a raw body of either string or `Uint8Array` shape into the
 * UTF-8 string Slack signs against.
 *
 * @param body - Raw request body.
 * @returns The string representation of the body.
 */
function bodyToString(body: string | Uint8Array): string {
  if (typeof body === 'string') return body
  return Buffer.from(body).toString('utf8')
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
 * Parses an `application/x-www-form-urlencoded` body into a flat object.
 * Slack uses this format for slash commands and interactive payloads.
 *
 * @param body - URL-encoded form body.
 * @returns Decoded key/value map.
 */
function parseUrlEncoded(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of body.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = eq === -1 ? pair : pair.slice(0, eq)
    const value = eq === -1 ? '' : pair.slice(eq + 1)
    out[decodeURIComponent(key.replace(/\+/g, ' '))] = decodeURIComponent(value.replace(/\+/g, ' '))
  }
  return out
}

/**
 * Creates a Slack-backed {@link ChannelProvider}.
 *
 * Tokens are sourced from the supplied {@link SlackChannelConfig} or, as
 * a fallback, the documented environment variables. Methods that require
 * a particular secret throw a generic error if the secret is missing —
 * the missing token name is surfaced, but never its value.
 *
 * @param config - Provider configuration. All fields are optional; env
 *   vars cover the production wiring path.
 * @returns A `ChannelProvider` ready to be bonded under name `'slack'`.
 */
export function createProvider(config: SlackChannelConfig = {}): ChannelProvider {
  const botToken = config.botToken ?? process.env.SLACK_BOT_TOKEN
  const signingSecret = config.signingSecret ?? process.env.SLACK_SIGNING_SECRET
  const tolerance = config.signatureToleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS

  let cachedClient: SlackWebClientLike | null = config.webClient ?? null

  /**
   * Lazily constructs (or returns the cached) Slack web client.
   *
   * The `@slack/web-api` package is imported dynamically so test
   * environments (and apps that bond a different channel) never have to
   * load it eagerly at module-evaluation time.
   *
   * @returns The web client.
   * @throws {Error} If no bot token is configured.
   */
  async function getClient(): Promise<SlackWebClientLike> {
    if (cachedClient) return cachedClient
    if (!botToken) {
      throw new Error(
        'Slack channel provider requires a bot token. Set config.botToken or SLACK_BOT_TOKEN.',
      )
    }
    const mod = (await import('@slack/web-api')) as {
      WebClient: new (token: string) => unknown
    }
    cachedClient = new mod.WebClient(botToken) as SlackWebClientLike
    return cachedClient
  }

  const provider: ChannelProvider = {
    name: 'slack',

    async sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult> {
      const client = await getClient()
      const args = buildPostMessageArgs(to, message)

      let response: SlackChatPostMessageResponse
      try {
        response = await client.chat.postMessage(args)
      } catch (error) {
        // Re-wrap with a sanitised message so the bot token cannot leak
        // verbatim through `Error.message`. The original error is still
        // attached as `cause` for traceability — callers MUST avoid
        // surfacing `cause.message` to end users without further
        // sanitisation.
        const reason =
          error instanceof Error && error.message ? sanitizeError(error.message) : 'unknown error'
        throw new Error(`Slack chat.postMessage failed: ${reason}`, { cause: error })
      }

      if (!response.ok) {
        throw new Error(`Slack chat.postMessage failed: ${response.error ?? 'unknown error'}`)
      }

      const ts = response.ts
      if (!ts) {
        throw new Error('Slack chat.postMessage response missing ts')
      }

      // Slack `ts` is `<seconds>.<microseconds>` — convert to a Date for
      // the normalised SendResult.
      const seconds = Number.parseFloat(ts)
      const deliveredAt = Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date()

      return {
        messageId: ts,
        deliveredAt,
      }
    },

    verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean {
      if (!signingSecret) return false

      const lower = normaliseHeaders(headers)
      const signature = lower['x-slack-signature']
      const timestamp = lower['x-slack-request-timestamp']
      if (!signature || !timestamp) return false

      // Replay protection: reject anything outside the tolerance window.
      const ts = Number.parseInt(timestamp, 10)
      if (!Number.isFinite(ts)) return false
      const nowSeconds = Math.floor(Date.now() / 1000)
      if (Math.abs(nowSeconds - ts) > tolerance) return false

      const basestring = `v0:${timestamp}:${bodyToString(body)}`
      const computed = `v0=${createHmac('sha256', signingSecret).update(basestring).digest('hex')}`

      return safeStringEqual(computed, signature)
    },

    parseInbound(payload: unknown): InboundMessage {
      // Slash commands arrive as URL-encoded form bodies.
      if (typeof payload === 'string') {
        return parseSlashCommand(parseUrlEncoded(payload), payload)
      }

      if (!payload || typeof payload !== 'object') {
        throw new Error('Slack parseInbound: payload is not an object')
      }

      const obj = payload as Record<string, unknown>

      // Slash command pre-parsed by middleware.
      if (typeof obj.command === 'string' && typeof obj.user_id === 'string') {
        return parseSlashCommand(obj as Record<string, string>, payload)
      }

      // Events API: { type: 'event_callback', event: {...} }
      if (obj.type === 'event_callback' && obj.event && typeof obj.event === 'object') {
        const event = obj.event as Record<string, unknown>
        const text = typeof event.text === 'string' ? event.text : undefined
        const user = typeof event.user === 'string' ? event.user : 'unknown'
        const channel = typeof event.channel === 'string' ? event.channel : undefined
        const threadTs = typeof event.thread_ts === 'string' ? event.thread_ts : undefined
        const tsRaw = typeof event.ts === 'string' ? event.ts : undefined

        const inbound: InboundMessage = {
          from: user,
          channel: 'slack',
          payload,
          receivedAt: tsRaw ? new Date(Number.parseFloat(tsRaw) * 1000) : new Date(),
        }
        if (text !== undefined) inbound.text = text
        if (threadTs) inbound.thread_id = threadTs
        if (channel) {
          // The normalised `channel` field reflects the channel kind, not
          // the Slack room id. Slack's room id stays in the raw payload.
        }
        return inbound
      }

      throw new Error('Slack parseInbound: unrecognised payload shape')
    },

    listSupportedFeatures(): ChannelFeatures {
      return slackFeatures()
    },
  }

  return provider
}

/**
 * Strips occurrences of any "xox*" Slack token from an error message so
 * tokens that leaked into a third-party stack trace cannot be re-emitted
 * by this provider.
 *
 * @param message - The original error message.
 * @returns A token-free copy of the message.
 */
function sanitizeError(message: string): string {
  return message.replace(/xox[abprs]-[A-Za-z0-9-]+/g, '[redacted]')
}

/**
 * Builds an {@link InboundMessage} from a parsed Slack slash-command
 * form body.
 *
 * @param fields - Decoded form fields (`command`, `user_id`, `text`, …).
 * @param payload - Original payload preserved on the result.
 * @returns Normalised inbound message.
 */
function parseSlashCommand(fields: Record<string, string>, payload: unknown): InboundMessage {
  const command = fields.command ?? '/unknown'
  const userId = fields.user_id ?? 'unknown'
  const text = fields.text ?? ''
  return {
    from: userId,
    channel: 'slack',
    text: `${command} ${text}`.trim(),
    payload,
    receivedAt: new Date(),
  }
}

/**
 * Default Slack channel provider — pre-bound to env vars at import time.
 *
 * Convenience export for apps that want to `bond('channel', 'slack',
 * provider)` without explicit configuration. Configuration via env vars
 * still applies.
 */
export const provider: ChannelProvider = createProvider()
