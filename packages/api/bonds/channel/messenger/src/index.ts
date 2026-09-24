/**
 * Facebook Messenger channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the Messenger Send API and webhook envelope. Bond under the
 * named-multi-provider `'channel'` category at app startup.
 *
 * @example
 * ```typescript
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-messenger'
 *
 * // Startup: bond under the name 'messenger'.
 * setProvider(
 *   'messenger',
 *   createProvider({
 *     pageAccessToken: process.env.CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN, // EAA…
 *     appSecret: process.env.CHANNEL_MESSENGER_APP_SECRET, // verifies X-Hub-Signature-256
 *   }),
 * )
 * const messenger = requireProviderByName('messenger')
 *
 * // POST webhook route: verify the RAW body, parse, then reply to the sender's PSID.
 * export async function handleWebhook(headers: Record<string, string>, rawBody: string) {
 *   if (!messenger.verifyWebhookSignature(headers, rawBody)) return 401
 *   const inbound = messenger.parseInbound(JSON.parse(rawBody)) // postback → button value
 *   if (inbound.text) {
 *     await messenger.sendMessage(inbound.from, {
 *       kind: 'rich',
 *       text: `You said: ${inbound.text}`,
 *       buttons: [{ label: 'Talk to a human', value: 'HANDOFF' }], // 1–3 → button template
 *     })
 *   }
 *   return 200
 * }
 * ```
 *
 * @remarks
 * - **Not `bond('channel-messenger', ...)`** — register with the channel core's
 *   `setProvider('messenger', provider)`. Env vars are `CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN` and
 *   `CHANNEL_MESSENGER_APP_SECRET`, read when the provider is CREATED. A missing token throws
 *   only on `sendMessage()`; a missing app secret makes every signature check `false`.
 * - **Recipients are page-scoped ids (PSIDs)** from an inbound message (`inbound.from`) — you
 *   cannot message a user who has not written to the Page first. No `threads` support.
 * - `parseInbound()` reads only the FIRST `entry[].messaging[]` event and THROWS on shapes it
 *   does not recognize — verify first, then catch and still answer 200 so Meta does not keep
 *   retrying. Echo events (`message.is_echo`, if subscribed) parse as ordinary messages from the
 *   Page itself — skip them (check `inbound.payload`) or the bot replies to its own messages.
 * - 4+ buttons fall back to `quick_replies`; each button `value` comes back as `inbound.text`.
 * - **Webhook subscription needs a GET echo the bond does not provide.** When
 *   you register the webhook URL in the Meta console, Meta first sends
 *   `GET ?hub.mode=subscribe&hub.verify_token=<your token>&hub.challenge=<n>`.
 *   Your route must check the verify token you chose in the console and
 *   respond `200` with the raw `hub.challenge` value. Only POST deliveries go
 *   through `verifyWebhookSignature()` / `parseInbound()`.
 * - **24-hour messaging window:** outside 24h since the user's last message,
 *   the Send API rejects standard sends — Meta requires an approved message
 *   tag for out-of-window messages. Expect and surface that API error.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
