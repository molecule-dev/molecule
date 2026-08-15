/**
 * Channel capture provider for molecule.dev.
 *
 * Implements {@link ChannelProvider} by recording every `sendMessage()` call as
 * an {@link ActivityEvent} instead of (or in addition to) actually posting it.
 * Intercept-only by default (synthetic `SendResult`); delegates AND tees when
 * wrapping a real provider.
 *
 * @module
 */

import type { ActivityEvent } from '@molecule/api-activity'
import { record } from '@molecule/api-activity'
import type {
  ChannelFeatures,
  ChannelProvider,
  ChannelRecipient,
  InboundMessage,
  OutboundMessage,
  SendResult,
} from '@molecule/api-channel'

/**
 * Calls {@link record}, but never lets a throwing {@link ActivitySink} escape to
 * the caller. `ActivitySink` implementations are documented as best-effort;
 * without this guard a sink that throws AFTER a real provider already posted
 * turns an actually-SENT message into what looks like a rejected
 * `sendMessage()` — the caller retries and the channel gets a duplicate (and in
 * delegate + tee mode, a sink error would replace the REAL provider error the
 * caller needs to see). Every call site in this file goes through this wrapper.
 *
 * @param event - The activity event to record.
 */
async function recordBestEffort(event: ActivityEvent): Promise<void> {
  try {
    await record(event)
  } catch (_error) {
    // Intentional noop — see the doc comment above. This package has no logging
    // channel available (no logger peer dependency), and a thrown failure here
    // would change the caller's delivery outcome.
  }
}

const CAPTURE_FEATURES: ChannelFeatures = {
  text: true,
  buttons: true,
  attachments: true,
  threads: true,
  signedWebhooks: false,
}

/**
 * Creates a channel capture provider.
 *
 * When `realProvider` is provided, each message is posted through it and the
 * captured event records the real outcome (delegate + tee). When omitted (the
 * dev default), messages are intercepted and a synthetic `SendResult` is
 * returned. Inbound / signature / feature methods delegate to the real
 * provider when present and otherwise return intercept-only defaults.
 *
 * @param realProvider - Optional real provider to delegate to and tee.
 * @returns A {@link ChannelProvider} that records activity for every send.
 */
export function createChannelCaptureProvider(realProvider?: ChannelProvider): ChannelProvider {
  return {
    name: realProvider?.name ?? 'capture',

    async sendMessage(to: ChannelRecipient, message: OutboundMessage): Promise<SendResult> {
      const id = crypto.randomUUID()

      if (realProvider) {
        try {
          const result = await realProvider.sendMessage(to, message)
          await recordBestEffort({
            id,
            type: 'channel',
            status: 'sent',
            recipient: to,
            summary: message.text,
            payload: { to, message },
            result,
            timestamp: new Date().toISOString(),
          })
          return result
        } catch (error) {
          await recordBestEffort({
            id,
            type: 'channel',
            status: 'failed',
            recipient: to,
            summary: message.text,
            payload: { to, message },
            result: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString(),
          })
          throw error
        }
      }

      const result: SendResult = {
        messageId: `captured-${id}`,
        deliveredAt: new Date(),
      }

      await recordBestEffort({
        id,
        type: 'channel',
        status: 'captured',
        recipient: to,
        summary: message.text,
        payload: { to, message },
        result,
        timestamp: new Date().toISOString(),
      })

      return result
    },

    verifyWebhookSignature(headers: Record<string, string>, body: string | Uint8Array): boolean {
      return realProvider?.verifyWebhookSignature(headers, body) ?? false
    },

    parseInbound(payload: unknown): InboundMessage {
      if (realProvider) {
        return realProvider.parseInbound(payload)
      }
      return {
        from: '',
        channel: this.name,
        payload,
        receivedAt: new Date(),
      }
    },

    listSupportedFeatures(): ChannelFeatures {
      return realProvider?.listSupportedFeatures() ?? CAPTURE_FEATURES
    },
  }
}

/** Default channel capture provider (intercept-only). */
export const provider: ChannelProvider = createChannelCaptureProvider()
