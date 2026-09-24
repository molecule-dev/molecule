/**
 * Codex CLI transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads both forms of a Codex CLI session into a normalized `AgentSession`:
 * the rollout log Codex keeps at `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`
 * (per-turn model, timestamps, and every file its `apply_patch` wrote), and
 * the Markdown file its `/export` → "Save to file" writes (`# Codex
 * conversation`, then `## User` / `## Assistant` / `## Activity` sections).
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 *
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-codex'
 *
 * // Startup: bond this reader through the transcript core.
 * setProvider(provider)
 *
 * // A rollout copied from ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl (has models and times),
 * // or the Markdown `/export` → "Save to file" wrote — both are recognized.
 * // Pass the file's TEXT plus its original name (a detection hint), never a path.
 * const session = readTranscript({
 *   text: readFileSync('transcripts/rollout.jsonl', 'utf8'),
 *   fileName: 'rollout.jsonl',
 * })
 *
 * console.log(session.harnessVersion, session.model) // '0.156.1' 'gpt-6-astra'
 * for (const turn of session.turns) {
 *   const files = turn.files.map((f) => `${f.kind} ${f.path}`)
 *   console.log(turn.role, turn.text.slice(0, 40), files)
 *   // 'assistant' 'I’ll create `notes.md`…' ['create notes.md', 'edit notes.md']
 * }
 * ```
 *
 * @remarks
 * - **The Markdown export names no model and no times**; the rollout does
 *   (`turn_context.model`, per-line timestamps). Use the rollout when a
 *   per-paragraph model matters.
 * - Only the section headers `## User`, `## Assistant` and `## Activity` split
 *   the export; the assistant's own `##` headings stay part of its reply.
 * - Dropped from user turns: the context Codex injects as whole-tag blocks
 *   (`<environment_context>`, `<user_instructions>` …) and developer messages.
 * - Files: an `Add` (export) / `*** Add File` (patch) is the whole file; an
 *   `Update` contributes the lines it added. Patches are found wherever the
 *   call carries them — a raw `apply_patch` input, JSON arguments, or the
 *   string passed to `tools.apply_patch(...)` in code mode.
 * - Verified against Codex CLI 0.156.1's own files.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './markdown-export.js'
export * from './patch.js'
export * from './provider.js'
export * from './rollout.js'
