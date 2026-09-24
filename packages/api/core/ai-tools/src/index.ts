/**
 * Shared AI agent tool set for molecule.dev — filesystem, search, and shell
 * tools an LLM agent can call, with a swappable execution backend.
 *
 * `buildTools(backend)` returns ready-to-use `AITool`s (the `@molecule/api-ai`
 * tool shape): `list_files`, `read_file`, `write_file`, `edit_file`,
 * `search_files`, `find_files`, `create_directory`, `rename_file`,
 * `delete_file`, `exec_command`, `save_plan`, `load_skill`. The backend decides
 * WHERE they act: `createLocalBackend(projectRoot)` (host filesystem) or
 * `createSandboxBackend(...)` (an isolated `@molecule/api-code-sandbox`
 * container). `buildAgentPrompt(ctx)` composes a matching system prompt
 * (identity, tool listing, project docs, discovered skills).
 *
 * @remarks
 * - **This package only defines the tools — it runs no model loop.** Hand them to
 *   the bonded AI provider (`chat({ tools, … })`) or to an
 *   `@molecule/api-ai-agents` run.
 * - **Safety defaults: keep them on for model-driven use.** `pathGuards` (default
 *   true) rejects paths escaping `projectRoot`; `redactSecrets` (default true)
 *   masks secret-looking values in file reads and command output.
 * - **`exec_command` executes REAL shell commands** on the backend. Prefer a
 *   sandbox backend for untrusted/model-driven work; add environment-specific
 *   rules via `blockCommand` (return an actionable error string to refuse — it is
 *   shown to the model verbatim) and enable `blockDangerousCommands` (default
 *   FALSE) where appropriate.
 * - **`read_file` takes `paths` as well as `path`.** An agent that issues one
 *   tool call per model round-trip pays a full round-trip per file, so a project
 *   survey costs minutes; batched, the same reads cost one call each 25 files
 *   (`MAX_BATCH_READ_FILES` / `MAX_BATCH_READ_BYTES`, which report where they
 *   stopped). Each entry carries its own content or its own error, so one bad
 *   path never fails the batch.
 * - **`edit_file` shows the result, so the model need not re-read.** A
 *   successful edit returns `excerpt`: each edited region as it now reads, with
 *   1-based line numbers (`N: text`) and a few lines of context, capped at
 *   60 lines in total (what did not fit is named by line range),
 *   plus `totalLines`. `write_file` returns `totalLines`, and `excerpt` only
 *   for a small file (up to 40 lines) — a big file is never echoed back.
 *   Line numbers count the way `read_file` does, so they are valid offsets. The
 *   excerpt is redacted like a read. The existing fields (`ok`,
 *   `replacementsApplied`, `alreadyApplied`, `syntaxError`) are unchanged.
 * - **A parameter under another name is not a broken tool.** Every tool's input
 *   is normalized first (`cmd` → `command`, `file` → `path`, camelCase ⇄
 *   snake_case), and a handler that throws returns an error naming the missing
 *   parameter rather than a bare internal message — which a weak executor reads
 *   as a broken tool and routes around, taking its verification with it. Use
 *   `guardAITool` to give tools built elsewhere the same treatment, passing
 *   `redactError` so a thrown message is masked by your own redactor.
 * - **Scope the tool set per agent** with `include`/`exclude` — a read-only agent
 *   should not receive `write_file`/`exec_command`.
 * - Outputs are size-capped (`MAX_READ_SIZE`, `MAX_OUTPUT_SIZE`, …) and searches
 *   skip `DEFAULT_SEARCH_EXCLUDED_DIRS` (node_modules, VCS dirs, build output) —
 *   pass `searchExcludedDirs` so every search surface shares the consumer's one
 *   setting.
 *
 * @example
 * ```typescript
 * import { buildAgentPrompt, buildTools, createLocalBackend } from '@molecule/api-ai-tools'
 * import { requireProvider } from '@molecule/api-ai'
 *
 * const backend = createLocalBackend('/path/to/project')
 * const tools = buildTools(backend, { include: ['read_file', 'edit_file', 'search_files'] })
 * const system = buildAgentPrompt({
 *   agentName: 'My Agent',
 *   projectRoot: backend.projectRoot,
 *   tools: tools.map((t) => t.name),
 * })
 *
 * // Hand them to the bonded AI provider (or an @molecule/api-ai-agents run).
 * for await (const event of requireProvider().chat({ system, tools, messages, stream: true })) {
 *   // forward text chunks; tool calls are executed against the backend
 * }
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual agent/chat surface and its registered tools,
 * and check every box off one by one. A box you can't check is an integration
 * bug to fix — not a skip:
 * - [ ] A prompt that should trigger a registered tool makes the model INVOKE
 *   it with args matching that tool's `parameters` schema (e.g. "read
 *   src/index.ts" -> calls `read_file` with `{ path: 'src/index.ts' }`).
 *   Confirm the tool's `execute` actually RAN — its backend side effect / log /
 *   the file it touched — not that the model merely narrated calling it.
 * - [ ] The tool's returned value flows back into the model and shapes the
 *   final answer: the REAL result (the file's actual contents, the command's
 *   real stdout/exitCode) appears in the reply, not a plausible hallucination.
 * - [ ] A prompt that needs no tool is answered directly, with no spurious
 *   tool call.
 * - [ ] A tool whose `execute` throws or returns `{ error }` (missing file,
 *   failing command, blocked path) degrades gracefully — the error is caught
 *   and fed back to the model as text, the conversation continues, and nothing
 *   crashes the request.
 * - [ ] The model can invoke ONLY the tools handed to this run: an
 *   `include`/`exclude`-scoped agent (e.g. read-only — no `write_file` /
 *   `exec_command`) cannot call an excluded tool, and a tool name the model
 *   invents that was never registered is refused, not executed.
 * - [ ] Tool execution is server-side and authorized: `exec_command` /
 *   `write_file` run only on the bonded backend under its guards (`pathGuards`,
 *   `symlinkGuards`, `redactSecrets`, `blockDangerousCommands` / `blockCommand`)
 *   and stay inside `projectRoot`. Feed a prompt-injected instruction (a file or
 *   message telling the model to read `/etc/passwd`, escape the workspace, or run
 *   a privileged command) and confirm the guard REFUSES it — a user must not be
 *   able to trigger, via the model, any action they could not perform directly.
 *
 * @module
 */

export * from './backends/local.js'
export * from './backends/sandbox.js'
export * from './browser-guard.js'
export * from './input-normalizer.js'
export * from './schemas.js'
export * from './system-prompt.js'
export * from './tools.js'
export * from './types.js'
export * from './utilities.js'
