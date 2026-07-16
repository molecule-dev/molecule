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
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-copilot', …)`.**
 *   This core keeps its own local singleton and does not read the
 *   `@molecule/app-bond` registry; `requireProvider()` throws until
 *   `setProvider()` has run.
 * - **Suggestions come from YOUR backend** (`config.endpoint`), which calls the
 *   AI provider server-side (see `@molecule/api-ai`) — no vendor key in the
 *   browser.
 * - **Debounce keystrokes and `abort()` before every new request.** An
 *   un-aborted stale request races the fresh one and inserts outdated text at
 *   the wrong cursor position.
 * - Suggested text is MODEL OUTPUT — insert it as plain text; never execute or
 *   eval it, and validate anything it triggers server-side.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-copilot'
 * import { createProvider } from '@molecule/app-ai-copilot-default'
 *
 * setProvider(createProvider()) // at startup
 *
 * const copilot = requireProvider()
 * copilot.abort() // cancel any stale request before asking again
 * await copilot.getSuggestions(
 *   { prefix: textBeforeCursor, suffix: textAfterCursor, language: 'typescript' },
 *   { endpoint: '/api/copilot' },
 *   (event) => {
 *     if (event.type === 'suggestion') showGhostText(event.suggestion.text)
 *   },
 * )
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
