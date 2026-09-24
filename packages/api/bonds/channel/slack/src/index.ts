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
 * import { requireProviderByName, setProvider } from '@molecule/api-channel'
 * import { createProvider } from '@molecule/api-channel-slack'
 *
 * // Startup: bond under the name 'slack'. Bot token = outbound; signing secret = inbound verify.
 * setProvider(
 *   'slack',
 *   createProvider({
 *     botToken: process.env.SLACK_BOT_TOKEN, // xoxb-…, scope chat:write
 *     signingSecret: process.env.SLACK_SIGNING_SECRET,
 *   }),
 * )
 * const slack = requireProviderByName('slack')
 *
 * // `to` is a Slack channel id (C…), not '#name'. The bot must be a member of the channel.
 * const sent = await slack.sendMessage('C0123ABCD', { kind: 'text', text: 'Deploy finished ✅' })
 * // Reply in a thread: thread_id is the parent's messageId (its Slack `ts`).
 * await slack.sendMessage('C0123ABCD', {
 *   kind: 'text',
 *   text: '12 files changed',
 *   thread_id: sent.messageId,
 * })
 *
 * // Events API route: verify the RAW body, answer Slack's URL check, then parse.
 * export function handleSlackEvent(headers: Record<string, string>, rawBody: string) {
 *   if (!slack.verifyWebhookSignature(headers, rawBody)) return { status: 401, body: '' }
 *   const payload = JSON.parse(rawBody) as { type: string; challenge?: string }
 *   if (payload.type === 'url_verification') return { status: 200, body: payload.challenge }
 *   const inbound = slack.parseInbound(payload) // { from: 'U…', text, thread_id?, payload }
 *   console.log(`${inbound.from} said ${inbound.text}`)
 *   return { status: 200, body: '' }
 * }
 * ```
 *
 * @remarks
 * - **Not `bond('channel-slack', ...)`** — register with the channel core's
 *   `setProvider('slack', provider)`. Env vars are `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`.
 *   The exported `provider` reads them at IMPORT time — use `createProvider()` after secrets load.
 * - A missing bot token throws on the first `sendMessage()`; `ok: false` from Slack
 *   (`not_in_channel`, `channel_not_found`, …) throws `Slack chat.postMessage failed: <error>`.
 * - `parseInbound()` does NOT handle `url_verification` (it throws) — answer that challenge
 *   yourself, as above. Slash commands may be passed as the raw form string or parsed object.
 * - `verifyWebhookSignature()` needs the RAW body and rejects timestamps older than
 *   `signatureToleranceSeconds` (default 300, SECONDS) — replay protection.
 * - `inbound.channel` is always `'slack'`, not the room: the Slack channel id to reply to is in
 *   `inbound.payload.event.channel`.
 * - Tokens are deliberately scrubbed from any error this provider raises;
 *   upstream stack traces that contain a token are still possible if a
 *   higher layer re-throws without going through this bond.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
