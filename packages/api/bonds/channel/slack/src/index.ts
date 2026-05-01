/**
 * Slack channel bond for molecule.dev.
 *
 * Implements the {@link ChannelProvider} interface from
 * `@molecule/api-channel` on top of `@slack/web-api`. Used by apps that
 * post into Slack channels (notifications, AI bot replies, helpdesk
 * announcements) and consume inbound Slack events (message events,
 * `app_mention`, slash commands) via signed webhooks.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-slack'
 *
 * setProvider(
 *   'slack',
 *   createProvider({
 *     botToken: process.env.SLACK_BOT_TOKEN,
 *     signingSecret: process.env.SLACK_SIGNING_SECRET,
 *   }),
 * )
 * ```
 *
 * @remarks
 * Tokens are deliberately scrubbed from any error this provider raises;
 * upstream stack traces that contain a token are still possible if a
 * higher layer re-throws without going through this bond.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
