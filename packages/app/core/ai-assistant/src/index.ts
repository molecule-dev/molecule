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
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-assistant', …)`.**
 *   This core keeps its own local singleton and does not read the
 *   `@molecule/app-bond` registry; `requireProvider()` throws until
 *   `setProvider()` has run.
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
 * @module
 */

export * from './provider.js'
export * from './types.js'
