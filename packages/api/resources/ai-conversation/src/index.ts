/**
 * Per-project AI chat conversation resource for molecule.dev.
 *
 * Persists ONE conversation per project (messages + AI context as JSONB) and
 * exposes a streaming chat endpoint plus history/clear, nested under
 * `/projects/:projectId/chat`. The chat handler resolves the bonded AI
 * provider, streams the assistant reply to the client as Server-Sent Events,
 * and appends both sides to the stored message log.
 *
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-ai-conversation'
 *
 * // Wired by mlcl inject:
 * // POST   /projects/:projectId/chat   — send a message, reply streams via SSE
 * // GET    /projects/:projectId/chat   — conversation history
 * // DELETE /projects/:projectId/chat   — clear the conversation
 * ```
 *
 * @remarks
 * - **Two prerequisites this package does not create.** (1) An AI provider must
 *   be bonded before the first chat request (wire an `@molecule/api-ai-*` bond,
 *   e.g. `bond('ai', 'anthropic', provider)`, in `bonds.ts`) — the handler uses
 *   the `@molecule/api-ai` accessor and fails without one. (2) A `projects`
 *   table with a `userId` column must exist: `src/__setup__/conversations.sql`
 *   declares `projectId REFERENCES "projects"("id")`, so apply
 *   `@molecule/api-resource-project`'s migration FIRST, then this package's.
 * - **Keep `authUser` in `requestHandlerMap`.** All three routes are gated by the
 *   `authUser` object-level authorizer, which authenticates AND verifies the
 *   caller owns `:projectId` (403 otherwise, existence not leaked). Route codegen
 *   keeps only middlewares that are keys of `requestHandlerMap` — removing the
 *   entry ships these routes UNGATED: anonymous AI-cost abuse plus cross-tenant
 *   reads. The handlers also re-check ownership inline; keep that too.
 * - **The chat response is `text/event-stream`.** The client must consume SSE
 *   (the `@molecule/app-ai-chat-http` bond does); a plain JSON fetch appears to
 *   hang. Don't put a buffering proxy in front without SSE passthrough.
 * - One conversation row per project — history accumulates in a JSONB `messages`
 *   array; `DELETE …/chat` resets it. There is no per-message CRUD.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
