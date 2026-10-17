/**
 * Tool factory — builds AITool[] from schemas + ExecutionBackend.
 *
 * Each tool's execute() delegates to the backend for I/O,
 * with shared validation, path resolution, and output formatting.
 *
 * @module
 */

import type { AITool } from '@molecule/api-ai'

import { commandCutRun, CUT_AT_BUDGET, cutRunSentence } from './cut-run.js'
import {
  addChangeSpan,
  changedSpan,
  type CharSpan,
  countLines,
  renderEditExcerpt,
  renderSmallFile,
} from './edit-excerpt.js'
import { guardToolExecute, missingParamError, ToolInputError } from './input-normalizer.js'
import { TOOL_SCHEMAS } from './schemas.js'

/**
 * Total waiting, per background task, after which wait_for_task reports it
 * stuck instead of waiting again. Env-tunable so a test can exercise it.
 */
const stuckAfterMs = (): number => Number(process.env.MOL_AI_BG_STUCK_AFTER_MS) || 5 * 60 * 1000
/** Cumulative wait_for_task time per task id, this process. */
const waitedByTask = new Map<string, number>()
/**
 * Each waited task's log size at the end of its last wait. A command whose log
 * keeps growing is slow, not stuck: a serial 139-test suite was called stuck at
 * 560 s and the executor was told to kill it while its log still grew (X1 run
 * m21, 2026-10-15).
 */
const logBytesByTask = new Map<string, number>()

/** The file a background command writes its own output to, when it redirects it. */
const outputFileByTask = new Map<string, string>()

/**
 * How each background task was started: the command as it was actually run (after
 * {@link streamingBackgroundCommand} rewrote it) and the directory it ran in.
 *
 * A mid-run note has to hand over the re-run of a test that just failed, and a re-run is composed
 * from the command that is still walking ({@link rerunOfRunningSuite}) — a whole-suite re-run is
 * what the executor must not be handed for now, and a re-run narrowed for the wrong directory
 * resolves the failing test's `file:line` against the wrong suite.
 */
const runByTask = new Map<string, { command: string; cwd: string }>()
/**
 * Task ids whose own-output file has already been looked for this process.
 * {@link outputFileByTask} is empty for every task after a restart — it is
 * process memory and the task is not — so without this the recovery below
 * would re-read the task's script on every single wait.
 */
const outputFileProbed = new Set<string>()

/**
 * How often a wait looks at a running task's log for a cause repeating among its failures.
 * Env-tunable so a test can exercise it.
 */
const repeatingCauseLookMs = (): number => Number(process.env.MOL_AI_BG_CAUSE_LOOK_MS) || 10_000

/**
 * Task ids a wait has already named a repeating cause for. The note is news once; a second wait
 * on the same run has nothing to add to it, and re-sending it would spend the executor's turns
 * telling it what it has already been told.
 *
 * Only a wait that ENDED EARLY on the finding lands here ({@link earlyReturnCause}); a lead does
 * not, because the wait it was found in keeps looking — a run can go from a shared duration to a
 * proven cause failing everything as the app goes down, and that is exactly the finding the wait
 * must not sleep through.
 */
const repeatingCauseNoted = new Set<string>()

/**
 * Task ids whose mid-run finding has already ridden a result as a note ({@link
 * repeatingFailureNote} without an {@link earlyReturnCause}). Same rule as
 * {@link repeatingCauseNoted} — news once, and the executor still has the ✘ rows in its context —
 * but kept apart from it, because a task in this set keeps being looked at.
 */
const midRunLeadNoted = new Set<string>()

/**
 * The shell command that stops a background task by pid: the pid the platform wrote when it
 * detached the run, plus every process under it.
 *
 * Both halves matter and neither is a pattern. Killing only the pid file's entry can leave the
 * runner (`sh -c` wraps the command here) orphaned and still driving the app, and a
 * `pkill -f <something>` is the shape that matches the shell running the kill itself — the
 * platform holds that command once with the processes it would hit named
 * (`molecule-dev/api/src/ai/pattern-kill-guard.ts`). `pgrep -P` walks to a real pid list, which
 * is what the guard's own note sends the executor to.
 *
 * @param taskId - The task's `mol-bg-…` handle (format already checked by the caller).
 * @returns The pids, space-separated, or '' when the pid file is gone.
 */
const taskPidsCommand = (taskId: string): string =>
  `R=$(cat /tmp/${taskId}.pid 2>/dev/null); ` +
  'all() { echo "$1"; for c in $(pgrep -P "$1" 2>/dev/null); do all "$c"; done; }; ' +
  'all "$R" | tr "\\n" " "'

/**
 * The command that stops a running background task, read from the sandbox's own pid files.
 *
 * THE one builder for it, so every note that hands the executor a way to stop a run hands over the
 * same pid-only form: a `pkill -f <something>` matches the shell running it (its argv IS the
 * command), and `molecule-dev/api/src/ai/pattern-kill-guard.ts` holds exactly that — X1
 * xr-molecule-flash-m87's stuck note suggested `kill $(cat /tmp/<id>.pid) 2>/dev/null; pkill -f
 * <id>.sh`, which the platform's own guard then refused, and the same shape cost a refused call at
 * +21:57. The pid tree is the whole of what the pattern was for: the detached shell and every
 * process under it.
 *
 * @param backend - The execution backend.
 * @param taskId - The task's `mol-bg-…` handle.
 * @returns The command to hand the executor — `kill <pids>` — falling back to the task's own pid
 *   file when the walk comes back empty (a sandbox without `pgrep`, or a pid file already gone,
 *   in which case the pid-file form is still the one the platform's guard names).
 */
export async function taskStopCommand(backend: ExecutionBackend, taskId: string): Promise<string> {
  const fallback = `kill $(cat /tmp/${taskId}.pid)`
  try {
    const r = await backend.run(taskPidsCommand(taskId), { timeout: 10_000 })
    const pids = String(r.stdout ?? '')
      .split(/\s+/)
      .filter((p) => /^\d+$/.test(p))
    return pids.length ? `kill ${pids.join(' ')}` : fallback
  } catch (_error) {
    // The sandbox would not answer the pid walk. The pid-file form below is what the platform
    // tells the executor to use anyway, so there is nothing to report and nothing to lose.
    return fallback
  }
}

/** A millisecond span the way a model reads it: seconds under 90, else minutes. */
function durationText(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const mins = Math.floor(s / 60)
  return s < 90 ? `${s} s` : s % 60 ? `${mins} min ${s % 60} s` : `${mins} min`
}

/**
 * When a background command started, read from its own id: the handle is minted
 * as `mol-bg-${Date.now().toString(36)}-…`, so the start stamp is in the id and
 * no new state has to be kept to have it.
 *
 * @param taskId - The handle a run_in_background command returned.
 * @returns Epoch ms, or null when the id carries no usable stamp (a hand-written
 * or synthetic id) — a wrong number in a note is worse than none.
 */
function taskStartedAt(taskId: string): number | null {
  const stamp = Number.parseInt(taskId.split('-')[2] ?? '', 36)
  const now = Date.now()
  return Number.isFinite(stamp) && stamp > now - 24 * 3600_000 && stamp < now + 60_000
    ? stamp
    : null
}

/**
 * The progress a run reports in its own log: the last `[done/total]` counter a
 * Playwright reporter writes (`[86/139] [chromium] › e2e/settings.spec.ts:…`).
 *
 * @param log - The log slice this wait read.
 * @returns The counter, or null when the log carries none.
 */
function logProgress(log: string): { done: number; total: number } | null {
  const last = [...log.matchAll(/\[(\d+)\/(\d+)\]/g)].at(-1)
  const done = Number(last?.[1])
  const total = Number(last?.[2])
  return last && total > 0 && done >= 0 && done <= total ? { done, total } : null
}

/**
 * What a wait knows about the command BESIDES "it has not exited": how long it
 * has been running, whether its output is still growing, how far its own log
 * says it has got, and how much longer that implies — one fact per clause, built
 * here so the note carrying them cannot state one of them twice.
 *
 * X1 flash-m62 (2026-10-16) spent three 290 s waits on one 8.3-minute suite and
 * every answer read only "Still running after 280s": the run could not tell a
 * suite with 30 s left from one with 6 minutes left, so the wait cadence — not
 * the suite — set the pace, and the run learned nothing for its 14 minutes of
 * waiting. The elapsed time comes from the task id, the progress from the log
 * this wait already read, and the time left is the rate so far, said as such.
 *
 * X1 flash-m87 §+47:20 (2026-10-16): that suite's answer read "Still running
 * after 342s of waiting, and its output is still growing (71839 bytes) — slow,
 * not stuck." and then this sentence, which opens with the same growth clause
 * and gives the same elapsed time in its other format — one answer, two facts,
 * each said twice. The clauses ARE the facts, and {@link runningNote} is the
 * only place they become a sentence, so a lead the caller writes itself cannot
 * repeat one (the way `deployOwedNote` returns one sentence rather than a join).
 *
 * @param o - The wait's facts: `taskId`, the `slice` of the log it read,
 *   `stillWriting` (the log grew during this wait), `bytes` (the log's size, null
 *   when unreadable), `ceilingMs` (this call's ceiling, for "one more wait"), and
 *   `waitedMs` (this call's own wait, the elapsed figure when the id carries no
 *   start stamp).
 * @returns The clauses in reading order. The first states the elapsed time, so a
 *   sentence built from them always says something.
 */
function waitProgressClauses(o: {
  taskId: string
  slice: string
  stillWriting: boolean
  bytes: number | null
  ceilingMs: number
  waitedMs: number
}): string[] {
  const startedAt = taskStartedAt(o.taskId)
  const sinceStart = startedAt === null ? null : Math.max(0, Date.now() - startedAt)
  // A task id this process minted always carries its start stamp; a synthetic one
  // does not, and the time this call spent waiting is then the floor for how long
  // the command has been running — it ran throughout that wait.
  const clauses = [
    sinceStart === null
      ? `it has been running at least ${durationText(o.waitedMs)}`
      : `it has been running ${durationText(sinceStart)}`,
  ]
  if (o.stillWriting)
    clauses.push(`its output is still growing (${o.bytes} bytes) — slow, not stuck`)
  else if (o.bytes !== null)
    clauses.push(`its log has not grown during this wait (${o.bytes} bytes)`)
  const counter = logProgress(o.slice)
  if (counter) {
    clauses.push(`its log is at ${counter.done} of ${counter.total}`)
    // The rate is the task's own elapsed time, never this call's wait: with no
    // start stamp, "34 tests in the 290 s I just waited" would be reported as the
    // speed of a suite that has been walking for ten minutes.
    if (sinceStart !== null && counter.done > 0 && counter.done < counter.total) {
      const leftMs = Math.round((sinceStart * (counter.total - counter.done)) / counter.done)
      clauses.push(
        leftMs <= o.ceilingMs
          ? `about ${durationText(leftMs)} left at that rate — one more wait covers it`
          : `about ${durationText(leftMs)} left at that rate (${Math.ceil(leftMs / o.ceilingMs)} more waits)`,
      )
    }
  }
  return clauses
}

/**
 * One sentence from clauses: joined by "; ", capitalised and punctuated once.
 *
 * @param clauses - The facts to state, each in its own clause.
 * @returns The sentence, or '' when there is nothing to say.
 */
function runningNote(clauses: string[]): string {
  if (!clauses.length) return ''
  const joined = clauses.join('; ')
  return `${joined[0].toUpperCase()}${joined.slice(1)}.`
}
import { diagnosisTraceCommand } from './trace-artifacts.js'
import type { ExecutionBackend, ToolBuildConfig } from './types.js'
import {
  checkBlockedCommand,
  declaredBudgetSeconds,
  DEFAULT_SEARCH_EXCLUDED_DIRS,
  directoryReadHint,
  earlyReturnCause,
  emptyCallError,
  failureCausesNote,
  findPathArgs,
  findPatternArgs,
  fusedLine,
  htmlOutline,
  isCommandTimeout,
  isEnvFilePath,
  isOutsideRoot,
  isPlaywrightRunCommand,
  isSuiteRunCommand,
  isValidGlob,
  linesWithinSerialized,
  literalDirPrefix,
  MAX_BATCH_READ_FILES,
  MAX_FIND_RESULTS,
  MAX_HTML_INLINE_CHARS,
  MAX_OUTPUT_SIZE,
  MAX_READ_CALL_CHARS,
  MAX_READ_RETURN_CHARS,
  MAX_READ_SIZE,
  MAX_SEARCH_CONTEXT_LINES,
  MAX_SEARCH_RESULTS,
  MAX_WRITE_SIZE,
  outputIsWithheldUntilExit,
  outputRedirectTarget,
  parseCheckCommand,
  parseCheckProblem,
  pathArgError,
  printsOnlySource,
  READ_RESULT_ENVELOPE_CHARS,
  redactSecrets,
  redactSecretsInCode,
  repeatingFailure,
  repeatingFailureNote,
  resolvePath,
  RUNNING_FAILURE_LINES,
  runningCauseCommand,
  runningOutputSliceCommand,
  searchTimeoutError,
  serializedChars,
  shellQuote,
  sliceLines,
  SMALL_FILE_WHOLE_CHARS,
  streamingBackgroundCommand,
  stripControlChars,
  suiteRunPriorityLaunch,
  truncateMiddle,
  universalCause,
  whitespaceTolerantReplace,
} from './utilities.js'

/**
 * How long exec_command waits for a command it backgrounded only because the
 * command asked for more than the tool's ceiling, before handing back a task id.
 */
const OVER_CEILING_GRACE_MS = 45_000

/**
 * The closing advice on an over-budget message for a command that is not a test
 * suite: the work it was chaining is what to split.
 */
export const SPLIT_WORK_ADVICE =
  'Run a smaller unit per command (one test file, one build step) instead of chaining ' +
  'a build and a whole suite.'

/**
 * The closing advice on an over-budget message for a command that IS a suite run
 * (Playwright, Vitest, a `hurl` run — {@link isSuiteRunCommand}): its files are not
 * a bigger unit to break up.
 *
 * X1 flash-m36 asked for this half and the message kept saying "run a smaller unit"
 * for two months. It is the wrong direction for a suite, and measurably: a run
 * stopped here reports NO tally, so nothing in the result says which test or request
 * hung — the run has to be sent again in the background (off this budget, its output
 * written to a log that can be read mid-run) or, when a consumer knows the runner's
 * per-request limit, with each request bounded. xr-molecule-flash-m93 (+06:22,
 * 2026-10-16) lost 4.8 minutes to a Hurl run whose ONE unanswered request had hurl's
 * 300 s default per request holding the file, ten seconds past this tool's budget.
 */
export const SUITE_OVER_BUDGET_ADVICE =
  'A test suite is not a bigger unit to split: stopped here it reports no tally at all, so nothing ' +
  'in this result says which test or request never finished — run it in the background ' +
  '(`run_in_background`, then `wait_for_task`), which takes it off this budget and writes its output ' +
  "to a log, and read that log (or the app's own log) for what it was waiting on."

/**
 * How long a tree walk (`find_files`, `search_files`) may run before the backend's
 * own deadline stops it. Both tools answer that deadline in their own words
 * (see searchTimeoutError) rather than forwarding the sandbox SDK's `timeoutMs`
 * sentence, which names an option the executor cannot set.
 */
const SEARCH_TIMEOUT_MS = 10_000

/**
 * The share of its budget a command must use before the "you asked for more than
 * this tool's ceiling" note is worth attaching. Below it the clamp changed nothing
 * about the run, and the line read as a warning about work that had already
 * finished (xr-molecule-flash-m83 +53:11: a Hurl run of 25 s against a 290 s
 * ceiling carried the note).
 */
