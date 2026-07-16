/**
 * Facebook Messenger channel provider for molecule.dev.
 *
 * Implements the framework-agnostic {@link ChannelProvider} interface
 * over the Messenger Send API and webhook envelope. Bond under the
 * named-multi-provider `'channel'` category at app startup:
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { provider } from '@molecule/api-channel-messenger'
 *
 * setProvider('messenger', provider)
 * ```
 *
 * @remarks
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
