/**
 * AI assistant panel core interface for molecule.dev.
 *
 * Defines the `AIAssistantProvider` contract for a contextual AI side-panel:
 * panel open/close state, streaming chat (`sendMessage`), context items
 * (`setContext` — what the user is currently looking at), quick-action
 * suggestions, and session persistence. HEADLESS: the provider manages state
 * and streaming only — your app renders the panel UI from `getState()` /
 * `subscribe()`.
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` or `bond('ai-assistant', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
 *   both write the same slot; `requireProvider()` throws until one has run.
 * - **Messages go through YOUR backend, never an AI vendor directly.** The bundled
 *   bond (`@molecule/app-ai-assistant-default`) POSTs
 *   `{ message, systemContext?, context? }` to `config.endpoint` and reads an SSE
 *   stream of `data: <AssistantStreamEvent JSON>` lines
 *   (`text` / `thinking` / `suggestion` / `done` / `error`); `clearHistory` sends
 *   DELETE and `loadHistory` GETs the same endpoint. Your API implements that
 *   route and holds the AI provider key server-side (see `@molecule/api-ai`) —
 *   the browser never holds a vendor key.
 * - Render model output through a sanitizing markdown renderer — never inject it
 *   as raw HTML.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-assistant'
 * import { createProvider } from '@molecule/app-ai-assistant-default'
 *
 * setProvider(createProvider()) // at startup; same-origin base URL by default
 *
 * const assistant = requireProvider()
 * const config = { endpoint: '/api/assistant' }
 * const unsubscribe = assistant.subscribe((state) => renderPanel(state))
 * assistant.setContext([{ type: 'page', label: 'Invoices', value: '/invoices' }])
 * await assistant.sendMessage('Why is this invoice overdue?', config, (event) => {
 *   if (event.type === 'error') showError(event.message)
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Opening the panel (`open`/`toggle` → `getState().isOpen` is true) and
 *   sending a message through `sendMessage` renders the user turn immediately,
 *   then the assistant reply below it — both present in `getState().messages`.
 * - [ ] The reply STREAMS: `text` events append the assistant message
 *   progressively (token by token) while its `isStreaming` stays true, and
 *   `isStreaming` clears when the `done` event lands — not one atomic blob at
 *   the end.
 * - [ ] A stop/cancel control mid-stream calls `abort()` and actually halts the
 *   reply: the message stops growing and is marked `aborted`, not left spinning.
 * - [ ] A thinking/loading indicator driven by `getState().isLoading` shows
 *   while a response is in flight and clears once it settles — on `done` AND on
 *   `abort`.
 * - [ ] A provider failure surfaces `getState().error` (from the `error` stream
 *   event) as a visible message in the panel — never a blank or perpetually
 *   spinning panel.
 * - [ ] Suggestions from `getState().suggestions` render as chips, and clicking
 *   one sends THAT chip's own `action` string — the suggestion's wired message,
 *   not a generic prompt.
 * - [ ] Context set via `setContext` (the selected code / current page) is
 *   actually attached to the request so the answer is context-aware;
 *   `clearContext` drops it, and one user's context never bleeds into another
 *   user's session.
 * - [ ] Conversation history persists across turns and reloads — `loadHistory`
 *   rehydrates `getState().messages` and `clearHistory` empties the panel — and
 *   model output renders through the app's sanitizing markdown renderer, never
 *   as raw or executable HTML.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
