/**
 * Discord channel bond for molecule.dev.
 *
 * Implements the {@link ChannelProvider} interface defined by
 * `@molecule/api-channel`, posting outbound messages via Discord's REST
 * API and verifying inbound interaction webhooks against the
 * application's ed25519 public key.
 *
 * @example
 * ```typescript
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-discord'
 *
 * // Startup: bond under the name 'discord'. Bot token = outbound; public key = inbound verify.
 * setProvider(
 *   'discord',
 *   createProvider({
 *     botToken: process.env.CHANNEL_DISCORD_BOT_TOKEN,
 *     publicKey: process.env.CHANNEL_DISCORD_PUBLIC_KEY, // hex, from the Developer Portal
 *   }),
 * )
 *
 * const discord = requireProviderByName('discord')
 * // `to` is a Discord CHANNEL snowflake id (the bot must be in that server).
 * const sent = await discord.sendMessage('112233445566778899', {
 *   kind: 'rich',
 *   text: 'New signup: ada@example.com',
 *   buttons: [{ label: 'Approve', value: 'approve:user-123' }],
 * })
 * console.log(sent.messageId) // Discord message id
 *
 * // Interactions endpoint: verify the RAW body first, answer PING, then parse.
 * export function handleInteraction(headers: Record<string, string>, rawBody: string) {
 *   if (!discord.verifyWebhookSignature(headers, rawBody)) return { status: 401, body: 'bad signature' }
 *   const payload = JSON.parse(rawBody) as { type: number }
 *   if (payload.type === 1) return { status: 200, body: { type: 1 } } // Discord PING → PONG
 *   const inbound = discord.parseInbound(payload) // text = '/command' or the button's value
 *   return { status: 200, body: { type: 4, data: { content: `Got ${inbound.text}` } } }
 * }
 * ```
 *
 * @remarks
 * - **Not `bond('channel-discord', ...)`** — register with the channel core's
 *   `setProvider('discord', provider)` and fetch it with `requireProviderByName('discord')`.
 * - Env vars are `CHANNEL_DISCORD_BOT_TOKEN` and `CHANNEL_DISCORD_PUBLIC_KEY` (NOT
 *   `DISCORD_BOT_TOKEN`). They are read when the provider is CREATED; a missing token only
 *   throws on `sendMessage()`, a missing public key makes every `verifyWebhookSignature()` `false`.
 * - Outbound goes through Discord's REST API with the global `fetch` (no gateway / websocket):
 *   this bond cannot RECEIVE ordinary chat messages — inbound is interactions only (slash
 *   commands, button clicks) posted to your Interactions Endpoint URL.
 * - Button `value` becomes the component `custom_id`; a click arrives as `parseInbound().text`.
 * - Verify against the RAW request body string — re-serialized JSON fails the ed25519 check.
 *   You must reply to the interaction within 3 seconds (Discord's limit, not enforced here).
 * - A non-2xx REST response throws `Discord REST returned HTTP <status>` (token never included).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { ChannelProvider } from '@molecule/api-channel'

import { createProvider } from './provider.js'

let _provider: ChannelProvider | null = null

/**
 * Lazily-instantiated, default-configured Discord channel provider.
 *
 * The proxy defers construction until first use so importing this module
 * has no side effects (e.g. consuming env vars at import time).
 */
export const provider: ChannelProvider = new Proxy({} as ChannelProvider, {
  get(_target, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_target, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
