/**
 * GitHub Copilot Chat transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads the `chat.json` VS Code saves from "Chat: Export Chat…" (Command
 * Palette, or the chat view's ⋯ menu) into a normalized `AgentSession`: each
 * request as you typed it, each response's markdown, the model that answered,
 * and the files the response edited.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-copilot-chat'
 *
 * setProvider(provider)
 * const file = 'chat.json'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.harness, session.model) // 'GitHub Copilot Chat', 'copilot/…'
 * ```
 *
 * @remarks
 * - **The export is VS Code's, not Copilot's**, so any chat participant's
 *   export reads the same way. `harness` is `GitHub Copilot Chat` when the
 *   responder is Copilot, otherwise `VS Code Chat (<responder>)`.
 * - `model` on each reply is the request's `modelId` as VS Code records it
 *   (e.g. `copilot/gpt-5.3`); the session's `model` is set when every reply
 *   used the same one.
 * - Reply text is the response's markdown with inline file references
 *   written as `` `name` ``; thinking, tool-invocation and progress parts are
 *   not prose.
 * - Files: each `textEditGroup` part is an edit, its text the inserted text
 *   of every edit in the group. Requests VS Code started itself
 *   (`isSystemInitiated`) contribute their reply but no user turn; requests
 *   hidden from the transcript are skipped.
 * - Format verified 2026-09-29 against the VS Code source
 *   (`chatImportExport.ts`, `chatModel.ts` `toExport()`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './export.js'
export * from './provider.js'
