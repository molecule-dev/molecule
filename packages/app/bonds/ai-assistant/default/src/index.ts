/**
 * Default AI assistant provider for molecule.dev.
 *
 * Uses HTTP/SSE to stream assistant replies from YOUR backend, with
 * built-in panel state management and context awareness.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-assistant'
 * import { createProvider } from '@molecule/app-ai-assistant-default'
 *
 * // Startup: bond once. `baseUrl` '' (default) = same origin as the app.
 * const sessionToken = 'user-session-jwt'
 * setProvider(createProvider({ baseUrl: '', headers: { Authorization: `Bearer ${sessionToken}` } }))
 *
 * // Anywhere: drive the panel through the core provider.
 * const assistant = requireProvider()
 * const config = { endpoint: '/api/assistant', systemContext: 'User is on the billing page.' }
 *
 * const unsubscribe = assistant.subscribe((state) => {
 *   console.log(state.isLoading, state.messages.length) // re-render your panel here
 * })
 * assistant.open(config)
 * await assistant.sendMessage('How do I upgrade my plan?', config, (event) => {
 *   if (event.type === 'error') console.error(event.message)
 * })
 *
 * const reply = assistant.getState().messages.at(-1)?.content // the streamed assistant text
 * unsubscribe()
 * ```
 *
 * @remarks
 * HEADLESS — manages panel state + streaming only; your app renders the
 * panel from `getState()` / `subscribe()`. Talks to YOUR backend at
 * `config.endpoint` (relative path on `baseUrl`, default same-origin) — it
 * holds no AI key. Your API must implement, on that one endpoint:
 * - POST `{ message, systemContext?, context? }` → an SSE stream of
 *   `data: <AssistantStreamEvent JSON>` lines (`text` / `thinking` /
 *   `suggestion` / `done` / `error`),
 * - GET → `{ messages: [...] }` (loadHistory; fails open to `[]` on any
 *   error), and DELETE → clear history (best-effort; local state clears
 *   even if it fails).
 * The bare `provider` export is `createProvider()` with no options — to set
 * `baseUrl`/`headers`, wire `setProvider(createProvider({ ... }))` instead.
 * `sendMessage` aborts any previous in-flight stream automatically.
 * The core exports no top-level `open()`/`sendMessage()` helpers — call them
 * on `requireProvider()`, and pass the same `AIAssistantConfig` (with its
 * required `endpoint`) to every call; the provider does not remember it.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
