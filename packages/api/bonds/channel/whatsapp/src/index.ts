/**
 * WhatsApp channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the WhatsApp Cloud API
 * (`https://graph.facebook.com/v22.0/<phone-id>/messages`). Bond under
 * the named-multi-provider `'channel'` category at app startup.
 *
 * @example
 * ```typescript
 * import type { OutboundMessage } from '@molecule/api-channel'
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import type { WhatsAppOutboundExtensions } from '@molecule/api-channel-whatsapp'
 * import { createProvider } from '@molecule/api-channel-whatsapp'
 *
 * // Startup: bond under the name 'whatsapp'.
 * setProvider(
 *   'whatsapp',
 *   createProvider({
 *     accessToken: process.env.CHANNEL_WHATSAPP_ACCESS_TOKEN, // system-user token
 *     phoneNumberId: process.env.CHANNEL_WHATSAPP_PHONE_NUMBER_ID, // numeric id, NOT the number
 *     appSecret: process.env.CHANNEL_WHATSAPP_APP_SECRET, // verifies X-Hub-Signature-256
 *   }),
 * )
 * const whatsapp = requireProviderByName('whatsapp')
 *
 * // Business-initiated (outside the 24h window): only an APPROVED template may be sent.
 * const shipped: OutboundMessage & { payload: WhatsAppOutboundExtensions } = {
 *   kind: 'rich',
 *   payload: { template: { name: 'order_shipped', language: 'en_US', bodyParameters: ['Ada', '#1042'] } },
 * }
 * await whatsapp.sendMessage('15551234567', shipped) // recipient = phone number, country code first
 *
 * // POST webhook route: verify the RAW body, parse, reply inside the 24h window.
 * export async function handleWebhook(headers: Record<string, string>, rawBody: string) {
 *   if (!whatsapp.verifyWebhookSignature(headers, rawBody)) return 401
 *   const inbound = whatsapp.parseInbound(JSON.parse(rawBody)) // button tap → its value as text
 *   if (inbound.text) {
 *     // Status/delivery webhooks have no text — only reply to real messages.
 *     await whatsapp.sendMessage(inbound.from, {
 *       kind: 'rich',
 *       text: 'How can we help?',
 *       buttons: [{ label: 'Track order', value: 'track' }], // max 3, extras dropped
 *     })
 *   }
 *   return 200
 * }
 * ```
 *
 * @remarks
 * **Not `bond('channel-whatsapp', ...)`** — register with the channel core's
 * `setProvider('whatsapp', provider)`. Env vars are `CHANNEL_WHATSAPP_ACCESS_TOKEN`,
 * `CHANNEL_WHATSAPP_PHONE_NUMBER_ID` and `CHANNEL_WHATSAPP_APP_SECRET`, read when the provider is
 * CREATED; a missing token / phone-number id throws only on `sendMessage()`, a missing app
 * secret makes every signature check `false`. `payload.template` is not part of the core
 * `OutboundMessage` type — declare the message as `OutboundMessage & { payload:
 * WhatsAppOutboundExtensions }` (as above) instead of an inline literal.
 *
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
