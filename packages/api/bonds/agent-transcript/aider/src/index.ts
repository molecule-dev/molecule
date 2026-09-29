/**
 * Aider transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads the chat history Aider keeps in every project it works in,
 * `.aider.chat.history.md`, into a normalized `AgentSession`: what you typed,
 * what the model replied, the model Aider announced, and the files its edits
 * wrote.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-aider'
 *
 * setProvider(provider)
 * const file = '.aider.chat.history.md'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.model, session.turns.length)
 * ```
 *
 * @remarks
 * - **One file holds every session run in that directory**, each opened by a
 *   `# aider chat started at …` line. `read()` returns them all as one
 *   session in file order; `startedAt` is the first one's start, in the local
 *   time Aider wrote (no zone).
 * - Slash commands you typed (`/add`, `/run` …) are not turns; neither is
 *   Aider's own output (the `>` lines: announcements, token counts, commits).
 * - The model comes from Aider's announcement (`Model:` / `Main model:`), and
 *   applies to every reply after it until the next announcement.
 * - Files: every `Applied edit to <path>` Aider reports, with the text from
 *   the reply's SEARCH/REPLACE block for that path (an empty SEARCH is a new
 *   file), or the fenced block under the path in the `whole` edit format.
 *   When neither is found the write is listed with `complete: false`.
 * - Aider's own lines end in two spaces; that is what separates them from a
 *   `>` quote or `####` heading inside a reply. A history file edited by hand
 *   that lost those spaces reads the edited lines as part of the reply.
 * - Format verified 2026-09-29 against the Aider source (`aider/io.py`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './history.js'
export * from './provider.js'
