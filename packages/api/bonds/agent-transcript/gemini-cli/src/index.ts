/**
 * Gemini CLI transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads Gemini CLI's saved sessions into a normalized `AgentSession`: the
 * session log it writes as you work (`~/.gemini/tmp/<project>/chats/session-*.jsonl`),
 * the older one-object session file (`session-*.json`), and the checkpoint
 * `/chat save <tag>` writes (`checkpoint-<tag>.json`).
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-gemini-cli'
 *
 * setProvider(provider)
 * const file = 'session-2026-09-29T10-00-a1b2c3d4.jsonl'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.model, session.turns.length)
 * ```
 *
 * @remarks
 * - **The session log and session file name the model on every reply**
 *   (`model`) and time every message; a `/chat save` checkpoint names neither.
 * - The log is replayed the way Gemini CLI reloads it: a `$set.messages`
 *   checkpoint replaces what came before, and `$rewindTo` drops the named
 *   message and everything after it — so a rewound branch is not in the result.
 * - Left out of user turns: slash commands (`/…`), help queries (`?…`) and
 *   injected context (`<session_context>`, `<hook_context>`), plus the
 *   model's reply to injected context in a checkpoint. `info`, `error` and
 *   `warning` records are the CLI's own notices and are left out too.
 * - A user message shows as typed (`displayContent`) when the log keeps it,
 *   not the version with `@file` contents expanded.
 * - Files: successful `write_file` calls are whole files; successful
 *   `replace` calls contribute their `new_string`.
 * - Format verified 2026-09-29 against the gemini-cli source
 *   (`packages/core/src/services/chatRecordingTypes.ts`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './session.js'
