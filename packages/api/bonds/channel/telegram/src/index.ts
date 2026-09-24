/**
 * Telegram channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the Telegram Bot API. Bond under the named-multi-provider
 * `'channel'` category at app startup.
 *
 * @example
 * ```typescript
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-telegram'
 *
 * // Startup: bond under the name 'telegram'.
 * setProvider(
 *   'telegram',
 *   createProvider({
 *     botToken: process.env.CHANNEL_TELEGRAM_BOT_TOKEN, // from @BotFather
 *     webhookSecret: process.env.CHANNEL_TELEGRAM_WEBHOOK_SECRET, // same value given to setWebhook
 *   }),
 * )
 * const telegram = requireProviderByName('telegram')
 *
 * // Webhook route: check the secret-token header, parse the Update, reply.
 * export async function handleUpdate(headers: Record<string, string>, rawBody: string) {
 *   if (!telegram.verifyWebhookSignature(headers, rawBody)) return 401
 *   const inbound = telegram.parseInbound(JSON.parse(rawBody)) // button tap → its value as text
 *   if (inbound.text === '/start') {
 *     // In a private chat the sender's id IS the chat id.
 *     await telegram.sendMessage(inbound.from, {
 *       kind: 'rich',
 *       text: '<b>Welcome!</b> What do you need?', // parse_mode is HTML by default
 *       buttons: [
 *         { label: 'Track order', value: 'track' },
 *         { label: 'Talk to support', value: 'support' },
 *       ],
 *     })
 *   }
 *   return 200
 * }
 * ```
 *
 * @remarks
 * - **Not `bond('channel-telegram', ...)`** — register with the channel core's
 *   `setProvider('telegram', provider)`. Env vars are `CHANNEL_TELEGRAM_BOT_TOKEN` and
 *   `CHANNEL_TELEGRAM_WEBHOOK_SECRET` (NOT `TELEGRAM_BOT_TOKEN`), read when the provider is
 *   CREATED; a missing token throws only on `sendMessage()`.
 * - **Text is sent with `parse_mode: 'HTML'` by default** — escape `<`, `>` and `&` in user
 *   content or the Bot API rejects the send ("can't parse entities"). Pass
 *   `defaultParseMode: 'MarkdownV2'` to switch (then escape MarkdownV2's reserved characters).
 * - `inbound.from` is the SENDER's user id. It equals the chat id only in private chats — in a
 *   group, reply to `payload.message.chat.id`. `parseInbound()` throws on update kinds it does
 *   not handle (e.g. `my_chat_member`) — catch and still answer 200 so Telegram stops retrying.
 * - Buttons become an `inline_keyboard`; a tap arrives as a `callback_query` whose `data` (the
 *   button `value`, max 64 bytes per Telegram) is `inbound.text`.
 * - **Inbound updates require a one-time webhook registration the bond does
 *   not perform.** Call Telegram's `setWebhook` once with your public URL and
 *   `secret_token=CHANNEL_TELEGRAM_WEBHOOK_SECRET`:
 *   `https://api.telegram.org/bot<token>/setWebhook?url=<https-url>&secret_token=<secret>`.
 *   Outbound `sendMessage()` works without this.
 * - `verifyWebhookSignature()` compares the `X-Telegram-Bot-Api-Secret-Token`
 *   header against `CHANNEL_TELEGRAM_WEBHOOK_SECRET` and is FAIL-CLOSED: with
 *   no secret configured (or a secret never passed to `setWebhook`) every
 *   inbound update is rejected. Treat the secret as required whenever the app
 *   consumes inbound Telegram messages.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
