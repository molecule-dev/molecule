/**
 * Provider-agnostic outbound messaging channel interface for molecule.dev.
 *
 * Defines the {@link ChannelProvider} interface shared by every channel
 * bond (Slack, Discord, WhatsApp, Telegram, Facebook Messenger, …) and
 * normalized message types (`OutboundMessage`, `SendResult`,
 * `InboundMessage`, `ChannelFeatures`).
 *
 * Channels are a **named-multi-provider** bond category: an app typically
 * has more than one outbound channel wired up at once, so providers are
 * registered under distinct names (`'slack'`, `'discord'`, …) using the
 * named overload of `bond()`. A singleton fallback is supported for apps
 * that only use one channel.
 *
 * @example
 * ```typescript
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import { createProvider as createDiscord } from '@molecule/api-channel-discord'
 * import { createProvider as createSlack } from '@molecule/api-channel-slack'
 *
 * // Startup (server only): bond EVERY channel the app uses, each under its own name.
 * setProvider('slack', createSlack({ botToken: process.env.SLACK_BOT_TOKEN }))
 * setProvider('discord', createDiscord({ botToken: process.env.CHANNEL_DISCORD_BOT_TOKEN }))
 *
 * // Anywhere: address the channel BY NAME; recipient ids are channel-native.
 * const slack = requireProviderByName('slack')
 * const sent = await slack.sendMessage('C0123ABCD', { kind: 'text', text: 'Deploy finished ✅' })
 * console.log(sent.messageId, sent.deliveredAt instanceof Date) // '1714000000.000100' true
 *
 * // Gate rich content on what the channel supports; fall back to text.
 * const discord = requireProviderByName('discord')
 * const alert = 'New signup: ada@example.com'
 * await discord.sendMessage(
 *   '112233445566778899',
 *   discord.listSupportedFeatures().buttons
 *     ? { kind: 'rich', text: alert, buttons: [{ label: 'Open', value: 'open-admin' }] }
 *     : { kind: 'text', text: alert },
 * )
 * ```
 *
 * @remarks
 * - **In a multi-channel app, always address channels BY NAME**
 *   (`requireProviderByName('slack')`). The first `setProvider(name, provider)`
 *   call also becomes the singleton fallback — and STAYS the singleton — so a bare
 *   `requireProvider()` in an app with several channels silently sends via
 *   whichever channel happened to register first.
 * - **Gate rich content on `listSupportedFeatures()`.** Providers differ on
 *   buttons/media/threads and MAY silently drop unsupported attachment kinds —
 *   check the features (or fall back to `{ kind: 'text' }`) rather than assuming.
 * - **Recipient ids are channel-native** (a Slack channel id, a Discord channel id,
 *   a WhatsApp phone number) — store them per channel; they are not
 *   interchangeable across providers.
 * - **Tokens stay server-side.** Each bond documents its own secret env vars; never
 *   send from the browser.
 * - The send method is `sendMessage(to, message)` — `message.kind` (`'text' | 'rich' |
 *   'media'`) is REQUIRED; there is no `send()`/`post()`. It resolves to
 *   `{ messageId, deliveredAt }` and THROWS when the provider rejects the send (bad token,
 *   unknown channel) — the error message never contains the token.
 * - Inbound webhooks: call `verifyWebhookSignature(headers, rawBody)` on the RAW request
 *   body BEFORE `parseInbound(payload)`; a provider whose `signedWebhooks` feature is
 *   `false` cannot authenticate the sender this way.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Each channel-notifying flow the app defines (a Slack/Discord alert on
 *   a new order, a status-change message) actually produces a message. The
 *   sandbox CAPTURES channel messages instead of sending — read them with the
 *   `read_activity` tool (filter type 'channel'); never mock the flow or
 *   modify production code to expose the message.
 * - [ ] The captured message targets the configured channel/provider name and
 *   carries the app's real content (readable text, no `undefined`
 *   placeholders, no secrets).
 * - [ ] A failed send (unbonded or misconfigured provider) is visible in
 *   logs/UI — never silently swallowed.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
