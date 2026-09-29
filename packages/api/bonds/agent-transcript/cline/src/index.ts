/**
 * Cline and Roo Code transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads a task's `ui_messages.json` — the chat history Cline and Roo Code
 * keep per task in the extension's storage — into a normalized
 * `AgentSession`: the task and your replies, the agent's messages, questions
 * and plans, and the files it created or edited.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-cline'
 *
 * setProvider(provider)
 * // e.g. ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/<taskId>/ui_messages.json
 * const file = 'ui_messages.json'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.harness, session.turns.length) // 'Cline' or 'Roo Code'
 * ```
 *
 * @remarks
 * - **Read `ui_messages.json`, not `api_conversation_history.json`.** The
 *   second is the raw provider history, with injected environment details and
 *   tool results inside the user messages; it is not recognized here.
 * - `harness` is `Cline` when the file has Cline's `task` message, otherwise
 *   `Roo Code` (Roo records the task as its first `text` message).
 * - The UI messages name no model, so `model` is unset.
 * - Files: `newFileCreated` is the whole file; `editedExistingFile` and Roo's
 *   `appliedDiff` contribute each SEARCH/REPLACE block's replacement (Cline's
 *   `------- SEARCH` / `+++++++ REPLACE` and `*** Begin Patch` forms, and the
 *   `<<<<<<< SEARCH` / `>>>>>>> REPLACE` form Roo uses). An edit whose diff
 *   cannot be read is listed with `complete: false`. The approval (`ask`)
 *   and the result (`say`) of one edit count once.
 * - Streaming fragments (`partial: true`) are skipped.
 * - Format verified 2026-09-29 against the Cline and Roo Code sources
 *   (`ExtensionMessage.ts`, `packages/types/src/message.ts`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './ui-messages.js'
