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
 * @module
 */

export * from './provider.js'
export * from './types.js'