const CEILING_NOTE_MIN_USED = 0.5

/**
 * The steer attached to a SUCCESSFUL read of a package's built output. The ENOENT
 * redirect below fires only when the read FAILS, so a model that knows the hoisted
 * layout reads `node_modules/@molecule/<pkg>/dist/*.js` happily and never learns the
 * documented API is one call away (X0 flash-m70: 24 such reads in 57 s, no note on
 * any of them). Carried as `distNote` rather than merged into `note` so a host that
 * has read_molecule_doc (molecule-dev's cadence note, which also names the functions)
 * can supersede it without string-matching.
 *
 * @param path - The resolved path that was read.
 * @returns The note, or null when the path is not inside a package's `dist`.
 */
export function moleculeDistReadNote(path: string): string | null {
  const pkg = /node_modules\/@molecule\/([a-z0-9-]+)\/dist\//.exec(path)?.[1]
  if (!pkg) return null
  return (
    `This is @molecule/${pkg}'s compiled dist, not its API: read_molecule_doc("@molecule/${pkg}") ` +
    'returns its README.md — the functions, options and bond wiring — in one call.' +
    (/\.d\.ts$/.test(path)
      ? ' The declarations above are generated from it.'
      : ' For one signature, read the matching .d.ts file.')
  )
}

/**
 * The refusal for a write whose target is inside an installed package, or null
 * when the path is not under a `node_modules` directory.
 *
 * `node_modules` is not the project's code: nothing written there survives the
 * next install, no deploy carries it, and a sandbox whose dependency tree is
 * shared (the pre-installed superset) breaks every other run through it. X0
 * xr-molecule-flash-m91 (+04:43) called `write_file` on
 * `node_modules/@molecule/api-resource-comment/dist/numbers.d.ts` while reading
 * the package's declarations and clobbered its runtime module a call later
 * (`module.exports = {}` over the ESM handler its own code imports) — the write
 * answered `ok: true`, and 18 s went to noticing, `npm pack`-ing the package and
 * putting the file back. Reading these files stays allowed (that is how the
 * declarations above are read at all).
 *
 * The restore route is named because the model that has ALREADY clobbered a file
 * (this refusal is too late for it) is the one who needs it, and because the
 * obvious repair — `npm install <pkg>` — is itself refused in the pre-installed
 * sandbox. `npm pack` + a `tar` extraction over the package directory is what
 * m91 used, and what both guards leave alone.
 *
 * @param path - An absolute path a tool is about to write.
 * @returns The one-line refusal naming the package, or null when nothing is installed there.
 */
export function installedPackageWriteRefusal(path: string): string | null {
  // A path may sit in a NESTED node_modules (`app/node_modules/...`) as well as the
  // hoisted root one: both are installed packages.
  const at = /(?:^|\/)node_modules(?:\/|$)/.exec(path)
  if (!at) return null
  const named = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)(?:\/|$)/.exec(path)
  const name = named?.[1] ?? null
  const scoped = at[0].startsWith('/') ? path.slice(0, at.index) : ''
  const dir = name ? `${scoped}/node_modules/${name}` : null
  const what = name ? `the installed package ${name}` : 'an installed package'
  const change =
    'Installed packages are read-only: the next install replaces that file and a deploy never ' +
    'carries it. Change its behaviour from your app instead (its options, your own handler, a ' +
    'bond), and where the package itself is wrong, report it rather than patching it here. ' +
    'Reading these files is fine.'
  const restore =
    name && dir
      ? ` If you have already overwritten one there, restore the package before anything else: ` +
        `\`npm pack ${name}@<version>\` (the version is in ${dir}/package.json), then ` +
        `\`tar -xzf <the tarball npm pack printed> --strip-components=1 -C ${dir}\` — never a hand-edit.`
      : ''
  return `Not written: ${path} is inside ${what} (node_modules). ${change}${restore}`
}

/** How many failing replacements one refusal names before it stops listing. */
const MAX_REPORTED_REPLACEMENT_FAILURES = 5

/**
 * The one refusal a batch `edit_file` gets, naming EVERY replacement that did not
 * match — each with the same detail a lone failure gets (which replacement, the
 * head of its old_string, where it diverges from the file).
 *
 * A batch is applied all-or-nothing, so one bad `old_string` means none of the
 * others were applied either: they are not "the rest, which worked", they are
 * unchecked work the model will otherwise re-send as-is. Naming one per round trip
 * cost flash-m98 two full re-sends of a six-replacement batch — the second bad
 * hunk was not reported until the first was fixed, 7 s later.
 *
 * @param path - The file the batch targets (nothing was written to it).
 * @param total - How many replacements the batch carried.
 * @param failures - Every failing replacement, in batch order.
 * @returns The error message.
 */
function batchFailureError(
  path: string,
  total: number,
  failures: ReadonlyArray<{ index: number; start: string; message: string }>,
): string {
  // A single replacement keeps the message it has always had: "Replacement 1 of 1"
  // is noise, and the failure of a lone edit is not a batch problem.
  if (total === 1 && failures.length === 1) return failures[0].message
  const shown = failures.slice(0, MAX_REPORTED_REPLACEMENT_FAILURES)
  const omitted = failures.length - shown.length
  const blocks = shown.map(
    (f) =>
      `Replacement ${f.index} of ${total} failed` +
      (f.start ? ` (its old_string starts "${f.start}")` : '') +
      `:\n${f.message}`,
  )
  return (
    `edit_file (${
      path
    }): nothing was written — ${failures.length} of the ${total} replacements do not match the file, and the batch is all-or-nothing, so re-send it with every one of these fixed.\n\n` +
    blocks.join('\n\n') +
    (omitted > 0
      ? `\n\n(${omitted} more replacement${omitted === 1 ? '' : 's'} also failed and are not shown.)`
      : '')
  )
}

/**
 * Build a complete set of AI agent tools bound to an execution backend.
 *
 * @param backend - The execution environment (sandbox or local filesystem)
 * @param config - Optional configuration for security, callbacks, and tool selection
 * @returns Array of AITool objects ready to pass to an AI provider
 */
