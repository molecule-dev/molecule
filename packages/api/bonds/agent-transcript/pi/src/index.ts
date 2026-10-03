/**
 * Pi transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads a session recorded by Pi (`@earendil-works/pi-coding-agent`) into a
 * normalized `AgentSession`: what you typed, the replies with the model that
 * wrote each, and the files the `write` and `edit` tools wrote. It reads both
 * Pi's session files and the stream `pi --mode json` prints.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-pi'
 *
 * setProvider(provider)
 * // ~/.pi/agent/sessions/--home-me-app--/2026-10-03T10-15-34-739Z_01a10143-….jsonl
 * const file = 'session.jsonl'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.model, session.turns.length)
 * ```
 *
 * @remarks
 * - **Session files live in `~/.pi/agent/sessions/--<path>--/`** (or
 *   `PI_CODING_AGENT_SESSION_DIR` / `--session-dir`), one `.jsonl` per
 *   session. A run with `--no-session` writes no file — capture its
 *   `pi --mode json` stdout instead; this reader takes that too.
 * - **Only the active branch is read.** Pi stores every branch in one file
 *   (entries link by `parentId`); the conversation is the branch that ends at
 *   the file's last entry. Turns on abandoned branches (`/tree`, `/fork`) are
 *   not in the session.
 * - Compaction does not hide anything: every message on the branch is read,
 *   including the ones a compaction summarized away from the model's context.
 * - Files: a `write` call is the whole file; an `edit` call contributes each
 *   `edits[].newText` as a separate edit (Pi also accepts `edits` as a JSON
 *   string or a single object, and older sessions carry `oldText`/`newText`
 *   at the top level — all read). A call counts only when its tool result is
 *   in the session and is not an error. Paths are as the model wrote them,
 *   absolute or relative to the session's `cwd`. `bash` commands that write
 *   files are not tracked.
 * - `model` on each reply is Pi's model id (e.g. `claude-sonnet-5-5`, without
 *   the provider); the session's `model` is set when every reply used the
 *   same one. Pi records no harness version, so `harnessVersion` is unset.
 * - Images in user messages, system messages (Pi persists the system prompt
 *   as a message), extension messages and direct `!bash` executions are not
 *   turns.
 * - Format verified 2026-10-03 against Pi 1.0.0 (`docs/session-format.md`,
 *   `docs/message-types.md`, `docs/json.md`, `src/core/tools/edit.ts`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './session.js'
