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
 * - **Failed-attempt timings without tracing:** `playwrightAttemptTimings(result)` serializes
 *   the native action clocks already available to a Playwright reporter's `onTestEnd`.
 *   Call it only on a failed attempt and retain its output as an attachment. It starts no browser
 *   recorder and excludes action titles, arguments and error text. A passing attempt needs no work.
 * - `outputFilterAfterRunner` returns only removable output cuts. File redirects, in-place
 *   edits, command substitutions and filter programs with write or execution effects retain
 *   their pipelines. Dynamic/external filter scripts and unrecognized awk options stay unchanged.
 * - Playwright commands apply `excludedTestTitles` before launch. Existing
 *   literal filters remain in effect. Dynamic filters and opaque launchers stay unchanged.
 * - **Trimmed test output keeps every failure named.** Shared log cuts prioritize capped
 *   error, locator and expected/received details over passing progress. A detail budget never
 *   drops failure identities; native reports also name failures beyond their detailed-record cap.
 * - **Background Playwright feedback:** `createPlaywrightFeedback({ load, run, onFailures })`
 *   coalesces `changed(paths)` events without delaying writes. Use `readFeedbackSources`
 *   when a caller needs filesystem inventory and `runPlaywrightFeedback` to run each
 *   project spec through its native command. Its incremental reporter supplies native
 *   errors, locators and the failure-time page snapshot. Healthy runs emit no note;
 *   no suite schedules no runner. Background passes visit the least recently finished file
 *   first; explicit checkpoints visit previously failing files first, then inventory order.
 *   Application and test source text never determine selection or a verdict.
 *   Pass the runner's cancellation signal to
 *   `runPlaywrightFeedback` in its options and call `pause()` before foreground tools,
 *   then invoke its returned release function afterwards. Speculation yields to
 *   independent native CLI tests/builds and uses OS idle CPU/I/O priority. Its
 *   private temporary reports are not a user test result or something to poll.
 *   New writes let a started background file finish, retaining its outcome as a known failure
 *   when it fails, while withholding its stale diagnostic. `settled()`/`close()` are for tests and shutdown,
 *   never a deployment barrier. Diagnoses are not whole-suite completion proof.
 *   A spec whose every test skips itself (`test.skip(condition)`) is `skipped`: neither a
 *   pass nor an outage. `check()` verifies the current revision before an explicit action;
 *   `check({ failedOnly: true })` re-runs only `failingSpecs()` (files whose latest native
 *   outcome failed) and does nothing when none is known. This partial checkpoint preserves
 *   pending background work on other files, which resumes after foreground work releases it.
 * - **Opaque command plans:** prepare each logical step with `streamingBackgroundCommand`,
 *   call `createCommandPlan`, and attach it to the executed wrapper with `commandWithPlan`.
 *   The launcher prints each step's `startMarker` and `endMarker` on their own lines around
 *   execution. `commandStepView` reads the active step for diagnostics; `logicalCommandText`
 *   exposes the planned commands for static classification. Preserve the descriptor when
 *   wrapping again. The metadata is advisory and never establishes a completed test result.
 * - **`yieldOnFirstFailureFor`** lets `wait_for_task` yield new final-failure causes from a
 *   still-running deployed task. Fix while it walks; once every known cause is fixed, deploy
 *   now. The task does not stop when the deploy lands, and the sandbox runs one Playwright walk
 *   at a time: stop it then with the command the note names, collect its stopped result with
 *   `wait_for_task`, and walk the new build. A local diagnostic tests mutable source: collect
 *   or stop it before editing that source, since edits invalidate its result.
 * - **Every background task can be stopped whole.** `exec_command` writes `/tmp/<id>.stop` beside
 *   the task (`taskStopScript`); `sh /tmp/<id>.stop` stops the task and every process under it as
 *   they are when it runs, workers a runner started later included, and records exit 143.
 *   `taskStopCommand` returns that command, or a pid walk for a task launched without one.
 * - **`wait_for_task` state probes report current progress without guessing log growth.**
 *   A call shorter than one normal two-second poll omits both growth and no-growth
 *   claims; task age, log counters and time-left estimates remain available.
 *   Full waits still report whether the log grew. Hosts that cap a wait should
 *   allow its final result read to finish before replacing it with a state probe.
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
 * - **An early exit code `124` is not proof that the tool budget elapsed.**
 *   Programs and nested `timeout` calls may return it sooner. The cut-run
 *   result requires the measured clock or the runner's own partial tally;
 *   otherwise the command keeps its actual exit code without a guessed duration.
 * - **`read_file` takes `paths` as well as `path`.** An agent that issues one
 *   tool call per model round-trip pays a full round-trip per file, so a project
 *   survey costs minutes; batched, the same reads cost one call each 25 files
 *   (`MAX_BATCH_READ_FILES`). One result is capped at `MAX_READ_CALL_CHARS`, the
 *   ceiling the request side puts on a single tool result: whole files are
 *   returned up to it and every path past that is named in `note` and listed as
 *   `not returned`, so a file is never handed back in part — the shape that lost
 *   the middle of a ten-file batch to the request-side cut. Each
 *   entry carries its own content or its own error, so one bad path never fails
 *   the batch.
 * - **`edit_file` shows the result, so the model need not re-read.** A
 *   successful edit returns `excerpt`: each edited region as it now reads, with
 *   1-based line numbers (`N: text`) and a few lines of context, capped at
 *   60 lines in total (what did not fit is named by line range),
 *   plus `totalLines`. `write_file` returns `totalLines`, and `excerpt` only
 *   for a small file (up to 40 lines) — a big file is never echoed back.
 *   Line numbers count the way `read_file` does, so they are valid offsets. The
 *   excerpt is redacted like a read. The existing fields (`ok`,
 *   `replacementsApplied`, `alreadyApplied`, `syntaxError`) are unchanged.
 * - **A dropped line break and the parse error it causes are reported as ONE
 *   thing.** When a replacement's `old_string` ended with a newline and its
 *   `new_string` does not (so the next line is pulled up onto it) and the file
 *   then fails its parse check, `edit_file` returns a single `syntaxError` that
 *   names the replacement, shows the fused line with its number, and says to
 *   re-send that replacement with the newline restored — instead of the
 *   `newlineNote` hint beside an unrelated-looking parse error, which an executor
 *   repairs by rewriting the fused line's text and fuses the next one. The
 *   `newlineNote` alone is still returned when the file parses.
 * - **A replacement that only changes a line break at its boundary is refused,
 *   not applied.** When `new_string` is `old_string` with its trailing newline
 *   added or removed and nothing else, the edit can only move text across lines —
 *   joining the next line onto the replaced text, or pushing the rest of the line
 *   down — which is what a weak model does by accident when it repeats a line it
 *   means to keep. The
 *   replacement is skipped, the rest of the batch is applied, and the result
 *   carries `skippedNote`: one line naming the replacement, what applying it would
 *   have done, and how to say it on purpose (include the next line in `old_string`).
 *   The file's own next character decides: text on the same line is a join or a
 *   split and is refused; a blank line after it, or the end of the file, means no
 *   text crosses lines and the edit is applied as written.
 * - **A parameter under another name is not a broken tool.** Every tool's input
 *   is normalized first (`cmd` → `command`, `file` → `path`, camelCase ⇄
 *   snake_case), and a handler that throws returns an error naming the missing
 *   parameter rather than a bare internal message — which a weak executor reads
 *   as a broken tool and routes around, taking its verification with it. Use
 *   `guardAITool` to give tools built elsewhere the same treatment, passing
 *   `redactError` so a thrown message is masked by your own redactor.
 * - **Defer occasional tools** with `createDeferredToolCatalog`: pass your current
 *   permission-filtered tools and a small initial name set, offer `catalog.select()`
 *   to the model, and execute `catalog.loader` like any other tool. Loading only
 *   exposes schemas, never grants permission or runs a tool. Persist its loaded
 *   names with `onLoad` to keep them available across turns and compaction.
 * - **Sandbox writes batch transport work.** The optional backend operations
 *   `readFileForUpdate` and `writeFileAndCheck` combine path safety with the old-text
 *   read, then the write with its parse check. Diff tracking and redaction checks
 *   stay in the tools. Format and change hooks retain their ordering before parsing;
 *   large files and backends without these operations use the native file APIs.
 *   Hosts that validate/compose background shell scripts use `prepareBackgroundScript`
 *   instead of overriding the backend's ordinary `writeFile`: it runs after the script
 *   is written and before launch, and a rejection prevents the command from starting.
 *   `supportsBackgroundScriptPreparation` advertises this hook; hosts keep their existing
 *   script-write preparation when running against older package versions.
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
export * from './browser-probe.js'
export * from './command-plan.js'
export * from './command-position.js'
export * from './cut-run.js'
export * from './failure-kind.js'
export * from './inline-script.js'
export * from './input-normalizer.js'
export * from './line-diff.js'
export * from './no-test-run.js'
export * from './output-filter.js'
export * from './pipeline-exit-note.js'
export * from './playwright-attempt-timings.js'
export * from './playwright-feedback.js'
export * from './playwright-feedback-selection.js'
export * from './playwright-feedback-types.js'
export * from './playwright-report.js'
export * from './schemas.js'
export * from './server-command.js'
export * from './sleep-peek.js'
export * from './suite-overlap.js'
export * from './system-prompt.js'
export * from './tool-catalog.js'
export * from './tools.js'
export * from './trace-artifacts.js'
export * from './types.js'
export * from './utilities.js'
