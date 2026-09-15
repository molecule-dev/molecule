/**
 * HTTP/SSE AI chat provider for molecule.dev.
 *
 * @remarks
 * POSTs each message to YOUR backend chat endpoint (`config.endpoint`, a RELATIVE path like
 * `/api/ai/chat` on the app's `baseUrl`) and reads the reply as an SSE stream — it does NOT talk
 * to an AI provider directly and holds NO AI key. Point `endpoint` at your own API, where the
 * provider key + `@molecule/api-ai` live; auth rides the session via the HTTP client
 * (cookie/bearer), so never attach a provider key or an absolute AI-provider URL here. See
 * `@molecule/app-ai-chat` for the safe-render rules.
 *
 *
 * Server contract (all on the ONE `config.endpoint` route): POST
 * `{ message, model?, attachments?, resume?, suppressUserMessage?,
 * automatic?, userInitiated? }` → SSE `data: <ChatStreamEvent JSON>` lines;
 * GET → `{ messages, streaming? }` plus any app-specific top-level fields (this
 * bond only reads `messages` + `streaming`; every other field rides through in
 * `provider.lastMeta` — e.g. an app that persists an agent `mode` reads it back as
 * `provider.lastMeta?.mode`); DELETE → clear history. Two conventions beyond
 * that route: a POST answered `409` means "conversation locked, still
 * streaming" — this bond retries automatically (up to 10 tries, 500 ms
 * doubling backoff) so return 409 rather than erroring; and Stop/unload
 * aborts POST to `<endpoint>-abort` (suffix on the pathname, query kept)
 * with `{ conversationId?, userInitiated? }` via sendBeacon.
 * `abortOnServer()`, `isServerStreaming`, and `lastMeta` are extensions on
 * `HttpChatProvider` beyond the core `ChatProvider` type. `loadHistory()`
 * returns `[]` on HTTP errors but REJECTS on network failure; wrap it.
 *
 * A non-ok response becomes an `error` event, and a JSON body's `error`,
 * `limitType`, `requiresSignup`, `billingAction` and `upgradeTier` are copied
 * onto it — so a limit refusal (402/429/403) reaches the UI with both the rule
 * that fired (`limitType`) and the remedy the backend resolved
 * (`billingAction`, e.g. `add_funds` vs `add_payment_method` vs `upgrade`,
 * with `upgradeTier: null` meaning there is no higher plan). Send those fields
 * from your API and the client's call-to-action is yours to decide; omit them
 * and the client can only guess.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
