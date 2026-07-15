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
 * import { setProvider, requireProviderByName } from '@molecule/api-channel'
 * import { provider as slack } from '@molecule/api-channel-slack'
 * import { provider as discord } from '@molecule/api-channel-discord'
 *
 * // App startup: bond every channel the app uses.
 * setProvider('slack', slack)
 * setProvider('discord', discord)
 *
 * // Anywhere: pick the channel by name.
 * const ch = requireProviderByName('slack')
 * await ch.sendMessage('C123', { kind: 'text', text: 'hello' })
 * ```
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
