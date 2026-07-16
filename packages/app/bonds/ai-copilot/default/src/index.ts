/**
 * Default ai-copilot provider for molecule.dev — HTTP/SSE inline AI
 * suggestions from YOUR backend.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-ai-copilot'
 * import { createProvider } from '@molecule/app-ai-copilot-default'
 *
 * // There is NO pre-instantiated `provider` export in this package —
 * // wire the factory result:
 * setProvider(createProvider()) // at startup; same-origin base URL
 * // setProvider(createProvider({ baseUrl, headers })) to customize
 * ```
 *
 * @remarks
 * Server contract: `getSuggestions` POSTs `{ prefix, suffix, language,
 * filePath?, cursorLine?, cursorColumn?, model?, maxSuggestions?,
 * projectId? }` to `config.endpoint` and reads an SSE stream of
 * `data: <CopilotEvent JSON>` lines. `acceptSuggestion` /
 * `rejectSuggestion` POST `{ suggestionId, action: 'accept' | 'reject',
 * text?, metadata }` to `${config.endpoint}/feedback` — best-effort, errors
 * are swallowed, so implement the route (or expect silent no-ops).
 * `getSuggestions` auto-aborts the previous in-flight request; still call
 * `abort()` on keystrokes you debounce away (see `@molecule/app-ai-copilot`).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
