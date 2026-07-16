/**
 * Default AI assistant provider for molecule.dev.
 *
 * Uses HTTP/SSE to stream assistant replies from YOUR backend, with
 * built-in panel state management and context awareness.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-ai-assistant'
 * import { provider } from '@molecule/app-ai-assistant-default'
 *
 * setProvider(provider) // at startup; same-origin base URL
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
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