export function buildTools(backend: ExecutionBackend, config?: ToolBuildConfig): AITool[] {
  const {
    include,
    exclude,
    pathGuards = true,
    symlinkGuards = false,
    redactSecrets: doRedact = true,
    blockDangerousCommands = false,
    blockCommand,
    execTimeoutMs = 120_000,
    commandBudgetMs,
    overCeilingGraceMs = OVER_CEILING_GRACE_MS,
    searchExcludedDirs,
    outlineLargeHtml,
    excludedTestTitles,
    onAfterWrite,
    onFileDiff,
    onFileChange,
  } = config ?? {}

  const root = backend.projectRoot

  // A host-filesystem backend with escape guards off is the combination the
  // audit flagged: `pathGuards` off lets `..` paths out of the workspace,
  // and `symlinkGuards` off lets a workspace SYMLINK redirect reads/writes
  // anywhere on the host (npm-workspace layouts are full of such symlinks).
  // Defaults are deliberately unchanged — but the state must be LOUD, not
  // silent: one warn per buildTools() call, naming the exact gaps.
  if (backend.hostFs && (!pathGuards || !symlinkGuards)) {
    const off = [!pathGuards ? '`pathGuards`' : null, !symlinkGuards ? '`symlinkGuards`' : null]
      .filter(Boolean)
      .join(' and ')
    console.warn(
      `[ai-tools] ${off} disabled on a LOCAL-HOST backend (root ${backend.projectRoot}) — ` +
        'model-driven file operations can escape the workspace via `..` paths or symlinks ' +
        'into the host filesystem. Contained agent runs should use the sandbox backend; ' +
        'host runs should enable both guards.',
    )
  }

  // One synchronized excluded-dir set for BOTH search tools (VS Code
  // `search.exclude` semantics). Names are validated defensively — they are
  // interpolated into shell commands, so anything outside the safe charset is
  // dropped rather than quoted around.
  const excludedDirs = (
    searchExcludedDirs && searchExcludedDirs.length > 0
      ? searchExcludedDirs
      : DEFAULT_SEARCH_EXCLUDED_DIRS
  ).filter((d) => /^[A-Za-z0-9._-]+$/.test(d))
  /**
   * The excluded dirs for a search rooted at `path`. Inside an installed
   * package the build output IS the code: excluding `dist` there returned
   * nothing for `IconName` in `node_modules/@molecule/app-icons` (it lives in
   * `dist/types.d.ts`; X1 run sol-m04).
   *
   * @param path - The resolved search root.
   * @returns The dir names to skip below it.
   */
  const excludesFor = (path: string): string[] =>
    /(?:^|\/)node_modules(?:\/|$)/.test(path)
      ? excludedDirs.filter((d) => d !== 'dist')
      : excludedDirs
  const grepExcludeArgs = (path: string): string =>
    excludesFor(path)
      .map((d) => `--exclude-dir=${shellQuote(d)}`)
      .join(' ')
  // Pruned BELOW the root only (-mindepth 1): a `-not -path '*/node_modules/*'`
  // filter matched every result of a search rooted inside node_modules and
  // returned none.
  const findPruneArgs = (path: string): string => {
    const dirs = excludesFor(path)
    if (dirs.length === 0) return ''
    return `-mindepth 1 \\( -type d \\( ${dirs.map((d) => `-name ${shellQuote(d)}`).join(' -o ')} \\) -prune \\) -o`
  }

  // ── Path helpers ───────────────────────────────────────────────

  /**
   * After a write or edit, parse the file and hand the error back IN THE SAME
   * RESULT. An edit that leaves a file unparsable used to surface only at the
   * next build or type-check, minutes and many calls later — x13 (2026-09-22)
   * mangled a template literal in `scripts/prerender.mjs`, the site stopped
   * building, and the fix round spent 500 calls on the fallout. `node --check`
   * is ~50 ms; the executor sees the exact line while the edit is still in
   * front of it.
   */
  async function syntaxErrorAfterWrite(path: string): Promise<{ syntaxError?: string }> {
    const command = parseCheckCommand(path)
    if (!command) return {}
    const result = await backend
      .run(command, { cwd: path.slice(0, path.lastIndexOf('/')) || '/', timeout: 15_000 })
      .catch(() => null)
    const problem = result ? parseCheckProblem(result) : null
    // JSX in a `.ts` file parses as a type assertion and fails on the first
    // attribute — `Expected ">" but found "className"` — which does not say the
    // file just needs to be `.tsx` (X1 flash-m28: three writes and 2.5 minutes).
    const jsxInTs =
      problem !== null && /\.ts$/.test(path) && /Expected ">" but found|JSX/i.test(problem)
        ? '\nThis looks like JSX in a `.ts` file: JSX only parses in a `.tsx` file — rename it (and its imports keep the `.js` extension).'
        : ''
    return problem
      ? {
          syntaxError: `The file no longer parses after this change — fix it before anything else, every build and test fails until it does:\n${problem}${jsxInTs}`,
        }
      : {}
  }

  /**
   * Resolve a workspace-relative path using optional path guards.
   *
   * @param path - Relative or absolute path requested by the tool input.
   * @returns A normalized path honoring `pathGuards` and the backend root.
   */
  function resolve(path: string, use: 'file' | 'cwd' = 'file'): string {
    if (pathGuards && typeof path === 'string' && isOutsideRoot(path, root)) {
      throw new ToolInputError(
        use === 'cwd'
          ? `${path} is outside the workspace (${root}), so it cannot be the working directory — ` +
              `start the command with \`cd ${path} && \` instead.`
          : `${path} is outside the workspace (${root}). The file tools only reach files inside it — ` +
              `read or list anything else with exec_command (e.g. \`cat ${path}\` or \`ls ${path}\`).`,
      )
    }
    return pathGuards ? resolvePath(path, root) : path
  }

  /**
   * Resolve the path a WRITING tool was given, refusing a target inside an
   * installed package ({@link installedPackageWriteRefusal}). Reads are not sent
   * through this: reading `node_modules` is how a package's declarations are
   * read at all, and only the write is unrecoverable.
   *
   * @param path - Relative or absolute path requested by the tool input.
   * @returns The normalized path, when writing it is allowed.
   */
  function resolveWrite(path: string): string {
    const resolved = resolve(path)
    const refusal = installedPackageWriteRefusal(resolved)
    if (refusal) throw new ToolInputError(refusal)
    return resolved
  }

  /** Paths read with a window in this tool set, to tell paging from one targeted read. */
  const windowedReads = new Set<string>()
  /** The text each path was last handed back WHOLE as, so that correction fires once per version. */
  const wholeReturned = new Map<string, string>()

  /**
   * Verify that `path` does not symlink outside the project root when guards are enabled.
   *
   * @param path - Candidate filesystem path after `resolve()`.
   * @returns An error message when unsafe, otherwise `null`.
   */
  async function checkSymlink(path: string): Promise<string | null> {
    if (!symlinkGuards) return null
    // One retry: the first commands on a just-attached sandbox can fail at once (X1
    // flash-m44: three paths refused in 332 ms, the same check passing a beat later).
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now()
      try {
        const result = await backend.run(
          `readlink -f ${shellQuote(path)} 2>/dev/null || echo ${shellQuote(path)}`,
          { timeout: 5000 },
        )
        const realPath = result.stdout.trim()
        if (realPath && realPath !== root && !realPath.startsWith(root + '/')) {
          return 'Access denied: path resolves outside the project workspace'
        }
        return null
      } catch (error) {
        lastError = Object.assign(error instanceof Error ? error : new Error(String(error)), {
          elapsedMs: Date.now() - started,
        })
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }
    // Deny conservatively, and say what failed: "access denied" read as a forbidden path,
    // and a fixed "did not answer within 5 s" hid an error that took 332 ms.
    const err = lastError as (Error & { elapsedMs?: number }) | undefined
    const timedOut = err?.name === 'TimeoutError' || (err?.elapsedMs ?? 0) >= 4900
    return timedOut
      ? 'Unable to verify path safety: the sandbox did not answer the check within 5 s (it may be ' +
          'restarting or out of memory), so the path was refused to stay safe. Retry in a moment; if ' +
          'every file tool fails this way, the sandbox needs a restart.'
      : `Unable to verify path safety: the sandbox's command channel failed (${err?.name ?? 'Error'}: ${String(err?.message ?? err).slice(0, 160)}), ` +
          'so the path was refused to stay safe. Retry the call; if every file tool fails this way, the sandbox needs a restart.'
  }

  /**
   * Strip control characters and optionally redact secrets from tool output.
   *
   * @param s - Raw stdout/stderr or file contents to sanitize.
   * @returns A sanitized string safe to return to the model or UI.
   */
  function sanitizeOutput(s: string): string {
    let result = stripControlChars(s)
    if (doRedact) result = redactSecrets(result)
    return result
  }

  /**
   * Sanitize FILE CONTENT for return to the model. Unlike {@link sanitizeOutput},
   * this uses the code-safe redactor for ordinary source files — the name-keyed
   * JSON passes destroy legitimate code, and the agent writes back what it reads,
   * so an over-redacted read corrupts the user's project on the next write. Env
   * files still get the full env-dump treatment, since that is where the shape
   * those passes detect actually indicates a credential.
   *
   * @param s - Raw file contents.
   * @param path - The file's path, used to decide the redaction grade.
   * @returns Content safe to return to the model, with code preserved verbatim.
   */
  function sanitizeFileContent(s: string, path: string): string {
    let result = stripControlChars(s)
    if (doRedact) result = isEnvFilePath(path) ? redactSecrets(result) : redactSecretsInCode(result)
    return result
  }

  // ── Empty-read verification ────────────────────────────────────

  /**
   * The file's size in bytes as the backend's own shell reports it, or `null`
   * when that could not be established (the probe failed, timed out, or printed
   * something unparseable).
   *
   * `null` means "I could not look" and is deliberately DISTINCT from `0` ("I
   * looked and the file is empty") — conflating the two is the very failure this
   * probe exists to prevent. The last integer in stdout is taken rather than the
   * whole string, so a consumer that wraps commands in environment sourcing
   * cannot break the parse with stray output.
   *
   * @param path - The already-resolved, symlink-checked path.
   * @returns The byte count, or null when it could not be determined.
   */
  async function probeFileSize(path: string): Promise<number | null> {
    try {
      const result = await backend.run(`wc -c < ${shellQuote(path)}`, { timeout: 10_000 })
      if (result.exitCode !== 0) return null
      const match = /(\d+)\s*$/.exec(result.stdout)
      if (!match) return null
      const bytes = Number.parseInt(match[1], 10)
      return Number.isFinite(bytes) ? bytes : null
    } catch (_error) {
      // The probe is the cross-check for an ALREADY-suspect read; if it cannot
      // run we must report "unverified", never "empty" — returning 0 here would
      // reintroduce exactly the conflation this function exists to remove.
      return null
    }
  }

  /**
   * Decide what an EMPTY string from `backend.readFile` actually means.
   *
   * A backend read can come back empty without throwing: a sandbox exec whose
   * output stream ends early still reports the process's own exit code, an HTTP
   * file read can return a 200 with no body, and a concurrent writer can be
   * observed mid-truncate. Observed in production on 2026-09-16 (X0 rehearsal
   * 84): several `read_file` calls on two real components returned no content
   * while an exec shell showed both files present at 3,617 and 25,746 bytes; a
   * later read of the same paths succeeded, so the failure was transient.
   *
   * Returning `{ content: '' }` for that is indistinguishable from a successful
   * read of an empty file — and a model that believes a file is empty writes it
   * from scratch, destroying work it never saw. So an empty read is verified
   * against the file's real size before it is reported as content: genuinely
   * empty is returned as empty and SAID so; non-empty is retried once and then
   * reported as a FAILED read; unverifiable is also a failure, never an empty
   * file.
   *
   * @param path - The already-resolved, symlink-checked path.
   * @param tool - The calling tool's name, for the error message.
   * @returns The file's real content (possibly empty, with a note), or an error.
   */
  async function classifyEmptyRead(
    path: string,
    tool: string,
  ): Promise<{ content: string; note?: string } | { error: string }> {
    const bytes = await probeFileSize(path)
    if (bytes === 0) {
      return {
        content: '',
        note: `${path} exists and is EMPTY (0 bytes) — that is the file's real content, not a failed read.`,
      }
    }
    if (bytes === null) {
      return {
        error:
          `${tool} obtained NO CONTENT for ${path}, and could not confirm the file's size ` +
          `(the \`wc -c ${path}\` probe failed), so this may be a FAILED read rather than an ` +
          `empty file. Do NOT write or edit ${path} from memory or from the plan — that would ` +
          `overwrite a file you have never seen. Call read_file again, or run \`cat ${path}\` ` +
          `with exec_command, and only proceed once you actually have its contents.`,
      }
    }
    // Non-empty on disk: the read failed, and the observed failure is transient —
    // so retry it once here rather than spending an executor turn on it.
    try {
      const retry = await backend.readFile(path)
      if (typeof retry === 'string' && retry !== '') {
        return {
          content: retry,
          note: `The first read of ${path} returned nothing; this content came from an immediate retry.`,
        }
      }
    } catch (_error) {
      // The retry's own failure adds nothing to the message below — the size
      // probe is the authoritative fact, and it already said the file has bytes.
    }
    return {
      error:
        `${tool} obtained NO CONTENT for ${path}, but the file is ${bytes} bytes on disk — the ` +
        `read FAILED, this is not an empty file (a retry returned nothing either). Do NOT write ` +
        `or edit ${path} from memory or from the plan — that would overwrite a file you have ` +
        `never seen. Call read_file again, or run \`cat ${path}\` with exec_command, and only ` +
        `proceed once you actually have its contents.`,
    }
  }

  // ── Diff computation ───────────────────────────────────────────

  /**
   * Compute a lightweight diff summary for telemetry and UI badges.
   *
   * @param oldContent - Previous file contents, or `null` when creating a file.
   * @param newContent - Replacement file contents after a write/edit.
   * @returns Counts describing whether the file was created or modified.
   */
  function computeDiff(
    oldContent: string | null,
    newContent: string,
  ): { type: 'created' | 'modified'; linesAdded: number; linesRemoved: number } {
    if (oldContent === null) {
      return { type: 'created', linesAdded: newContent.split('\n').length, linesRemoved: 0 }
    }
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    return {
      type: 'modified',
      linesAdded: Math.max(0, newLines.length - oldLines.length),
      linesRemoved: Math.max(0, oldLines.length - newLines.length),
    }
  }

  // ── Tool implementations ───────────────────────────────────────

  /**
   * Read ONE file with every DWIM behavior read_file offers (directory
   * listing, ENOENT parent listing, empty-read classification). Shared by the
   * single-path and batched forms of the tool.
   *
   * Symlink-checked, size-bounded, optionally windowed by line, and never more
   * than `ceiling` SERIALIZED chars at once (a window of raw text grows by its
   * own newlines once the result is JSON — see {@link serializedChars}).
   *
   * @param rawPath - The path as the model sent it.
   * @param window - Optional `offset`/`limit` in lines.
   * @param ceiling - The most this read may return, in serialized chars
   *   ({@link MAX_READ_RETURN_CHARS} when the call has the whole result to
   *   itself; a batched call passes what it has left, so the read stops short of
   *   the request-side cut instead of being cut by it). A read that comes back
   *   short carries `truncated: true`, which is how the batch tells a whole file
   *   from a window of one.
   * @returns The file content (or a window of it) or a model-readable error.
   */
  async function readOneFile(
    rawPath: unknown,
    window?: { offset?: unknown; limit?: unknown },
    ceiling?: number,
  ): Promise<unknown> {
    const maxChars = ceiling ?? MAX_READ_RETURN_CHARS
    const argErr = pathArgError(rawPath, 'read_file')
    if (argErr) return { error: argErr }
    const path = resolve(rawPath as string)
    const symlinkErr = await checkSymlink(path)
    if (symlinkErr) return { error: symlinkErr }
    // Carried on every successful read of a package's built output, so no dist read
    // goes out unsteered (see moleculeDistReadNote).
    const distNote = moleculeDistReadNote(path)
    const noted = (r: Record<string, unknown>): Record<string, unknown> =>
      distNote ? { ...r, distNote } : r
    try {
      const content = await backend.readFile(path)
      // A read that produced no usable text is verified against the file's real
      // size before it can be reported as content (see classifyEmptyRead). The
      // non-string arm covers a backend whose transport handed back an empty
      // body as `undefined`; `content.length` below would otherwise raise an
      // unactionable "Cannot read properties of undefined".
      if (typeof content !== 'string' || content === '') {
        const verdict = await classifyEmptyRead(path, 'read_file')
        if ('error' in verdict) return verdict
        return noted({
          path,
          content: sanitizeFileContent(verdict.content, path),
          ...(verdict.content === '' ? { empty: true } : {}),
          ...(verdict.note ? { note: verdict.note } : {}),
        })
      }
      if (content.length > MAX_READ_SIZE)
        return {
          error: `File too large (${Math.round(content.length / 1024)}KB). Maximum is ${MAX_READ_SIZE / 1024 / 1024}MB.`,
        }
      // A LARGE HTML document comes back as its OUTLINE, not its text, when the
      // host asks for that (a plan-mode turn: see `outlineLargeHtml`). X0
      // flash-m77 paid 63,735 chars for one `read_file` of `app/index.html` —
      // ~60 KB of it the IDE's own preview bridges — and that read alone took the
      // transcript past its context cap, so the e2e specs it had just read were
      // trimmed to summaries and it read the whole suite again, twice (+01:23,
      // +02:56). An outline is not a truncation: the note names the exact
      // offset/limit that returns the whole document, and any line range works.
      if (
        !sliceLines(content, window) &&
        content.length > MAX_HTML_INLINE_CHARS &&
        outlineLargeHtml?.()
      ) {
        const outline = htmlOutline(content, path)
        if (outline) {
          const totalLines = content.split('\n').length
          return noted({
            path,
            // Same redaction every other read goes through: an outline is made of
            // the document's own lines, and a meta tag can carry a key.
            content: sanitizeFileContent(outline, path),
            outline: true,
            bytes: content.length,
            totalLines,
            note:
              `Outlined, not returned whole: a ${Math.round(content.length / 1024)} KB HTML document is ` +
              `its tags plus a lot of plumbing, and the tags are what matter. ` +
              `The whole file is ONE call — read_file {path, offset: 1, limit: ${totalLines}} — ` +
              `and any line range works the same way.` +
              // The IDE's own preview scripts are in this document but are not the
              // app's behaviour, and an executor that reads them pays 60 KB for
              // something it must never edit (flash-m77). Named only when present.
              (/<!--\s*mol:[a-z0-9-]+-(?:bridge|shim)/.test(content)
                ? ' The `mol:*-bridge` scripts the IDE injects belong to the platform, not to the app: leave them as they are.'
                : ''),
          })
        }
      }
      // No window asked for and the file is bigger than one call should hand
      // back: return its first window, sized to the ceiling, and say so. The
      // model can read on with offset/limit; it cannot un-send 300k tokens.
      const effectiveWindow =
        !sliceLines(content, window) && serializedChars(content) > maxChars
          ? { offset: 1, limit: linesWithinSerialized(content, maxChars) }
          : window
      // A SECOND window of the same small file: hand back all of it (one window is a targeted read). X1 flash-m50 paged files that fit in one
      // call 13 times in a row, each window answered with "read it again with no offset/limit".
      // The bound is the one that note states (SMALL_FILE_WHOLE_CHARS = MAX_READ_RETURN_CHARS): 24 KB left
      // RealWorld's 24,935-byte openapi.yml paged nine times under "fits in ONE call" (flash-m67).
      const small = sliceLines(content, window)
      const pagedBefore = small?.truncated ? windowedReads.has(path) : false
      if (small?.truncated) windowedReads.add(path)
      // Once per version of the file: after the whole text went back, a later window is a
      // targeted read and gets its window (X1 flash-m67: 25 firings, 8 byte-identical repeats).
      const sentWhole = wholeReturned.get(path) === content
      if (
        small?.truncated &&
        pagedBefore &&
        !sentWhole &&
        serializedChars(content) <= Math.min(SMALL_FILE_WHOLE_CHARS, maxChars)
      ) {
        wholeReturned.set(path, content)
        return noted({
          path,
          content: sanitizeFileContent(content, path),
          offset: 1,
          lines: small.totalLines,
          totalLines: small.totalLines,
          note: `The whole file is returned (${Math.round(content.length / 1024)} KB, ${small.totalLines} lines): a file this small fits in one call, so it is not paged.`,
        })
      }
      const windowed = sliceLines(content, effectiveWindow)
      if (windowed) {
        return noted({
          path,
          content: sanitizeFileContent(windowed.text, path),
          offset: windowed.offset,
          lines: windowed.lines,
          totalLines: windowed.totalLines,
          // What the model has is PART of the file. Named on the result, not only
          // in the note: a batched read keeps whole files and lists the rest, and
          // this is how it tells the two apart (see the `paths` branch).
          ...(windowed.truncated ? { truncated: true } : {}),
          // The note decides the executor's next call. Observed (X0 run x7): a
          // 44 KB README read as seven 300-line windows, one round trip each,
          // because the note only ever said "read another window" — when the
          // whole file fits in one call, say that; when it does not, name the
          // exact next window so the executor does not have to compute it.
          ...(windowed.truncated
            ? {
                note: sentWhole
                  ? `Lines ${windowed.offset}-${windowed.offset + windowed.lines - 1} of ${windowed.totalLines}; ` +
                    'the whole file, unchanged, was returned earlier in this conversation.'
                  : serializedChars(content) <= MAX_READ_RETURN_CHARS
                    ? `Lines ${windowed.offset}-${windowed.offset + windowed.lines - 1} of ` +
                      `${windowed.totalLines}. The whole file is ${Math.round(content.length / 1024)} KB ` +
                      `and fits in ONE call — read it again with no offset/limit instead of paging.`
                    : `Lines ${windowed.offset}-${windowed.offset + windowed.lines - 1} of ` +
                      `${windowed.totalLines}. Next window: offset ${windowed.offset + windowed.lines}, ` +
                      `limit ${windowed.lines}.`,
              }
            : {}),
        })
      }
      return noted({ path, content: sanitizeFileContent(content, path) })
    } catch (e: unknown) {
      // Backends (e.g. the docker provider's `cat`) already prefix "Failed to read <path>: ";
      // strip it so the wrap below doesn't stutter ("Failed to read X: Failed to read X: …").
      const rawMessage = (e as Error).message
      const prefix = `Failed to read ${path}: `
      const message = rawMessage.startsWith(prefix) ? rawMessage.slice(prefix.length) : rawMessage
      // A weak model often read_file's a directory (handlers/, migrations/). Rather than
      // erroring and costing it a retry loop (observed: 3 such misses + follow-up
      // list_files in one custom build), DWIM: return the directory's listing — what it
      // almost certainly wanted — with a note so it read_file's a specific entry next.
      if (directoryReadHint(message, path)) {
        try {
          const entries = await backend.readDir(path)
          return {
            path,
            isDirectory: true,
            note: `${path} is a directory, not a file — returning its contents. read_file a specific entry inside it to see that file's content.`,
            entries: entries.map((entry) => ({ name: entry.name, type: entry.type })),
          }
        } catch (_dirErr) {
          // readDir also failed — fall through to the steer-to-list_files hint below.
        }
      }
      // ENOENT DWIM: a weak model GUESSES paths from framework priors (observed: 65 of 89
      // reads in one imported-app build were misses on files that never existed). Return
      // ground truth in the SAME result — what the parent directory actually contains — so
      // the next read uses a real name instead of another guess.
      // A package's docs are one tool call away wherever node_modules happens to live.
      const moleculePkg = /node_modules\/(@molecule\/[^/]+)\//.exec(path)?.[1]
      // Docker's `cat` says "No such file or directory"; E2B's SDK says "path '…' does not
      // exist" (X1 flash-m44: the hints below never fired on E2B).
      const notFound = /No such file or directory|does not exist|ENOENT/i.test(message)
      if (moleculePkg && notFound) {
        return {
          error: `No such file: ${path}. Read ${moleculePkg}'s documentation with read_molecule_doc("${moleculePkg}") instead of looking for it in node_modules.`,
        }
      }
      if (notFound) {
        const parent = path.replace(/\/[^/]*$/, '') || '/'
        let listing: string
        try {
          const entries = await backend.readDir(parent)
          const names = entries
            .slice(0, 40)
            .map((entry) => entry.name + (entry.type === 'directory' ? '/' : ''))
          listing = names.length
            ? `The directory ${parent} exists and contains: ${names.join(', ')}${entries.length > 40 ? ', …' : ''}.`
            : `The directory ${parent} exists but is EMPTY.`
        } catch (_parentErr) {
          // Parent listing failed too — most usefully because it doesn't exist either.
          listing = `The directory ${parent} does not exist either.`
        }
        return {
          error: `No such file: ${path}. ${listing} Read one of the real entries (or use find_files) — do not guess paths.`,
        }
      }
      return { error: directoryReadHint(message, path) ?? `Failed to read ${path}: ${message}` }
    }
  }

  const toolImpls: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
    async list_files(input) {
      const path = resolve((input.path as string) || '')
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const entries = await backend.readDir(path)
        return { path, entries: entries.map((e) => ({ name: e.name, type: e.type })) }
      } catch (e: unknown) {
        const message = (e as Error).message
        // Same ground-truth answer as read_file's miss: a guessed path gets the parent's
        // real contents back, so the next call names something that exists.
        if (/No such file or directory|cannot access|does not exist|ENOENT/i.test(message)) {
          const parent = path.replace(/\/[^/]*$/, '') || '/'
          try {
            const siblings = await backend.readDir(parent)
            return {
              error: `No such directory: ${path}. ${parent} contains: ${
                siblings
                  .slice(0, 40)
                  .map((s) => s.name + (s.type === 'directory' ? '/' : ''))
                  .join(', ') || '(nothing)'
              }${siblings.length > 40 ? ', …' : ''}.`,
            }
          } catch (_parentErr) {
            // The parent is missing too; the plain message below says so.
            return { error: `No such directory: ${path} (and ${parent} does not exist either).` }
          }
        }
        return { error: `Failed to list ${path}: ${message}` }
      }
    },

    async read_file(input) {
      const emptyErr = emptyCallError(input, 'read_file')
      if (emptyErr) return { error: emptyErr }
      // Several paths in ONE call. The executor issues one tool call per model
      // round-trip 89% of the time (X0: 464 assistant messages, 515 tool calls,
      // a ~10s mean gap), so a turn's wall clock IS its round-trip count — and
      // the largest single block measured was a systematic scaffold survey:
      // 121 sequential read_file calls, 108 of them in the first ten minutes,
      // across 93 distinct files. The same reads batched cost the same tokens
      // and a tenth of the latency.
      if (Array.isArray(input.paths)) {
        const requested = (input.paths as unknown[]).map((p) => String(p ?? '')).filter(Boolean)
        if (requested.length === 0) {
          return {
            error:
              'read_file got an empty "paths" array. Pass "path" for one file, or "paths" with at ' +
              'least one path for several.',
          }
        }
        const files: unknown[] = []
        // The paths this call does NOT return, in request order, each with the
        // reason it is missing. Never a partial file in their place: a batch
        // that broke off mid-file is what MAX_READ_CALL_CHARS exists to stop —
        // the request side cuts a longer block through its middle, between two
        // `"content"` values, so whole files vanish and the note says only
        // "N characters cut here" (X0 flash-m81).
        const notReturned: Array<{ path: string; reason: 'budget' | 'count' }> = []
        const explicitWindow = input.offset !== undefined || input.limit !== undefined
        // Every entry names its file the way a returned entry does — resolved —
        // so a path out of this list can go straight back into the next call.
        const missing = (requestedPath: string, reason: 'budget' | 'count'): void => {
          notReturned.push({ path: resolve(requestedPath), reason })
        }
        for (const [index, requestedPath] of requested.entries()) {
          if (index >= MAX_BATCH_READ_FILES) {
            missing(requestedPath, 'count')
            continue
          }
          // What this file's read may still carry: the call's ceiling less the
          // envelope, which has to hold the note and one entry per missing path.
          const room =
            MAX_READ_CALL_CHARS - JSON.stringify(files).length - READ_RESULT_ENVELOPE_CHARS
          if (room <= 0) {
            missing(requestedPath, 'budget')
            continue
          }
          const one = (await readOneFile(requestedPath, input, room)) as {
            content?: unknown
            truncated?: boolean
          }
          // A window is not a batch entry. It is returned only when the caller
          // asked for a window, or when the FIRST file alone is bigger than the
          // whole call — then a window with its own offset/limit note is the only
          // answer available, and everything after it is listed anyway.
          if (one.truncated === true && !explicitWindow && files.length > 0) {
            missing(requestedPath, 'budget')
            continue
          }
          files.push(one)
        }
        const entryError = (reason: 'budget' | 'count'): string =>
          reason === 'count'
            ? `not returned: one read_file call returns at most ${MAX_BATCH_READ_FILES} files. Read this file in its own read_file call.`
            : `not returned: this call goes in order and has reached the ${Math.round(MAX_READ_CALL_CHARS / 1024)} KB one read_file result carries. Read this file in its own read_file call.`
        const build = (returned: unknown[]): Record<string, unknown> => {
          let returnedChars = 0
          let windowed = 0
          for (const f of returned) {
            const entry = f as { content?: unknown; truncated?: boolean }
            if (typeof entry.content === 'string') returnedChars += entry.content.length
            if (entry.truncated === true) windowed++
          }
          const size =
            `${Math.round(returnedChars / 1024)} KB of the ` +
            `${Math.round(MAX_READ_CALL_CHARS / 1024)} KB one read_file result carries`
          return {
            files: [
              ...returned,
              ...notReturned.map(({ path, reason }) => ({ path, error: entryError(reason) })),
            ],
            ...(notReturned.length
              ? {
                  note:
                    (windowed > 0
                      ? `Returned ${returned.length} of ${requested.length} files (${size}); the ` +
                        `${windowed} marked truncated is a first window — its own note names the next one. `
                      : `Returned whole: ${returned.length} of ${requested.length} files (${size}). `) +
                    'Not returned — read these next, in this order, in further read_file calls: ' +
                    `${notReturned.map((n) => n.path).join(', ')}.`,
                }
              : {}),
          }
        }
        let result = build(files)
        // The envelope is measured, not estimated: if the note and the entries for
        // the missing paths take more than their share, whole files — from the end
        // — move to the missing list until the result fits.
        while (
          notReturned.length > 0 &&
          files.length > 0 &&
          JSON.stringify(result).length > MAX_READ_CALL_CHARS
        ) {
          const last = files.pop() as { path?: unknown }
          notReturned.unshift({ path: String(last?.path ?? ''), reason: 'budget' })
          result = build(files)
        }
        return result
      }
      return readOneFile(input.path, input)
    },

    async write_file(input) {
      const emptyErr = emptyCallError(input, 'write_file')
      if (emptyErr) return { error: emptyErr }
      const argErr = pathArgError(input.path, 'write_file')
      if (argErr) return { error: argErr }
      const path = resolveWrite(input.path as string)
      const content = input.content as string
      if (content.length > MAX_WRITE_SIZE)
        return {
          error: `Content too large (${Math.round(content.length / 1024)}KB). Maximum is ${MAX_WRITE_SIZE / 1024 / 1024}MB.`,
        }
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        let oldContent: string | null = null
        try {
          oldContent = await backend.readFile(path)
        } catch (_error) {
          /* file doesn't exist yet — oldContent stays null */
        }

        if (onFileDiff) onFileDiff({ path, oldContent, newContent: content })

        await backend.writeFile(path, content)
        if (onAfterWrite) await onAfterWrite(path).catch(() => {})

        const finalContent = await backend.readFile(path).catch(() => content)
        const diff = computeDiff(oldContent, finalContent)

        if (onFileChange) onFileChange({ type: oldContent === null ? 'created' : 'modified', path })

        // The line count (and, for a small file, the numbered text) so the next
        // edit or read does not need a read_file just to learn line numbers.
        const echo = renderSmallFile(finalContent)
        return {
          path,
          ok: true,
          diff,
          totalLines: countLines(finalContent),
          ...(echo !== null ? { excerpt: sanitizeFileContent(echo, path) } : {}),
          ...(await syntaxErrorAfterWrite(path)),
        }
      } catch (e: unknown) {
        return { error: `Failed to write ${path}: ${(e as Error).message}` }
      }
    },

    async edit_file(input) {
      const emptyErr = emptyCallError(input, 'edit_file')
      if (emptyErr) return { error: emptyErr }
      const argErr = pathArgError(input.path, 'edit_file')
      if (argErr) return { error: argErr }
      const path = resolveWrite(input.path as string)
      // Support both formats: { replacements: [...] } (batch) and { old_string, new_string } (single, backwards-compatible)
      let replacements = input.replacements as
        | Array<{
            old_string: string
            new_string: string
            replace_all?: unknown
            replaceAll?: unknown
          }>
        | undefined
      // Accept the single format when BOTH are strings — `typeof` (not truthy) so
      // a deletion (new_string: "") is honoured rather than falling through to
      // "No replacements provided".
      if (
        !replacements?.length &&
        typeof input.old_string === 'string' &&
        typeof input.new_string === 'string'
      ) {
        replacements = [
          {
            old_string: input.old_string,
            new_string: input.new_string,
            replace_all: input.replace_all,
          },
        ]
      }
      if (!replacements?.length)
        return {
          error:
            'No replacements provided. Use { replacements: [{ old_string, new_string }] } or { old_string, new_string }.',
        }
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        let content = await backend.readFile(path)
        // A transiently-empty read here made every old_string "not found", which
        // steers the model to re-read and then rewrite a file it never saw. Same
        // verification as read_file: empty is only believed once it is confirmed.
        if (typeof content !== 'string' || content === '') {
          const verdict = await classifyEmptyRead(path, 'edit_file')
          if ('error' in verdict) return verdict
          content = verdict.content
        }
        const oldContent = content
        let alreadyApplied = 0
        // Replacements refused for changing the line break at old_string's boundary and
        // nothing else — reported by position, never applied (see below).
        const skipped: Array<{ position: number; shape: 'removed' | 'added' }> = []
        // Every replacement this batch refuses, collected rather than returned on the
        // first: a batch is atomic, so the other bad hunks are just as unreported, and
        // one-per-round-trip cost flash-m98 two full re-sends of a six-replacement
        // batch (the second bad hunk was not named until the first was fixed).
        const failures: Array<{ index: number; start: string; message: string }> = []
        /** How a failure names the replacement it is about: the head of its old_string. */
        const startOf = (text: string): string => text.split('\n')[0].trim().slice(0, 80)
        // Where each applied replacement landed, in the coordinates of the
        // latest content — rendered into the result so the model sees the edit.
        let spans: CharSpan[] = []

        // A replacement whose ONLY effect is the line break at old_string's boundary:
        // `new_string` is `old_string` minus its trailing newline (applying it runs the
        // line after it onto the last line) or `old_string` plus one (applying it moves
        // the rest of that line down). A weaker model sends the first as an "anchor" — it
        // repeats a line it means to keep, minus its `\n` — and the join is silent when
        // it still parses: flash-m28 merged two lines three times in one run, flash-m89
        // twice in two consecutive calls (comments.ts, then articles.ts), flash-m55,
        // m62 and m89 all paid a repair round trip for it. A real edit changes some other
        // character, so this costs nothing.
        const boundaryOnly = (oldText: string, newText: string): 'removed' | 'added' | null => {
          const oldBody = oldText.replace(/\r?\n$/, '')
          // `newText !== ''` keeps a deletion out of this: `old_string: "\n"` → `""` is a
          // real request to remove a blank line, and the notes below already cover it.
          if (newText !== '' && oldBody !== oldText && newText === oldBody) return 'removed'
          if (!oldText.endsWith('\n') && newText === `${oldText}\n`) return 'added'
          return null
        }

        for (const [
          index,
          {
            old_string: oldString,
            new_string: newString,
            replace_all: replaceAll,
            // Models sometimes send the camelCase spelling inside an item, where
            // the input normalizer (top-level keys only) does not reach.
            replaceAll: replaceAllCamel,
          },
        ] of replacements.entries()) {
          // Validate each replacement is well-formed BEFORE touching content. A
          // weak model sometimes emits a batch element missing a field or with a
          // non-string value; left unchecked that either crashes (`undefined`
          // method access) or silently inserts the literal "undefined" (a missing
          // new_string). Fail fast with an actionable message instead.
          if (typeof oldString !== 'string' || oldString === '' || typeof newString !== 'string') {
            failures.push({
              index: index + 1,
              start: typeof oldString === 'string' ? startOf(oldString) : '',
              message: `each replacement needs a non-empty string old_string and a string new_string (got old_string: ${oldString === '' ? 'empty' : typeof oldString}, new_string: ${typeof newString}). To delete text, pass new_string: "".`,
            })
            continue
          }
          const count = content.split(oldString).length - 1
          // The edit is ALREADY in the file: old_string is gone and a distinctive
          // new_string is there exactly once. The executor re-sends an edit it
          // made a few calls ago (it works from its memory of the file), and the
          // "not found" error cost it a read_file plus a retry each time — 6 to 11
          // times a build in X0 x30/x34. Report it as applied instead. Short or
          // repeated new_strings still error: they could be there by coincidence.
          if (
            count === 0 &&
            newString !== oldString &&
            newString.trim().length >= 20 &&
            content.split(newString).length - 1 === 1
          ) {
            alreadyApplied++
            continue
          }
          if (count === 0) {
            // A bare "old_string not found" gives the model nothing to correct, so
            // it retries blindly (the #1 edit_file failure mode). Diagnose WHY the
            // match failed and hand back the file's actual content so it fixes in
            // one retry instead of many.
            if (oldString.includes('\\n')) {
              failures.push({
                index: index + 1,
                start: startOf(oldString),
                message: `old_string not found in ${path} (hint: old_string contains literal "\\n" — use actual newlines in JSON strings, not escaped \\n)`,
              })
              continue
            }
            // Whitespace-only mismatch: the text is there but indentation/spacing
            // differs (tabs vs spaces, trailing whitespace). If a UNIQUE line-run
            // matches ignoring per-line whitespace, APPLY it instead of bouncing
            // the (weak) executor into a re-read/retry loop — the #1 edit_file
            // churn source. Uniqueness keeps this safe; ambiguous matches error.
            const fuzzy = whitespaceTolerantReplace(content, oldString, newString)
            if (fuzzy !== null) {
              spans = addChangeSpan(spans, content, fuzzy)
              content = fuzzy
              continue
            }
            const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim()
            const normOld = normalize(oldString)
            if (normOld && normalize(content).includes(normOld)) {
              failures.push({
                index: index + 1,
                start: startOf(oldString),
                message: `old_string not found in ${path} — a match exists but whitespace/indentation differs and is not unique enough to apply automatically. Re-read the file and copy the exact text (tabs vs spaces, trailing spaces, blank lines must match), or include more surrounding context.`,
              })
              continue
            }
            // Anchor probe: locate the target region by the most DISTINCTIVE line
            // of old_string (longest non-trivial line first, requiring a UNIQUE
            // file match), not just the first line. The first line is often a
            // generic token (`return (`, `<div>`, `}`) that either matches nowhere
            // or everywhere; when the model mis-remembers that line but a later,
            // more specific line (a JSX prop, an identifier) is intact, anchoring
            // on the distinctive line still finds the region. Show the file's real
            // content there so the model copies exact text in ONE retry. Only show
            // a UNIQUE match so the snippet is reliably the right place.
            const fileLines = content.split('\n')
            const showSnippet = (idx: number): string => {
              const start = Math.max(0, idx - 3)
              const snippet = fileLines
                .slice(start, idx + 8)
                .map((l, i) => `${start + i + 1}: ${l}`)
                .join('\n')
              return `old_string not found in ${path}. The file's ACTUAL content near your target (copy the exact text from here):\n${snippet}`
            }
            // An import block the model rebuilt in its own order: the linter's
            // import sort owns that order, so name it and show the real block. X1
            // flash-m42 sent the same block three times in three orders.
            // Only when old_string is import statements and nothing else.
            const imported = /^(?:\s*import\b[^;]*?\bfrom\s+(['"])([^'"]+)\1;?)+\s*$/.exec(
              oldString,
            )?.[2]
            if (imported) {
              const at = fileLines.findIndex(
                (l) => l.includes(`'${imported}'`) || l.includes(`"${imported}"`),
              )
              if (at >= 0) {
                let start = at
                while (start > 0 && !/^\s*import\b/.test(fileLines[start])) start--
                const block = fileLines
                  .slice(start, at + 1)
                  .map((l, i) => `${start + i + 1}: ${l}`)
                  .join('\n')
                failures.push({
                  index: index + 1,
                  start: startOf(oldString),
                  message:
                    `old_string not found in ${path}: it is an import block, and the linter's import ` +
                    `sort decides its order, so do not rebuild it. The file's import from ` +
                    `'${imported}' reads:\n${block}\nEdit one line of it, or add your import as a ` +
                    'new line and let the linter sort it.',
                })
                continue
              }
            }
            const distinctiveLines = [
              ...new Set(
                oldString
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.length >= 8),
              ),
            ].sort((a, b) => b.length - a.length)
            const oldLines = oldString.split('\n')
            // Whitespace is the one difference the model cannot see in its own
            // text, so make it visible when that is the whole difference.
            const visible = (l: string): string => l.replace(/ /g, '·').replace(/\t/g, '⇥')
            // Report where old_string and the file STOP agreeing, not where the
            // match starts. A snippet centred on the anchor is the part the model
            // already has right, so it re-sends the same old_string and fails the
            // same way (X0 m89: two failed edits, a whole-file re-read and a
            // rewrite, 9 s, for a divergence 35 lines below the anchor).
            const showDivergence = (base: number, k: number): string => {
              const expected = oldLines[k]
              const actual = fileLines[base + k] ?? '(end of file)'
              const whitespaceOnly = expected.replace(/\s/g, '') === actual.replace(/\s/g, '')
              let col = 0
              while (col < expected.length && col < actual.length && expected[col] === actual[col])
                col++
              const howFar = whitespaceOnly
                ? ' (whitespace only — · is a space, ⇥ a tab)'
                : col > 0
                  ? ` (first character difference at column ${col + 1})`
                  : ''
              const start = Math.max(0, base + k - 2)
              const snippet = fileLines
                .slice(start, base + k + 6)
                .map((l, i) => `${start + i + 1}: ${l}`)
                .join('\n')
              return (
                `old_string not found in ${path} — it matches the file through line ${base + k}, ` +
                `then diverges at your line ${k + 1} of ${oldLines.length}${howFar}.\n` +
                `Your old_string line ${k + 1}: ${whitespaceOnly ? visible(expected) : expected}\n` +
                `The file's line ${base + k + 1}: ${whitespaceOnly ? visible(actual) : actual}\n` +
                `The file's ACTUAL content near your target (copy the exact text from here):\n${snippet}`
              )
            }
            // The longest run of old_string lines that IS in the file decides which
            // alignment to report, so a later distinctive line can beat an earlier
            // one. k === 0 means nothing beyond the anchor itself lines up; only
            // then fall back to the old anchor snippet.
            let best: { base: number; k: number } | null = null
            let firstUniqueHit: number | null = null
            for (const anchor of distinctiveLines) {
              const hits = fileLines.reduce<number[]>((acc, l, i) => {
                if (l.includes(anchor)) acc.push(i)
                return acc
              }, [])
              if (hits.length !== 1) continue
              if (firstUniqueHit === null) firstUniqueHit = hits[0]
              const base = hits[0] - oldLines.findIndex((l) => l.trim() === anchor)
              if (base < 0) continue
              // Exact comparison: a line that differs only in trailing whitespace
              // is itself a reason the exact match failed, and it is invisible in
              // the model's own text — report it as the divergence (the message
              // renders it with · for space).
              let k = 0
              while (k < oldLines.length && fileLines[base + k] === oldLines[k]) {
                k++
              }
              if (k > 0 && k < oldLines.length && (best === null || k > best.k)) best = { base, k }
            }
            if (best) {
              failures.push({
                index: index + 1,
                start: startOf(oldString),
                message: showDivergence(best.base, best.k),
              })
              continue
            }
            if (firstUniqueHit !== null) {
              failures.push({
                index: index + 1,
                start: startOf(oldString),
                message: showSnippet(firstUniqueHit),
              })
              continue
            }
            // Fallback: the first non-blank line, even if not unique (better than a
            // bare "re-read" when the model just needs to see nearby real content).
            const firstLine = oldString
              .split('\n')
              .find((l) => l.trim().length > 0)
              ?.trim()
            if (firstLine) {
              const idx = fileLines.findIndex((l) => l.includes(firstLine))
              if (idx >= 0) {
                failures.push({
                  index: index + 1,
                  start: startOf(oldString),
                  message: showSnippet(idx),
                })
                continue
              }
            }
            // Nothing anchored. Say WHICH of the two situations this is — they
            // call for different next moves, and the old message implied the
            // first while being returned for both. Measured across six agent
            // runs, `old_string not found` was the largest remaining tool-error
            // class (15 of 64) and every one of these fell through to a bare
            // "re-read and copy the exact text", which is wrong advice when the
            // text is not in the file at all.
            const anchorsPresent = distinctiveLines.some((anchor) =>
              fileLines.some((l) => l.includes(anchor)),
            )
            failures.push({
              index: index + 1,
              start: startOf(oldString),
              message: !anchorsPresent
                ? `old_string not found in ${path} — and NONE of its lines appear anywhere in ` +
                  `that file, so this is not a whitespace problem. Either the edit was already ` +
                  `applied, or this is the wrong file. read_file it and look before trying ` +
                  `again; do not retry the same old_string.`
                : `old_string not found in ${path}. Parts of it ARE in the file but no single ` +
                  `line is distinctive enough to locate the target. read_file the region you ` +
                  `mean and copy old_string verbatim from what it returns — including ` +
                  `indentation — or include more surrounding context to make it unique.`,
            })
            continue
          }
          if (count > 1 && (replaceAll === true || replaceAllCamel === true)) {
            // Every occurrence, by split/join — never String.replace, whose
            // replacement string treats `          if (count > 1) {
            // Say WHERE,` and friends as patterns (see below).
            const replaced = content.split(oldString).join(newString)
            spans = addChangeSpan(spans, content, replaced)
            content = replaced
            continue
          }
          if (count > 1) {
            // Say WHERE, so the retry can widen old_string around the one it means.
            const lines: number[] = []
            for (
              let at = content.indexOf(oldString);
              at >= 0 && lines.length < 10;
              at = content.indexOf(oldString, at + 1)
            )
              lines.push(content.slice(0, at).split('\n').length)
            failures.push({
              index: index + 1,
              start: startOf(oldString),
              message: `old_string found ${count} times in ${path} (starting at lines ${lines.join(', ')}${count > lines.length ? ', …' : ''}) — must be unique. Include more surrounding context from the one you mean, or set replace_all: true on this replacement to change every occurrence.`,
            })
            continue
          }
          // Splice by index rather than `content.replace(oldString, newString)`:
          // String.replace treats `$&`, `$$`, `` $` ``, `$'` in the REPLACEMENT as
          // special patterns, so a new_string containing regex-replacement code
          // (`'$&!'`) or literal dollars (`"$$$"`) would be silently corrupted —
          // a self-inflicted syntax error written with ok:true that the executor
          // then can't locate. count === 1 here, so indexOf is the unique site.
          const at = content.indexOf(oldString)
          // Refuse a replacement whose only effect is the line break at the boundary,
          // INSTEAD of applying it (flash-m89 +08:32 left `function pageLimit(req): number
          // {  const raw = …` on one line and +07:25 left a comment handler unparseable,
          // twice in two calls, and the API was down between the pair). The file's own
          // next character is the evidence that decides it: text on the same line means
          // the break is moving across lines (a join, or a split), which the shape of the
          // replacement says the model did not ask for. At a line boundary — a blank line
          // after it, or the end of the file — nothing crosses lines and the edit stands.
          const boundary = boundaryOnly(oldString, newString)
          const after = content[at + oldString.length]
          if (boundary !== null && after !== undefined && after !== '\n') {
            skipped.push({ position: index + 1, shape: boundary })
            continue
          }
          const spliced = content.slice(0, at) + newString + content.slice(at + oldString.length)
          spans = addChangeSpan(spans, content, spliced)
          content = spliced
        }

        // Every replacement was checked before this: a batch that refuses ANY of them
        // writes nothing, so the ones that DID match are just as unreported as the ones
        // that did not — and naming them one per round trip cost flash-m98 two full
        // re-sends of a six-replacement batch. Nothing is written here: the file on disk
        // is the original, and the model fixes all of them in one retry.
        if (failures.length)
          return { error: batchFailureError(path, replacements.length, failures) }

        // One line per refused replacement: what it would have done, and the two ways to
        // say it on purpose. The rest of the batch is applied — the second half of the pair
        // above (`comments.ts`'s third replacement, `articles.ts`'s own text edit) anchors
        // on text a joined file no longer has, so applying the join takes the batch down
        // with it.
        const skippedNote =
          skipped.length === 0
            ? null
            : skipped
                .map(({ position, shape }) =>
                  shape === 'removed'
                    ? `replacement ${position} was skipped, nothing was changed for it: its new_string is its old_string minus the trailing newline, so the only thing it changes is the line break between that text and the line after it — applying it would run the two lines together. To join two lines on purpose, include the next line in old_string.`
                    : `replacement ${position} was skipped, nothing was changed for it: its new_string is its old_string plus a trailing newline, so the only thing it changes is the line break after that text — applying it would move the rest of that line down. To split a line on purpose, include the text that follows it in old_string.`,
                )
                .join('\n')

        const alreadyNote =
          alreadyApplied > 0
            ? `${alreadyApplied} of these edits ${alreadyApplied === 1 ? 'was' : 'were'} already in the file (its new_string is there and its old_string is not) — nothing to do for ${alreadyApplied === 1 ? 'it' : 'them'}.`
            : null
        if (content === oldContent) {
          // A replacement whose new_string IS its old_string changes nothing; `ok` alone read
          // as a fix applied (X1 flash-m51).
          const identical = replacements.filter(
            (r) => typeof r.old_string === 'string' && r.old_string === r.new_string,
          ).length
          const note =
            alreadyNote ??
            (identical > 0
              ? `Nothing changed: ${identical === 1 ? 'the replacement’s new_string is' : `${identical} replacements’ new_string are`} identical to old_string, so the file is exactly as it was. Write the text you want in new_string.`
              : 'Nothing changed: the file is exactly as it was.')
          // A refused boundary-newline replacement is why nothing changed: "the file is
          // exactly as it was" would read as "your edit landed".
          return {
            path,
            ok: true,
            replacementsApplied: 0,
            alreadyApplied,
            note: skippedNote ?? note,
            ...(skippedNote ? { skippedNote } : {}),
          }
        }

        if (onFileDiff) onFileDiff({ path, oldContent, newContent: content })

        await backend.writeFile(path, content)
        if (onAfterWrite) await onAfterWrite(path).catch(() => {})

        if (onFileChange) onFileChange({ type: 'modified', path })

        // Show the edited regions as they now read, numbered. Measured: most
        // re-reads of a just-edited file were to see the result or to find line
        // numbers for the next edit — a full round-trip each. If an after-write
        // hook rewrote the file (a formatter), show what is really on disk.
        let finalContent = content
        if (onAfterWrite) {
          // A failed re-read just means the excerpt shows what was written.
          const reread = await backend.readFile(path).catch(() => null)
          if (typeof reread === 'string' && reread !== '' && reread !== content) {
            finalContent = reread
            const whole = changedSpan(oldContent, reread)
            spans = whole ? [whole] : []
          }
        }
        const excerpt = renderEditExcerpt(finalContent, spans)
        // A replacement whose old text ended in a newline and whose new text does not
        // joins the line after it onto its last line. Applied as written, but said:
        // flash-m28 saw two lines merged only one round trip later. The refused ones
        // above were never applied, so what the file holds is not their work.
        const refused = new Set(skipped.map((s) => s.position))
        const dropped = replacements
          .map((r, i) => ({ ...r, position: i + 1 }))
          .filter(
            (r) =>
              !refused.has(r.position) &&
              typeof r.old_string === 'string' &&
              typeof r.new_string === 'string' &&
              r.old_string.endsWith('\n') &&
              r.new_string !== '' &&
              !r.new_string.endsWith('\n'),
          )
        const syntax = await syntaxErrorAfterWrite(path)
        // Those two facts are ONE accident, and reported apart the model repairs the
        // wrong one: flash-m55 dropped the boundary on two consecutive edit_file calls,
        // both left `handlers/conduit.ts` unparseable, and it fixed the fused LINE's
        // text — which re-fused the next line in the same batch. When the parse error
        // follows a dropped newline, name the fused line and the single edit that
        // undoes it, instead of a style note beside an unrelated-looking parse error.
        const which =
          dropped.length === 1
            ? `replacement ${dropped[0].position}`
            : `replacements ${dropped.map((r) => r.position).join(', ')}`
        const located = dropped.flatMap((r) => {
          const line = fusedLine(finalContent, r.new_string)
          return line ? [line] : []
        })
        const fused = located.slice(0, 3)
        const fusedOmitted = located.length - fused.length
        const shownFused = fused
          .map((l) => `  ${l.line}: ${l.text.length > 200 ? `${l.text.slice(0, 200)}…` : l.text}`)
          .join('\n')
        const fusedNote =
          syntax.syntaxError && dropped.length > 0
            ? 'The file no longer parses after this change, and ' +
              `${which} removed the line break that followed the replaced text — so the next line ` +
              'now continues on the line before it, and that fused line is what the parser rejects:\n' +
              (shownFused || `  (not located as the file now reads — read_file ${path})`) +
              (fusedOmitted > 0
                ? `\n  (${fusedOmitted} more fused line(s) — read_file ${path})`
                : '') +
              `\nRe-send ${which} with the trailing newline restored on new_string (change nothing ` +
              "else about it). Editing the FUSED LINE's text instead fuses the next line the same " +
              `way (flash-m55: three edits in a row).\n${syntax.syntaxError}`
            : null

        return {
          path,
          ok: true,
          replacementsApplied: replacements.length - alreadyApplied - skipped.length,
          ...(fusedNote
            ? { syntaxError: fusedNote }
            : {
                // The evidence for this note is `located`, not `dropped`: a drop joins
                // two lines only when something other than a newline (or EOF) follows
                // the replaced text. A weaker model writes one line's change as two
                // replacements — the line including its trailing newline, then the
                // line's own text — and the newline it consumed ended that line with a
                // BLANK line after it, so nothing joined while the model was told it
                // had: it spent a new round trip putting the blank line back
                // (flash-m62). Say nothing when nothing was joined.
                ...(dropped.length > 0 && located.length > 0
                  ? {
                      newlineNote: `${dropped.length === 1 ? 'A replacement' : `${dropped.length} replacements`} removed the line break after the replaced text (old_string ended with a newline, new_string does not), so the next line now continues on the same line. Check the excerpt; add the newline back if that was not intended.`,
                    }
                  : {}),
                ...syntax,
              }),
          ...(skippedNote ? { skippedNote } : {}),
          ...(alreadyApplied > 0 ? { alreadyApplied, note: alreadyNote } : {}),
          totalLines: countLines(finalContent),
          ...(excerpt ? { excerpt: sanitizeFileContent(excerpt, path) } : {}),
        }
      } catch (e: unknown) {
        return { error: `Failed to edit ${path}: ${(e as Error).message}` }
      }
    },

    async search_files(input) {
      const pattern = input.pattern as string
      const path = resolve((input.path as string) || '')
      const include = input.include as string | undefined
      // Lines of surrounding context per match. The executor reaches for
      // `grep -A 20` through the shell because this tool could not express it;
      // bounded so a broad pattern cannot pull the whole tree into the reply.
      const rawContext = Number(input.contextLines ?? input.context)
      const contextLines = Number.isFinite(rawContext)
        ? Math.min(Math.max(Math.trunc(rawContext), 0), MAX_SEARCH_CONTEXT_LINES)
        : 0

      if (include && !isValidGlob(include))
        return {
          error: 'Invalid include glob pattern. Allowed: alphanumeric and @ * ? . _ - / [ ] ( ).',
        }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const globArg = include ? `--include=${shellQuote(include)}` : ''
        // With context, grep emits `file-line-content` for context lines and
        // `file:line:content` for matches, plus `--` group separators. Both
        // shapes are parsed below; without context the output is unchanged.
        const contextArg = contextLines > 0 ? `-C ${contextLines}` : ''
        // Extended regex, the dialect a pattern like `useTransitions|BrowserRouter`
        // is written in: as a basic regex its `|` was a literal character and the
        // search found nothing (X1 run sol-m07). A pattern that is not a valid
        // extended regex (`foo(` — an unbalanced paren) makes grep exit 2; it is
        // then searched as the plain text it was meant as.
        // -H: a search scoped to one file printed `line:content` with no file, and every match
        // came back `{file: "", line: 0}` (X1 flash-m62).
        const grepArgs = `-rnH ${globArg} ${contextArg} ${grepExcludeArgs(path)} --max-count=${MAX_SEARCH_RESULTS} -- ${shellQuote(pattern)} ${shellQuote(path)}`
        const result = await backend.run(
          `{ grep -E ${grepArgs}; s=$?; if [ "$s" -eq 2 ]; then grep -F ${grepArgs}; fi; } 2>/dev/null || true`,
          { timeout: SEARCH_TIMEOUT_MS },
        )
        // grep emits `<file>:<line>:<content>`, so redaction runs PER MATCH on the
        // content alone: the file prefix would otherwise hide an env assignment from
        // the line-anchored env pattern, and knowing each match's own path is what
        // lets a hit inside a .env get full treatment while source stays verbatim.
        const output = stripControlChars(result.stdout.trim())
        if (!output) return { pattern, path, matches: [] }

        const cap =
          contextLines > 0 ? MAX_SEARCH_RESULTS * (contextLines * 2 + 2) : MAX_SEARCH_RESULTS
        const matches = output
          .split('\n')
          .slice(0, cap)
          .filter((line) => line !== '--')
          .map((line) => {
            const hit = line.match(/^(.+?):(\d+):(.*)$/)
            if (hit) {
              return {
                file: hit[1],
                line: parseInt(hit[2]),
                content: sanitizeFileContent(hit[3], hit[1]),
                ...(contextLines > 0 ? { match: true } : {}),
              }
            }
            const ctx = contextLines > 0 ? line.match(/^(.+?)-(\d+)-(.*)$/) : null
            if (ctx) {
              return {
                file: ctx[1],
                line: parseInt(ctx[2]),
                content: sanitizeFileContent(ctx[3], ctx[1]),
                match: false,
              }
            }
            return { file: '', line: 0, content: sanitizeFileContent(line, '') }
          })
        return { pattern, path, matches }
      } catch (e: unknown) {
        if (isCommandTimeout(e))
          return {
            error: searchTimeoutError(
              'search_files',
              path,
              pattern,
              SEARCH_TIMEOUT_MS / 1000,
              `Give \`path\` the subdirectory you mean and narrow with \`include\` ` +
                `(e.g. "*.ts"), or use find_files with the directory in the pattern.`,
            ),
          }
        return { error: `Search failed: ${(e as Error).message}` }
      }
    },

    async find_files(input) {
      const pattern = input.pattern as string
      const path = resolve((input.path as string) || '')

      // A missing/empty pattern would otherwise reach shellQuote(undefined) and throw
      // the cryptic "Cannot read properties of undefined (reading 'replace')" — give the
      // executor a clear, actionable error so it can retry instead of losing the call.
      if (typeof pattern !== 'string' || pattern.trim() === '')
        return {
          error:
            'find_files requires a non-empty "pattern" argument (a filename or glob, e.g. "*.tsx" or "index.ts").',
        }
      if (!isValidGlob(pattern))
        return {
          error:
            'Invalid pattern. Allowed: alphanumeric and @ * ? . _ - / [ ] ( ) ' +
            '(brackets/parens support Next.js route dirs like [id] or (group)).',
        }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      // The directory the PATTERN itself names (`node_modules` +
      // `@molecule/api-resource-user/dist/*.d.ts`) becomes the search root. Matched
      // against the whole path with an implicit "any parent" anchor, the pattern
      // made `find` visit every entry below `path` — the whole dependency tree,
      // which hit the 10 s deadline with no result at all while the one directory
      // the model meant answered a `list_files` instantly (xr-molecule-flash-m94).
      // A bare first segment (`helpers/*`) is left alone on purpose: it means "any
      // `helpers/` below the root" (xr-molecule-flash-m77, see literalDirPrefix).
      const prefixDir = literalDirPrefix(pattern)
      let findRoot = path
      let findArgs = findPatternArgs(pattern)
      let missingPrefix: string | undefined
      try {
        if (prefixDir) {
          const candidate = `${path.replace(/\/+$/, '')}/${prefixDir}`
          const probe = await backend.run(`test -d ${shellQuote(candidate)}`, {
            timeout: SEARCH_TIMEOUT_MS,
          })
          if (probe.exitCode === 0) {
            findRoot = candidate
            // The remainder keeps the `-path` form: `*` crosses `/`, so a `.d.ts`
            // in `dist/utilities/` is still found (see findPathArgs).
            findArgs = findPathArgs(pattern.replace(/^(?:\.?\/)+/, '').slice(prefixDir.length + 1))
          } else {
            missingPrefix = `"${candidate}" does not exist; searched all of ${path}.`
          }
        }
        // `findPatternArgs`, not `-name`: a pattern with a `/` in it
        // (`helpers/*`, `e2e/*.spec.ts`) matched nothing at all, because `-name`
        // compares it against the basename (xr-molecule-flash-m77).
        const result = await backend.run(
          `find ${shellQuote(findRoot)} ${findPruneArgs(findRoot)} ${findArgs} -print 2>/dev/null | head -${MAX_FIND_RESULTS}`,
          { timeout: SEARCH_TIMEOUT_MS },
        )
        const files = result.stdout.trim().split('\n').filter(Boolean)
        // A slash changes what the pattern means — the whole path, not the file
        // name — and an empty result does not say so, so the model reads it as
        // "no such file" and goes looking elsewhere. Name the rule on the miss.
        const missNote =
          files.length === 0 && pattern.includes('/')
            ? `"${pattern}" contains a "/", so it was matched against each file's PATH below ${path} (a leading "*/" is implicit), not against the file name — no path matched it. list_files shows the real entries.`
            : undefined
        const notes = [missingPrefix, missNote].filter((n): n is string => Boolean(n))
        return { pattern, path, files, ...(notes.length ? { note: notes.join(' ') } : {}) }
      } catch (e: unknown) {
        if (isCommandTimeout(e))
          return {
            error: searchTimeoutError(
              'find_files',
              findRoot === path ? path : `${findRoot} (under ${path})`,
              pattern,
              SEARCH_TIMEOUT_MS / 1000,
              `Give \`path\` the directory you mean (a package's own folder rather than all of ` +
                `${path}) or use list_files on it, and keep the pattern narrow.`,
            ),
          }
        return { error: `Find failed: ${(e as Error).message}` }
      }
    },

    async create_directory(input) {
      const path = resolveWrite(input.path as string)
      const parentPath = path.substring(0, path.lastIndexOf('/')) || root
      const symlinkErr = await checkSymlink(parentPath)
      if (symlinkErr) return { error: symlinkErr }
      try {
        await backend.run(`mkdir -p ${shellQuote(path)}`)
        if (onFileChange) onFileChange({ type: 'created', path })
        return { path, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to create directory ${path}: ${(e as Error).message}` }
      }
    },

    async rename_file(input) {
      // Both ends: moving a package's file OUT is as much a change to the installed
      // package as moving one in.
      const oldPath = resolveWrite(input.old_path as string)
      const newPath = resolveWrite(input.new_path as string)
      const oldSymlinkErr = await checkSymlink(oldPath)
      if (oldSymlinkErr) return { error: oldSymlinkErr }
      const newParent = newPath.substring(0, newPath.lastIndexOf('/')) || root
      const newSymlinkErr = await checkSymlink(newParent)
      if (newSymlinkErr) return { error: newSymlinkErr }
      try {
        await backend.run(`mkdir -p ${shellQuote(newPath.substring(0, newPath.lastIndexOf('/')))}`)
        await backend.run(`mv ${shellQuote(oldPath)} ${shellQuote(newPath)}`)
        if (onFileChange) {
          onFileChange({ type: 'deleted', path: oldPath })
          onFileChange({ type: 'created', path: newPath })
        }
        return { old_path: oldPath, new_path: newPath, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to rename ${oldPath}: ${(e as Error).message}` }
      }
    },

    async delete_file(input) {
      const path = resolveWrite(input.path as string)
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        await backend.deleteFile(path)
        if (onFileChange) onFileChange({ type: 'deleted', path })
        return { path, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to delete ${path}: ${(e as Error).message}` }
      }
    },

    async exec_command(input) {
      const rawCommand = input.command as string
      const cwd = input.cwd ? resolve(input.cwd as string, 'cwd') : root

      // A model that sent the command under another name (`cmd`, `script`, …)
      // has already been normalized by guardToolExecute; reaching here with
      // nothing means there is genuinely no command. Say so in the terms that
      // let the model fix it. It used to fall through to
      // checkBlockedCommand(undefined) and die with "Cannot read properties of
      // undefined (reading 'match')" — the executor read that as a broken shell,
      // stopped verifying, and ended the turn claiming all checks passed while
      // seven acceptance checks failed (X0 rehearsal 83, 2026-09-16).
      if (typeof rawCommand !== 'string' || rawCommand.trim() === '') {
        return { error: missingParamError(TOOL_SCHEMAS.exec_command, input, ['command']) }
      }

      if (blockDangerousCommands) {
        const blocked = checkBlockedCommand(rawCommand)
        if (blocked) return { error: blocked }
      }

      // Consumer-specific guard (see ToolBuildConfig.blockCommand) — an environment can
      // veto commands the generic dangerous-command check can't know about.
      if (blockCommand) {
        const blocked = blockCommand(rawCommand, cwd)
        if (blocked) return { error: blocked }
      }

      // A diagnosis run of a suite whose config records no trace gets one recorded anyway
      // (`diagnosisTraceCommand`, trace-artifacts.ts): the failing tests' own network log is what
      // tells a swallowed request error from a selector, and X1 xr-molecule-flash-m100 spent the
      // last minutes of its run hand-writing Chromium probes for what the trace it never wrote
      // down would have said. The whole rule is that function's; the proof run is never touched.
      const traced = await diagnosisTraceCommand({
        command: rawCommand,
        cwd,
        readFile: (path) => backend.readFile(path),
      })
      const command = traced.command

      // Detached: start it, hand back a handle, let the turn continue. A
      // command that outlives the tool's ceiling is otherwise simply lost —
      // measured across six agent runs, ten of them were killed at the
      // ceiling for 49 minutes, 11% of all wall clock, every one returning
      // nothing because it was piped through tail/grep. A full test suite or a
      // slow production build could not be run at all, so the executor ran
      // smaller and smaller pieces, or reported a result it never saw.
      //
      // Output goes to a file the executor reads with read_file (which takes
      // offset/limit, so a long log is cheap to follow), and an `.exit` file
      // appears when it finishes — so "is it done?" is a read, not a poll that
      // blocks a turn.
      // A command that declares its OWN budget larger than this tool's ceiling,
      // and whose output is withheld until the pipeline ends, would be stopped
      // at the ceiling having printed nothing. It used to be REFUSED ("Nothing
      // was run") — which cost the executor a whole step in 48 of 48
      // conversations that tried one (production analytics, 2026-09-26). It
      // now runs in the background instead: the step does the work, and the
      // executor gets a handle to wait on.
      const ceilingSeconds = commandBudgetMs ? Math.max(1, Math.round(commandBudgetMs / 1000)) : 0
      const declaredSeconds = commandBudgetMs ? declaredBudgetSeconds(command, input.timeout) : 0
      // A Playwright run with its output held back by a pipe is backgrounded without
      // declaring a budget too: a suite routinely outlasts the ceiling, and killed there
      // behind `| tail` it returns nothing (X1 flash-m29 lost a 290 s run that way).
      // A short one still comes back as a foreground result, through the grace below.
      // A Playwright command that runs no test is not one of these either: `playwright test
      // --list` piped through `tail` takes two seconds, and backgrounding it costs the round
      // trip `wait_for_task` owes the executor (flash-m79's config check).
      const overCeiling =
        commandBudgetMs !== undefined &&
        ((outputIsWithheldUntilExit(command) &&
          (declaredSeconds > ceilingSeconds || isPlaywrightRunCommand(command))) ||
          // A redirected Playwright run shows nothing either (`> out.txt`), and was killed at
          // the ceiling with 38 tests unrun (X1 flash-m36).
          (isPlaywrightRunCommand(command) && outputRedirectTarget(command) !== null))

      if (input.run_in_background === true || overCeiling) {
        const id = `mol-bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const log = `/tmp/${id}.log`
        const exitFile = `/tmp/${id}.exit`
        const script = `/tmp/${id}.sh`
        try {
          // The command goes to a FILE rather than through nested quoting:
          // an executor's commands routinely carry quotes, heredocs and
          // newlines, and re-quoting them into a detached `sh -c` is how a
          // background runner corrupts the very thing it is running.
          // Keep the log growing while it runs (see streamingBackgroundCommand):
          // an empty log is what wait_for_task reads as stuck.
          const streaming = streamingBackgroundCommand(command)
          // …and the trace flag this tool added (above), which the streaming rewrite never saw:
          // its changes are what this branch reports the run's own settings in.
          if (traced.change) streaming.changes.unshift(traced.change)
          // A whole-suite run starves the sandbox it shares with the app and with
          // every command the executor sends next, so it starts at lower CPU and
          // IO priority (see suiteRunPriorityLaunch). Foreground runs are never
          // touched, and a sandbox without the tools runs it unchanged.
          const prioritized = suiteRunPriorityLaunch(
            streaming.command,
            `sh ${script} > ${log} 2>&1; echo $? > ${exitFile}`,
          )
          const ownTarget = outputRedirectTarget(streaming.command)
          const ownFile = ownTarget
            ? ownTarget.startsWith('/')
              ? ownTarget
              : `${cwd}/${ownTarget}`
            : null
          if (ownFile) outputFileByTask.set(id, ownFile)
          runByTask.set(id, { command: streaming.command, cwd })
          await backend.writeFile(script, `${streaming.command}\n`)
          // The clock the grace return below reports a stopped run against: the command is
          // started here, and how long it ran is what a stop at its own bound is read from.
          const launchedAt = Date.now()
          await backend.run(
            `nohup sh -c ${shellQuote(prioritized.launch)} ` +
              `> /dev/null 2>&1 & echo $! > /tmp/${id}.pid`,
            { cwd, timeout: 15_000 },
          )
          // A command backgrounded only for the budget it ASKED for often ends in
          // seconds (a Hurl suite: 37 ms). Handing it back as a task cost a
          // wait_for_task round trip each time (X1 flash-m20, twice in ten
          // minutes), so wait a short grace first and return a finished command
          // exactly as a foreground run returns.
          if (overCeiling && input.run_in_background !== true) {
            const graceUntil = Date.now() + overCeilingGraceMs
            while (Date.now() < graceUntil) {
              let code: number | null = null
              try {
                const raw = await backend.readFile(exitFile)
                const parsed = Number.parseInt(raw.trim(), 10)
                code = Number.isFinite(parsed) ? parsed : 0
              } catch (_error) {
                // No exit file yet: still running.
                code = null
              }
              if (code !== null) {
                let output = ''
                try {
                  output = await backend.readFile(log)
                } catch (_error) {
                  // Finished without writing anything: an empty output is still a result.
                  output = ''
                }
                const stdout = sanitizeOutput(truncateMiddle(output, MAX_OUTPUT_SIZE))
                // A grace return is a foreground-shaped result, so it carries the same stop: this
                // command was started because its output is withheld until it ends (a Playwright
                // run behind a pipe), and a run that printed a tally accounting for fewer tests
                // than it announced was stopped — not "Finished … with exit code 0" (the pipeline's
                // 0 is the filter's). No tool budget applies to a detached run, so the command's
                // own `timeout` is the only bound here.
                const cut = commandCutRun(
                  command,
                  { exitCode: code, stdout, stderr: '' },
                  Date.now() - launchedAt,
                  0,
                  output,
                )
                if (cut) {
                  return {
                    stdout,
                    stderr: '',
                    status: CUT_AT_BUDGET,
                    exitCode: cut.exitCode,
                    cutRun: cut,
                    ...(output.length > MAX_OUTPUT_SIZE
                      ? { truncated: true, fullOutput: log }
                      : {}),
                    error:
                      `${cutRunSentence(cut)} ` +
                      (isSuiteRunCommand(command) ? SUITE_OVER_BUDGET_ADVICE : SPLIT_WORK_ADVICE),
                  }
                }
                return {
                  stdout,
                  stderr: '',
                  exitCode: code,
                  ...(output.length > MAX_OUTPUT_SIZE ? { truncated: true, fullOutput: log } : {}),
                  ...(streaming.changes.length ? { note: streaming.changes.join(' ') } : {}),
                }
              }
              await new Promise((r) => setTimeout(r, 1_500))
            }
          }
          return {
            taskId: id,
            log,
            exitFile,
            note:
              (overCeiling
                ? declaredSeconds > ceilingSeconds
                  ? `This command asks for ${declaredSeconds}s, more than this tool's ${ceilingSeconds}s, and its ` +
                    'output only appears when it ends — so it was started in the background instead. '
                  : `A Playwright run can take longer than this tool's ${ceilingSeconds}s, and behind a pipe its ` +
                    'output only appears when it ends — so it was started in the background instead. '
                : '') +
              `Started in the background. Its output is written to ${log} and comes back as the ` +
              `stdout of wait_for_task when the command finishes (read_file cannot reach /tmp — ` +
              `to peek mid-run, exec_command: tail ${log}). If you have other work, do it and ` +
              `check back. If you need this result before you can continue, call wait_for_task ` +
              `with this taskId — never sleep and read the log by hand.` +
              (streaming.changes.length ? ` ${streaming.changes.join(' ')}` : '') +
              (prioritized.note ? ` ${prioritized.note}` : '') +
              (ownFile
                ? ` This command writes its own output to ${ownFile}, so the task log stays empty: peek with exec_command: tail ${ownFile}.`
                : ''),
          }
        } catch (e: unknown) {
          return {
            error: `Could not start the background command: ${(e as Error).message}`,
          }
        }
      }

      try {
        // exec_command runs installs/builds/tests — the old 30s hardcap killed
        // those spuriously; use the (generous, caller-configurable) budget.
        // With a command budget, the BACKEND runs the command under `timeout` in
        // its own shell (after any environment a consumer sources around it): an
        // overrun is stopped there, the whole process group, and everything
        // printed until then comes back with exit code 124 — instead of an outer
        // timeout discarding the run and its output together.
        const budgetSeconds = commandBudgetMs ? Math.max(1, Math.round(commandBudgetMs / 1000)) : 0

        // A requested budget is honored DOWNWARD only. The model used to send
        // `timeout: 900000` for a test suite, the field was not declared so it
        // was silently dropped, and the command was killed at the ceiling with
        // no hint that a ceiling existed — costing a full budget per attempt
        // before the overrun message could teach anything (X0 R83/R84). Now the
        // ceiling is reported the FIRST time a larger one is asked for.
        const requestedMs = Number(input.timeout)
        const wantsMore =
          Number.isFinite(requestedMs) && requestedMs > 0 && requestedMs > (commandBudgetMs ?? 0)
        const effectiveBudgetMs =
          Number.isFinite(requestedMs) && requestedMs > 0 && commandBudgetMs
            ? Math.min(requestedMs, commandBudgetMs)
            : commandBudgetMs
        const startedAt = Date.now()
        const result = await backend.run(command, {
          cwd,
          timeout: execTimeoutMs,
          ...(effectiveBudgetMs ? { budgetMs: effectiveBudgetMs } : {}),
        })
        const elapsedMs = Date.now() - startedAt
        // The clamped ask is only worth a line when the clamp was felt: a command
        // that asked for 600 s and finished in 25 s says nothing about splitting
        // work, and the note read as a warning about a run that had already
        // finished cleanly (xr-molecule-flash-m83 +53:11 — a Hurl run, 25 s).
        // Half the budget is the line; below it no smaller unit would have been
        // chosen any differently. A run that actually hit the ceiling is answered
        // by the exit-124 message below, not by this note.
        const ceilingNote =
          wantsMore &&
          budgetSeconds &&
          effectiveBudgetMs &&
          elapsedMs >= effectiveBudgetMs * CEILING_NOTE_MIN_USED
            ? `You asked for ${Math.round(requestedMs / 1000)}s; this tool's ceiling is ${budgetSeconds}s. ` +
              'Split the work into smaller commands (one test file, one build step) rather than ' +
              're-running the same long one.'
            : null
        // truncateMiddle (not truncate): a failing build/test/migration puts its
        // error at the TAIL, so keep the head AND the tail — head-only truncation
        // strands the executor with passing progress and no failure reason.
        // A command that only prints source files returns file content: the code-safe grade,
        // as read_file uses (utilities.ts printsOnlySource).
        const grade = printsOnlySource(command)
          ? (s: string): string => sanitizeFileContent(s, 'printed.ts')
          : sanitizeOutput
        const stdout = grade(truncateMiddle(result.stdout, MAX_OUTPUT_SIZE))
        const stderr = sanitizeOutput(truncateMiddle(result.stderr, MAX_OUTPUT_SIZE))
        // A run a budget stopped is NOT a run that ended: it reports `status: 'cut_at_budget'`,
        // never a 0 the pipeline produced, and names how far it got. Read from the command, the
        // output and the clock in one place (cut-run.ts) so every reader of a run's verdict reads
        // the same state (X1 xr-molecule-flash-m93: `timeout 280 hurl … | tail -60` came back
        // `exitCode: 0` after 284 s and four of thirteen files, and the executor re-sent it).
        const cut = commandCutRun(
          command,
          { exitCode: result.exitCode, stdout, stderr },
          elapsedMs,
          budgetSeconds,
          // Detection reads the RAW output: `truncateMiddle` keeps the head and the tail, and the
          // runner's announcement (`Running 139 tests using 1 worker`) is the first line a long run
          // prints — the one a size cap drops first. Only the counts and the tally come from here;
          // what the result quotes is still the sanitized, truncated text.
          `${result.stdout}\n${result.stderr}`,
        )
        if (cut) {
          const cutLead = cutRunSentence(cut)
          return {
            stdout,
            stderr,
            status: CUT_AT_BUDGET,
            exitCode: cut.exitCode,
            // The facts, so a reader that can also see the suite itself (its own `.hurl` file
            // count) says the same sentence with the total the output alone cannot give.
            cutRun: cut,
            error:
              `${cutLead} ` +
              // The tool's own budget stopping a run that printed nothing: keep the sentence that
              // says why the output is empty, since nothing else in the result can say it.
              (cut.stoppedBy === 'tool-budget'
                ? `The output above is everything it printed until then${
                    /\|\s*(tail|head)\b/.test(command)
                      ? ' — and a pipe through tail/head holds everything back until the command ends, so it printed nothing: run it without the pipe (use a line reporter and let the output stream)'
                      : ''
                  }. `
                : '') +
              (isSuiteRunCommand(command) ? SUITE_OVER_BUDGET_ADVICE : SPLIT_WORK_ADVICE),
          }
        }
        return {
          stdout,
          stderr,
          exitCode: result.exitCode,
          ...(ceilingNote || traced.change
            ? { note: [ceilingNote, traced.change].filter(Boolean).join(' ') }
            : {}),
        }
      } catch (e: unknown) {
        return { error: `Command failed: ${(e as Error).message}` }
      }
    },

    async load_skill(input) {
      const name = input.name as string
      if (!name) return { error: 'Skill name is required.' }

      // Try direct path first (if name looks like a path)
      if (name.includes('/')) {
        const path = resolve(name)
        // Same workspace-confinement guard every other file-read tool enforces: a planted
        // symlink must not let load_skill read outside the workspace (no-op unless symlinkGuards).
        const symlinkErr = await checkSymlink(path)
        if (symlinkErr) return { error: symlinkErr }
        try {
          const content = await backend.readFile(path)
          return { name, path, content: sanitizeFileContent(content, path) }
        } catch (_error) {
          // File not present at the given path — fall through to the error return below
          return { error: `Skill not found at path: ${name}` }
        }
      }

      // Search standard skill directories
      const searchDirs = ['.agents/skills', '.claude/skills']
      for (const dir of searchDirs) {
        const skillPath = `${root}/${dir}/${name}/SKILL.md`
        // Skip (treat as not-found) any candidate whose realpath escapes the workspace via a
        // symlink — never read an out-of-workspace target.
        if (await checkSymlink(skillPath)) continue
        try {
          const content = await backend.readFile(skillPath)
          return {
            name,
            path: `${dir}/${name}/SKILL.md`,
            content: sanitizeFileContent(content, skillPath),
          }
        } catch (_error) {
          // Skill file not present in this directory — try the next candidate
          continue
        }
      }

      return {
        error: `Skill '${name}' not found. Searched .agents/skills/${name}/SKILL.md and .claude/skills/${name}/SKILL.md`,
      }
    },

    // The other half of run_in_background. A handle is only useful if the
    // executor has other work to do while the command runs; when it needs the
    // result to continue — a build before the tests, tests before "done" — it
    // has nothing to do but wait, and without this it waited by calling
    // `sleep 75; cat <log>` in exec_command, one round trip per poll, each at
    // the full context. Observed on X0 run x1 (2026-09-22): the first two
    // background builds were each followed by a sleep-and-cat call. Waiting
    // server-side costs no round trip and no context.
    async wait_for_task(input) {
      const taskId = typeof input.taskId === 'string' ? input.taskId.trim() : ''
      // Where a task writes its own output is process memory; the task is not.
      // An API process swapped mid-run (a release, a patch, a crash) leaves the
      // command running in the sandbox with nothing left that remembers the file
      // it redirects to — and then `wait_for_task` returns the task's near-empty
      // log as the command's whole result, which is the X1 flash-m48 loss all
      // over again (X1 flash-m63's +43:20 restart: the public walk's handle
      // outlived the process, its redirect target did not). The script the task
      // was started from is still on disk and carries the command, so read the
      // target back from there. The id is format-checked before any /tmp path is
      // built from it, exactly as the reads below are.
      if (
        !outputFileByTask.has(taskId) &&
        !outputFileProbed.has(taskId) &&
        /^mol-bg-[a-z0-9]+-[a-z0-9]+$/.test(taskId)
      ) {
        outputFileProbed.add(taskId)
        try {
          const target = outputRedirectTarget(await backend.readFile(`/tmp/${taskId}.sh`))
          // A relative target was written against the command's own cwd, which
          // the handle does not carry; the project root is where a background
          // command runs unless the caller passed one.
          if (target)
            outputFileByTask.set(taskId, target.startsWith('/') ? target : `${root}/${target}`)
        } catch (_error) {
          // No script under that id: this process did not start the task, so
          // there is nothing to recover. The log stays the whole result.
        }
      }
      // A command that has been waited on for stuckAfterMs() in total without
      // exiting is not going to: on one run the executor waited five times,
      // 120 s each, on an e2e suite that could never start (no browser page
      // attached). Say so once, name the pid, and refuse to wait on it again.
      let waitedBefore = waitedByTask.get(taskId) ?? 0
      // Output since the last wait means the command is working: the stuck
      // clock starts again from here.
      const logBytes = async (): Promise<number | null> => {
        if (!/^mol-bg-[a-z0-9]+-[a-z0-9]+$/.test(taskId)) return null
        let r: { stdout: string } | null | undefined
        try {
          const own = outputFileByTask.get(taskId)
          r = await backend.run(
            `cat /tmp/${taskId}.log${own ? ` ${shellQuote(own)}` : ''} 2>/dev/null | wc -c`,
            { timeout: 5_000 },
          )
        } catch (_error) {
          // No answer about the log: treat the size as unknown, which keeps the
          // stuck verdict exactly as before.
          r = null
        }
        const n = Number.parseInt(r?.stdout?.trim() ?? '', 10)
        return Number.isFinite(n) ? n : null
      }
      if (taskId && waitedBefore >= stuckAfterMs()) {
        const now = await logBytes()
        const before = logBytesByTask.get(taskId)
        if (now !== null && before !== undefined && now > before) {
          logBytesByTask.set(taskId, now)
          waitedByTask.set(taskId, 0)
          waitedBefore = 0
        }
      }
      if (taskId && waitedBefore >= stuckAfterMs()) {
        return {
          taskId,
          status: 'stuck',
          waitedMs: waitedBefore,
          note:
            `You have already waited ${Math.round(waitedBefore / 1000)}s on this command and it ` +
            `has not exited — it is stuck, not slow. Kill it (\`exec_command: ` +
            `${await taskStopCommand(backend, taskId)}\`) and move on; do not wait on it again.`,
        }
      }
      // The id names files under /tmp; only an id this tool minted may be used
      // to read them, so a crafted id cannot turn this into a file reader.
      if (!/^mol-bg-[a-z0-9]+-[a-z0-9]+$/.test(taskId)) {
        return {
          error:
            'taskId must be the id a run_in_background command returned (it looks like ' +
            '`mol-bg-…`).',
        }
      }
      const log = `/tmp/${taskId}.log`
      const exitFile = `/tmp/${taskId}.exit`
      // Leave the outer tool ceiling a margin so this returns a result rather
      // than being killed by it.
      const ceiling = Math.max(5_000, (commandBudgetMs ?? 290_000) - 10_000)
      const requested = Number(input.timeout)
      const budgetMs =
        Number.isFinite(requested) && requested > 0 ? Math.min(requested, ceiling) : ceiling
      const startedAt = Date.now()
      const readExit = async (): Promise<number | null> => {
        try {
          const raw = await backend.readFile(exitFile)
          const code = Number.parseInt(raw.trim(), 10)
          return Number.isFinite(code) ? code : 0
        } catch (_error) {
          // No exit file yet — the command is still running. Not an error.
          return null
        }
      }
      // A running SUITE whose failures repeat one cause is named at the third of them. The run
      // would otherwise spend its whole clock proving that cause, and the executor only learns it
      // from the finished log: X1 flash-m76 waited out 4.0 minutes of 15 tests where every
      // failure was the same `TimeoutError: page.waitForURL` from one missing `navigate('/')`,
      // and then fixed it in 51 s. The task is NOT stopped — the executor is handed the cause and
      // decides, and the note tells it to let the run finish because the run's other causes only
      // surface in it (X1 flash-m83 stopped eight runs at their first repeating cause and never
      // finished one).
      //
      // WHAT ENDS THIS WAIT is the whole of the executor's next move, so only ONE finding does:
      // `earlyReturnCause` — a PROVEN cause (an error repeating verbatim, never a shared duration)
      // that is failing the WHOLE run (every failure the log names, across `UNIVERSAL_CAUSE_FILES`
      // files or more, with nothing passing since the first). Anything else is a LEAD: the wait
      // keeps going to the caller's own timeout, and the finding is attached to the result of this
      // wait as a note. X1 xr-molecule-flash-m99 (2026-10-16) was cut short twice by a status that
      // returned early on three tests sharing the suite's own `timeout: 15_000` — a signature the
      // note it printed called "a lead, not a cause" — and read the early return as "stop waiting,
      // edit now", voiding a run that was still walking both times (the second wait, 224 s of a
      // 280 s budget, ended with nothing at all).
      let midRunNote: string | null = null
      let lastCauseLookAt = startedAt - repeatingCauseLookMs()
      let exitCode = await readExit()
      while (exitCode === null && Date.now() - startedAt < budgetMs) {
        await new Promise((r) =>
          setTimeout(r, Math.min(2_000, budgetMs - (Date.now() - startedAt))),
        )
        exitCode = await readExit()
        // The exit file is read first, so a run that finishes between two looks still returns
        // its real result instead of a note about it.
        if (exitCode !== null) break
        if (repeatingCauseNoted.has(taskId)) continue
        if (Date.now() - lastCauseLookAt < repeatingCauseLookMs()) continue
        lastCauseLookAt = Date.now()
        let causeLog: string
        try {
          const r = await backend.run(runningCauseCommand(log, outputFileByTask.get(taskId)), {
            timeout: 10_000,
          })
          causeLog = r.stdout ?? ''
        } catch (_error) {
          // No look at the log this tick; the next one asks again.
          continue
        }
        const found = repeatingFailure(causeLog)
        if (!found) continue
        // The ONE predicate behind this decision and `repeatingFailureNote`'s wording, so the two
        // cannot come to different verdicts.
        const stopCause = earlyReturnCause(found, universalCause(causeLog, found))
        // How this run was started, so the note can hand over the re-run to send once it ends
        // instead of one for now — the platform refuses a second run against the same app and
        // database while this one walks (xr-molecule-flash-m89: the +19:59 note named a re-run
        // and its overlap hold refused that exact run 23 s later).
        const started = runByTask.get(taskId)
        if (stopCause) {
          // …and only now is the pid walk paid for.
          repeatingCauseNoted.add(taskId)
          const earlyMs = Date.now() - startedAt
          waitedByTask.set(taskId, waitedBefore + earlyMs)
          return {
            taskId,
            status: 'repeating_failure',
            waitedMs: earlyMs,
            note: repeatingFailureNote(found, {
              taskId,
              log,
              stop: await taskStopCommand(backend, taskId),
              universal: stopCause,
              ...(started ? { run: started } : {}),
            }),
          }
        }
        // A lead: this wait goes on, and the finding rides its result as a note — the executor has
        // to keep waiting for the run's own result, so it must not be told one in the status. The
        // look keeps running for the same reason: an app that goes down mid-run turns a shared
        // duration into a proven whole-run cause, and that one is worth returning early for.
        if (!midRunLeadNoted.has(taskId)) {
          midRunLeadNoted.add(taskId)
          midRunNote = repeatingFailureNote(found, {
            taskId,
            log,
            stop: '',
            universal: null,
            ...(started ? { run: started } : {}),
          })
        }
      }
      const waitedMs = Date.now() - startedAt
      waitedByTask.set(taskId, waitedBefore + waitedMs)
      if (exitCode === null) {
        const grownTo = await logBytes()
        const lastSize = logBytesByTask.get(taskId)
        if (grownTo !== null) logBytesByTask.set(taskId, grownTo)
        // Evidence of liveness, read the same way by every answer below: a log
        // that grew during THIS wait means the command is working. On the first
        // wait any output at all counts (there is no earlier size to compare).
        const stillWriting =
          grownTo !== null && (lastSize === undefined ? grownTo > 0 : grownTo > lastSize)
        // The log's own slice, read ONCE for whichever answer follows: it is what
        // the progress sentence is built from, and a wait that showed nothing was
        // waited blind (X1 flash-m50: 4m42s across two waits on an 11-minute run).
        // The slice leads with the failure lines, not the last bytes — a suite's
        // tail is its progress lines (X1 flash-m61: the last 3 000 bytes of a
        // 139-test walk were the skip list).
        const own = outputFileByTask.get(taskId)
        let soFar = ''
        try {
          const r = await backend.run(runningOutputSliceCommand(log, own), { timeout: 5_000 })
          soFar = r.stdout ?? ''
        } catch (_error) {
          // No slice: the notes still say how to peek, and the task id still
          // carries how long the command has been running.
        }
        // ONE sentence of facts, each said once, then what to do next: the lead
        // this branch used to write ("Still running after 342s of waiting, and its
        // output is still growing (71839 bytes) — slow, not stuck") restated the
        // elapsed time and the growth clause these clauses already hold — the same
        // sentence, twice (X1 flash-m87 §+47:20).
        const progress = runningNote(
          waitProgressClauses({
            taskId,
            slice: soFar,
            stillWriting,
            bytes: grownTo,
            ceilingMs: ceiling,
            waitedMs: waitedBefore + waitedMs,
          }),
        )
        const sliceField = soFar.trim() ? { outputSoFar: sanitizeOutput(soFar) } : {}
        // What this wait found mid-run, when it was not a reason to end early: it rides the result
        // the wait is about to hand back, because that result is where the executor decides what to
        // do next and a lead it never saw is a lead it cannot weigh. Not on the `stuck` answer
        // below — that verdict is about the command having stopped PRINTING and carries its own
        // instruction — and not on a finished run's result, where `failureCausesNote` reads the
        // whole log instead of the 40 KB tail a mid-run look is given.
        const midRun = midRunNote ? ` ${midRunNote}` : ''
        if (stillWriting && waitedBefore + waitedMs >= stuckAfterMs()) {
          waitedByTask.set(taskId, 0)
          return {
            taskId,
            status: 'running',
            waitedMs,
            ...sliceField,
            note:
              `${progress} Call wait_for_task again to keep waiting; peek with exec_command: ` +
              `tail ${log}.${midRun}`,
          }
        }
        if (waitedBefore + waitedMs >= stuckAfterMs()) {
          return {
            taskId,
            status: 'stuck',
            waitedMs: waitedBefore + waitedMs,
            note:
              `${Math.round((waitedBefore + waitedMs) / 1000)}s of waiting and it has not exited — it is ` +
              `stuck, not slow. See what it printed with exec_command (tail /tmp/${taskId}.log — ` +
              `read_file cannot reach /tmp), kill it (\`exec_command: ` +
              `${await taskStopCommand(backend, taskId)}\`) and move on; do not wait on it again.`,
          }
        }
        return {
          taskId,
          status: 'running',
          waitedMs,
          ...sliceField,
          // No "Still running after Ns" lead here either: the clauses already say
          // how long it has been running, and the lead said it a second time in
          // the other format (X1 flash-m87 §+47:20).
          note:
            `${progress} Call wait_for_task again to ` +
            `keep waiting — its result carries the log output. ` +
            (soFar.trim()
              ? `outputSoFar is the failure lines so far (up to ${RUNNING_FAILURE_LINES}) and then the end of ` +
                `the log, not the whole run — \`grep -n '✘' ${log} | head -40\` lists every failure, ` +
                `\`grep -n -A 20 '<test name>' ${log}\` reads one failure's error: this run writes ` +
                `each failure's own report into the log as that test fails, right under its ✘ line, ` +
                `not only in the summary at the end. `
              : `Nothing has been printed yet — \`grep -n '✘' ${log} | head -40\` lists failures as they appear. `) +
            `Meanwhile do work that leaves the code under test alone (read the failures so far, plan the fixes): editing app/src or api/src now changes the code the run is testing, and its result no longer counts.${midRun}`,
        }
      }
      let output: string
      try {
        output = await backend.readFile(log)
      } catch (_error) {
        // The command finished but wrote nothing (or the log was removed);
        // an empty output with a real exit code is still a result.
        output = ''
      }
      // A command that wrote its output to its own file (`> /tmp/e2e.log`) left the task log
      // holding a word: read that file too, so the result (and every note built on it) has the
      // run's output (X1 flash-m48: 60 passed / 14 failed, and the notes saw "started").
      const ownFile = outputFileByTask.get(taskId)
      if (ownFile && output.trim().length < 2000) {
        try {
          const ownText = await backend.readFile(ownFile)
          if (ownText.trim()) output = `${output.trim() ? `${output.trimEnd()}\n` : ''}${ownText}`
        } catch (_error) {
          // The file is gone or unreadable: the task log is the whole result, as before.
        }
      }
      // Every cause a finished run found, one line each, so ONE round of fixes covers all of
      // them. A Playwright report prints its failures in sequence with nothing saying which of
      // them share a cause, so a run's other causes are read only by reading every failure: X1
      // flash-m83 (2026-10-16) spent three deploys (6.7 minutes) each fixing a single cause, and
      // the second and third were found by runs stopped before they walked the rest. Null for
      // anything that is not a run with failures in it.
      // How this run was started, so the note can hand over the narrowed re-run of exactly its
      // failing tests instead of leaving the executor to re-run the whole suite (xr-molecule-
      // flash-m101 +12:13: 139 tests, ~4 minutes, to check two fixes).
      const run = runByTask.get(taskId)
      // The tests the request excludes are not causes to fix, and the re-run below inverts them
      // out — a result must never ask the executor to fix a test it also says does not count.
      // The log's own path rides along so a recap that leaves causes out can hand over the ONE
      // grep that prints their bodies: the stdout above is cut in the middle, so the log is where
      // they still are whole.
      const causes = failureCausesNote(
        output,
        excludedTestTitles?.() ?? [],
        run ? { ...run, log: ownFile ?? log } : undefined,
      )
      // A backgrounded run is under no tool budget, and the exit file hands back the PIPELINE's
      // code — so a suite killed at a `timeout 280` the command carried behind a `| tail` reports
      // 0 here too. The run's start is in its own id ({@link taskStartedAt}), so the bound it used
      // is readable without new state: say stopped, and never hand the pipeline's 0 back as the
      // run's (X1 xr-molecule-flash-m93 re-sent that run three times).
      const startedAtMs = taskStartedAt(taskId)
      const cut =
        run && startedAtMs !== null
          ? commandCutRun(
              run.command,
              { exitCode, stdout: output, stderr: '' },
              Date.now() - startedAtMs,
              0,
              // Same reason as the foreground path: the log is raw here, and the returned stdout
              // below is the truncated copy — detection must not read that copy.
              output,
            )
          : null
      if (cut) {
        return {
          taskId,
          status: CUT_AT_BUDGET,
          exitCode: cut.exitCode,
          waitedMs,
          cutRun: cut,
          note: [cutRunSentence(cut), causes].filter((n): n is string => Boolean(n)).join(' '),
          stdout: sanitizeOutput(truncateMiddle(output, MAX_OUTPUT_SIZE)),
          ...(output.length > MAX_OUTPUT_SIZE ? { truncated: true, fullOutput: log } : {}),
        }
      }
      // Same shaping as a foreground exec result, so the executor reads both
      // the same way.
      return {
        taskId,
        exitCode,
        waitedMs,
        ...(causes ? { note: causes } : {}),
        stdout: sanitizeOutput(truncateMiddle(output, MAX_OUTPUT_SIZE)),
        ...(output.length > MAX_OUTPUT_SIZE ? { truncated: true, fullOutput: log } : {}),
      }
    },

    async save_plan(input) {
      const name = input.name as string
      // The schema field is `content`, but a weak executor frequently sends the plan under
      // `body`/`plan`/`markdown` instead. Reading only `content` then left it undefined, and
      // the checklist regex below (run on "undefined") failed — so a perfectly valid
      // checklist got the "not a checklist" error, the model kept "fixing" the FORMAT (never
      // the real problem, the field name), and the whole plan phase looped for turns. Accept
      // the common aliases so a field-name slip is not misdiagnosed as a format error.
      const content = (input.content ??
        input.body ??
        input.plan ??
        input.markdown ??
        input.text) as string

      // Genuinely empty content (wrong/missing field) — name the fix, don't blame the format.
      if (typeof content !== 'string' || content.trim() === '') {
        return {
          error:
            'save_plan received no plan text. Put the full markdown plan in the `content` field — ' +
            'a checklist with every actionable step as a `- [ ]` checkbox.',
        }
      }

      // The plan is executed step-by-step with each step checked off in the file as it
      // completes, so it must be a checklist — reject prose-only plans and let the
      // model resend the same plan reformatted with checkboxes.
      if (!/^\s*[-*] \[[ xX]\]/m.test(content)) {
        return {
          error:
            'Plan rejected: it must be a markdown checklist. Resend the SAME plan with every actionable step as a `- [ ]` checkbox line (grouped under short headings) so each step can be marked `- [x]` as it is completed.',
        }
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60)
      const date = new Date().toISOString().split('T')[0]
      const plansDir = `${root}/.agents/plans`

      try {
        await backend.run(`mkdir -p ${shellQuote(plansDir)}`)

        // Find next sequence number
        let nextNum = 1
        try {
          const entries = await backend.readDir(plansDir)
          for (const e of entries) {
            const m = e.name.match(/^(\d+)-/)
            if (m) nextNum = Math.max(nextNum, parseInt(m[1]) + 1)
          }
        } catch (_error) {
          /* plans dir may not exist yet — start sequence at 1 */
        }

        const filename = `${String(nextNum).padStart(2, '0')}-${slug}-${date}.md`
        const planPath = `${plansDir}/${filename}`
        await backend.writeFile(planPath, content)
        return { path: planPath, ok: true, content, name }
      } catch (e: unknown) {
        return { error: `Failed to save plan: ${(e as Error).message}` }
      }
    },
  }

  // ── Assembly ───────────────────────────────────────────────────

  const allTools: AITool[] = []

  for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
    // Filter by include/exclude
    if (include && !include.includes(name)) continue
    if (exclude?.includes(name)) continue

    const impl = toolImpls[name]
    if (!impl) continue

    allTools.push({
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      // Every tool goes through the same guard: parameter aliases are moved onto
      // the declared names, a missing required one returns a model-actionable
      // error instead of reaching a handler as `undefined`, and a handler that
      // throws returns an error rather than a bare internal message. See
      // input-normalizer.ts for why (X0 R83: `{ cmd }` instead of
      // `{ command }` crashed exec_command and the executor stopped verifying).
      execute: guardToolExecute(
        schema,
        impl as (input: Record<string, unknown>) => Promise<unknown>,
      ),
    })
  }

  return allTools
}
