/**
 * WhatsApp channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the WhatsApp Cloud API
 * (`https://graph.facebook.com/v22.0/<phone-id>/messages`). Bond under
 * the named-multi-provider `'channel'` category at app startup:
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-whatsapp'
 *
 * setProvider('whatsapp', provider)
 * ```
 *
 * @remarks
 * Outbound messages outside the WhatsApp 24-hour customer-service window
 * MUST be sent as approved templates. The provider exposes
 * `OutboundMessage.kind = 'rich'` two ways: via interactive button
 * objects (in-window) or via WhatsApp templates (out-of-window) when
 * `payload.template` is supplied.
 *
 * **Webhook subscription needs a GET echo the bond does not provide.** When
 * registering the webhook URL in the Meta console, Meta sends
 * `GET ?hub.mode=subscribe&hub.verify_token=<your token>&hub.challenge=<n>`;
 * your route must validate the verify token and respond `200` with the raw
 * `hub.challenge`. Only POST deliveries flow through
 * `verifyWebhookSignature()` / `parseInbound()`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
