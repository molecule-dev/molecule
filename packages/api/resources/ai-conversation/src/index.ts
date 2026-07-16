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
 * @e2e
 * Integration checklist — drive the real UI (the project's chat panel via live
 * preview, no mocks), adapt each item to this app's actual screens, and check
 * every box off one by one. A box you can't check is an integration bug to fix,
 * not a skip. This resource is the STORAGE of chat history (one `conversations`
 * row per project, a `messages` JSONB array) — the reply text itself comes from
 * the bonded `@molecule/api-ai` provider, so verify the transcript + privacy
 * here, not generation quality:
 * - [ ] Sending a message from the chat UI persists BOTH sides in order: the
 *   `POST /projects/:projectId/chat` appends the user turn (`role: 'user'`, your
 *   exact `content`), then after the SSE stream ends appends the assistant turn
 *   (`role: 'assistant'`, the streamed text). The first message auto-creates the
 *   conversation row for that project.
 * - [ ] Reloading the project (`GET /projects/:projectId/chat`) shows the FULL
 *   transcript in send order across several back-and-forth exchanges — every
 *   user/assistant turn present, none lost, dropped, or reordered.
 * - [ ] Clearing the chat (`DELETE /projects/:projectId/chat`) deletes the
 *   conversation: history immediately returns `{ messages: [] }` and the row is
 *   not re-fetchable (there is no archive/undo — clear removes it). Sending a
 *   new message afterward starts a fresh conversation from empty.
 * - [ ] If token usage is surfaced, each assistant response records its
 *   `inputTokens`/`outputTokens` (the `conversation.ai_response` analytics
 *   event) — usage is tracked per response, not accumulated on the row.
 * - [ ] AUTHORIZATION / PRIVACY — chat history is strictly per project owner. A
 *   second user hitting another user's `:projectId` (send, history, OR clear)
 *   gets `403`, indistinguishable from "no such project" so existence isn't
 *   leaked, and never sees or clears that chat. The owner is the authenticated
 *   session (the project is looked up scoped to `session.userId`), NEVER a
 *   request-body `userId` — forging one changes nothing. Chat content (which may
 *   be sensitive) is never returned cross-user or logged in the clear.
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
