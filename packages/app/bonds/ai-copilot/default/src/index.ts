/**
 * Default ai-copilot provider for molecule.dev — HTTP/SSE inline AI
 * suggestions from YOUR backend.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-copilot'
 * import type { CopilotSuggestion } from '@molecule/app-ai-copilot'
 * import { createProvider } from '@molecule/app-ai-copilot-default'
 *
 * // Startup: bond once. `baseUrl` '' (default) = same origin; the AI key stays on YOUR API.
 * setProvider(createProvider({ baseUrl: '', headers: { 'X-Client': 'editor' } }))
 *
 * // In the editor: request inline suggestions for the text around the cursor.
 * const copilot = requireProvider()
 * const config = { endpoint: '/api/ai/copilot', maxSuggestions: 3 }
 * const context = { prefix: 'function add(a: number, b: number) {\n  ', suffix: '\n}', language: 'typescript' }
 *
 * const suggestions: CopilotSuggestion[] = []
 * await copilot.getSuggestions(context, config, (event) => {
 *   if (event.type === 'suggestion') suggestions.push(event.suggestion)
 *   if (event.type === 'suggestions') suggestions.push(...event.suggestions)
 *   if (event.type === 'error') console.error(event.message)
 * })
 *
 * // User pressed Tab: insert suggestions[0].text, then report it (POSTs `${endpoint}/feedback`).
 * const accepted = suggestions[0]
 * if (accepted) await copilot.acceptSuggestion(accepted, config)
 * ```
 *
 * @remarks
 * The core exports no top-level `getSuggestions()` — call it on `requireProvider()` after
 * `setProvider(...)`. The bare `provider` export is `createProvider()` with no options, so use
 * `createProvider({ baseUrl, headers })` when your API is on another origin or needs a header.
 * `getSuggestions` resolves when the stream ends and returns nothing — collect `suggestion` /
 * `suggestions` events yourself; HTTP failures arrive as `error` events, never as rejections.
 *
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
