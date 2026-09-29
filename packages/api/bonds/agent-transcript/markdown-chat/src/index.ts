/**
 * Generic Markdown chat reader for `@molecule/api-agent-transcript`.
 *
 * The reader of last resort: a plain Markdown or text chat whose turns start
 * with a speaker marker — a heading (`## User` / `## Assistant`), a bold
 * label (`**User:** …`) or a plain label (`User: …`). Use it for chats saved
 * by hand, copied out of a chat web app, or written by a harness that has no
 * reader of its own.
 *
 * @example
 * ```typescript
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-markdown-chat'
 *
 * setProvider(provider)
 * const session = readTranscript({
 *   text: '**User:** Add a README.\n\n**Assistant:** Added README.md with a short overview.',
 *   fileName: 'chat.md',
 * })
 * // session.turns → [{ role: 'user', … }, { role: 'assistant', … }]
 * ```
 *
 * @remarks
 * - **Compose it last.** `@molecule/api-agent-transcript-autodetect` tries
 *   every harness reader first; this one only sees files none of them claimed.
 * - It still refuses anything without at least one user marker AND one
 *   assistant marker, so a document that merely mentions "User:" is not a chat.
 * - User names: User, Human, You, Me. Assistant names: Assistant, AI, Bot,
 *   Model, Agent, Claude, ChatGPT, GPT, Gemini, Copilot, Cursor. Case does not
 *   matter; a trailing colon is optional for headings.
 * - Only the style of the file's first marker splits turns, and markers
 *   inside fenced code blocks are ignored — so a `Model:` line in a reply
 *   does not break a chat written with `##` headings.
 * - A chat names no model, no times and no file writes; those fields stay
 *   empty. `harness` is `Markdown chat`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './chat.js'
export * from './provider.js'
