/**
 * AI chat core interface for molecule.dev.
 *
 * @remarks
 * Chat runs through YOUR backend, not the AI provider directly. Bond a chat provider (e.g.
 * `@molecule/app-ai-chat-http`) pointed at your API's chat endpoint; the frontend sends
 * messages there and streams the reply over SSE. The AI provider API key lives ONLY in your API
 * (see `@molecule/api-ai`) — the browser NEVER calls Anthropic/OpenAI directly or holds a
 * provider key, which would ship the key to every user.
 *
 * - **Render model output safely.** Never `dangerouslySetInnerHTML` / `v-html` a raw model
 *   response — a model (or an injected prompt) can emit `<script>`/HTML. Render markdown through
 *   a sanitizing renderer.
 * - Model output is UNTRUSTED (see api-ai): a tool call or action it suggests must be authorized
 *   + validated server-side, never auto-executed from the client.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Sending a message renders it in the thread and a streamed assistant
 *   reply appears incrementally (visible tokens while generating — not a
 *   frozen UI that dumps one blob).
 * - [ ] The reply flows through the app's OWN backend: the browser's network
 *   log shows no direct calls to an AI provider and no provider key anywhere
 *   client-side.
 * - [ ] Model output renders as sanitized markdown — a reply containing HTML
 *   or `<script>` displays as text and never executes.
 * - [ ] If the app claims conversation persistence, reloading restores the
 *   thread history.
 * - [ ] A backend failure (endpoint down, missing API key) surfaces a readable,
 *   actionable error — not an infinite spinner.
 * - [ ] Sending again while a reply streams is handled sanely (queued, blocked,
 *   or parallel — never corrupted/interleaved text).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
