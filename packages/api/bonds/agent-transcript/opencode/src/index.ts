/**
 * OpenCode transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads a session exported with `opencode export [sessionID] > session.json`
 * into a normalized `AgentSession`: what you typed, the replies with the
 * model that wrote each, and the files the `write`, `edit` and
 * `apply_patch` tools wrote.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-opencode'
 *
 * setProvider(provider)
 * // opencode export ses_01k… > session.json
 * const file = 'session.json'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.model, session.harnessVersion)
 * ```
 *
 * @remarks
 * - **Export with `opencode export`, not from the storage directory.** The
 *   export is one JSON object holding the session and every message with its
 *   parts; OpenCode's on-disk storage splits them across many files.
 * - `--sanitize` exports read the same way; only the redacted strings differ.
 * - User turns leave out `synthetic` parts (file contents OpenCode attaches
 *   for an `@file` mention) and `ignored` parts.
 * - `model` on each reply is its `modelID`; the session's `model` is set when
 *   every reply used the same one. `harnessVersion` is the session's
 *   `version`.
 * - Files: only tool calls whose state is `completed` count — `write` is the
 *   whole file, `edit` its `newString`, `apply_patch` each added file whole
 *   and each update's added lines.
 * - Format verified 2026-09-29 against the OpenCode source
 *   (`packages/schema/src/v1/session.ts`, `cli/cmd/export.ts`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './export.js'
export * from './provider.js'
