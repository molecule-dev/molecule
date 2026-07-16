/**
 * Telegram channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the Telegram Bot API. Bond under the named-multi-provider
 * `'channel'` category at app startup:
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-telegram'
 *
 * setProvider('telegram', provider)
 * ```
 *
 * @remarks
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
