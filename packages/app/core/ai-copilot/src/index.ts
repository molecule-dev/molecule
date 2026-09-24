/**
 * Inline AI suggestion (copilot) core interface for molecule.dev.
 *
 * Defines the `AICopilotProvider` contract for editor-style inline completions:
 * `getSuggestions(context, config, onEvent)` streams suggestions for a
 * prefix/suffix cursor context; `acceptSuggestion` / `rejectSuggestion` report
 * the user's choice back to your API; `abort()` cancels the in-flight request.
 * HEADLESS: your editor integration renders and inserts the suggestion text.
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` or `bond('ai-copilot', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
 *   both write the same slot; `requireProvider()` throws until one has run.
 * - **Suggestions come from YOUR backend** (`config.endpoint`), which calls the
 *   AI provider server-side (see `@molecule/api-ai`) — no vendor key in the
 *   browser.
 * - **Debounce keystrokes and `abort()` before every new request.** An
 *   un-aborted stale request races the fresh one and inserts outdated text at
 *   the wrong cursor position.
 * - **`getSuggestions` resolves `void` — suggestions arrive ONLY via `onEvent`**, either
 *   one at a time (`type: 'suggestion'`) or as a batch (`type: 'suggestions'`); handle both.
 *   `acceptSuggestion` / `rejectSuggestion` only REPORT feedback (POST
 *   `${endpoint}/feedback` in the default bond) — they do not insert text; your editor does.
 * - Suggested text is MODEL OUTPUT — insert it as plain text; never execute or
 *   eval it, and validate anything it triggers server-side.
 *
 * @example
 * ```typescript
 * import type { CopilotSuggestion } from '@molecule/app-ai-copilot'
 * import { requireProvider, setProvider } from '@molecule/app-ai-copilot'
 * import { createProvider } from '@molecule/app-ai-copilot-default'
 *
 * // Startup: bond once. `baseUrl` '' (default) = same origin as the app.
 * setProvider(createProvider({ baseUrl: '' }))
 *
 * // On a (debounced) keystroke: split the editor text at the cursor.
 * const text = 'function add(a: number, b: number) {\n  '
 * const cursor = text.length
 * const copilot = requireProvider()
 * const config = { endpoint: '/api/copilot' }
 *
 * let ghost: CopilotSuggestion | undefined
 * copilot.abort() // cancel any stale request before asking again
 * await copilot.getSuggestions(
 *   { prefix: text.slice(0, cursor), suffix: text.slice(cursor), language: 'typescript' },
 *   config,
 *   (event) => {
 *     if (event.type === 'suggestion') ghost = event.suggestion // render as ghost text
 *     if (event.type === 'error') console.error(event.message)
 *   },
 * )
 *
 * // User pressed Tab: insert `ghost.text` at the cursor, then report it.
 * if (ghost) await copilot.acceptSuggestion(ghost, config) // POSTs `${endpoint}/feedback`
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Typing in the editor fires `getSuggestions(context, config, onEvent)`
 *   and the returned `CopilotSuggestion.text` renders as ghost/inline text
 *   anchored to the suggestion's `range` (CopilotRange) — or the caret when
 *   `range` is omitted — never at a stale or wrong offset.
 * - [ ] Accepting the suggestion (e.g. Tab) inserts EXACTLY `suggestion.text`
 *   at that `range`/caret and nothing stale, and fires
 *   `acceptSuggestion(suggestion, config)`; the buffer holds only the accepted
 *   text with no leftover ghost preview.
 * - [ ] Continuing to type or explicitly dismissing removes the ghost cleanly
 *   and calls `abort()` so the in-flight request is cancelled before the next
 *   `getSuggestions` — a late-arriving stale suggestion never lands at the
 *   moved cursor, and `rejectSuggestion(suggestion, config)` reports the miss.
 * - [ ] The suggestion is context-aware, not generic: it reflects the real
 *   `CopilotContext` (`prefix`/`suffix`/`language` around the cursor), so
 *   editing the surrounding code visibly changes what gets proposed.
 * - [ ] With copilot disabled (no provider bonded, or the app's config/toggle
 *   off) no ghost text ever appears and typing stays completely unaffected.
 * - [ ] A provider error (an `onEvent` `{ type: 'error' }`) fails quietly — no
 *   ghost text, no thrown exception in the editor, the buffer is untouched, and
 *   the user can keep typing.
 * - [ ] Correctness/security: accepted text is inserted ONLY at the intended
 *   `CopilotRange` (it never overwrites unrelated lines), and `suggestion.text`
 *   is treated as plain model output — inserted as text, never eval'd or run as
 *   trusted code by the copilot itself.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
