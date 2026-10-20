/**
 * Tool factory — builds AITool[] from schemas + ExecutionBackend.
 *
 * Each tool's execute() delegates to the backend for I/O,
 * with shared validation, path resolution, and output formatting.
 *
 * @module
 */

import { posix } from 'path'

import type { AITool } from '@molecule/api-ai'

import { browserProbeOverBudgetAdvice, browserProbeRefusal } from './browser-probe.js'
import { endsInBackground } from './command-position.js'
import {
  commandCutRun,
  CUT_AT_BUDGET,
  cutRunSentence,
  suiteRunExitCode,
  suiteSummary,
} from './cut-run.js'
import {
  addChangeSpan,
  changedSpan,
  type CharSpan,
  countLines,
  renderEditExcerpt,
  renderSmallFile,
} from './edit-excerpt.js'
import {
  INLINE_SCRIPT_BUDGET_MS,
  inlineLocalScriptCommand,
  inlineScriptRunawaySentence,
} from './inline-script.js'
import { guardToolExecute, missingParamError, ToolInputError } from './input-normalizer.js'
import { diffLineCount } from './line-diff.js'
import { pipelineExitCodeNote } from './pipeline-exit-note.js'
import { TOOL_SCHEMAS } from './schemas.js'
import {
  foregroundBrowserProbe,
  foregroundServerCommand,
  SERVER_OVER_BUDGET_ADVICE,
  serverCommandRefusal,
  startsServerProgram,
} from './server-command.js'
import { leadingSleepPeek } from './sleep-peek.js'

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
 * Recovered legacy task ids whose command ENDS with a backgrounded statement (`… &`).
 *
 * Such a launch returns the status of the backgrounding operation itself — a launch
 * acknowledgement — and its wrapper is expected to be gone while the run it started still walks, so
 * neither the wrapper's code nor its death says the run ended ({@link taskEndState}). The run's own
 * output is the only ending that counts. New tasks append a shell `wait` and record the actual
 * child's status; only scripts recovered from earlier versions need this compatibility path.
 */
const detachedByTask = new Set<string>()

/**
 * Task ids whose log has SHOWN a failure's own body under a `✘` row — the inline failure switch's
 * effect, read from the log itself ({@link logShowsInlineFailureBodies}).
 *
 * The wait note may promise that each failure's own error sits under its ✘ line only when the
 * log actually carries one: a run printing its failures only in the end-of-run summary would send
 * the model grepping a file they were not in (the m99 class, recurring at xr-molecule-flash-m173
 * +17:07, +39:14). The command's shape cannot answer that question — every background launch is
 * given the switch, and the executor's own wrapper passes it on — so the evidence is the log, read
 * during the wait (xr-molecule-flash-m191: a wrapper-launched run's cause reached the model 7
 * minutes late because nothing read the log for it).
 */
const inlineFailuresByTask = new Set<string>()

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
 * The background task ids each backend launched. Every map above is keyed by task id alone and is
 * shared by every project this process serves, so a task is only ever read as THIS project's when
 * this backend started it or its files are in this project's sandbox ({@link ownedTaskIds}).
 * Without that, a sleep in one project was held for a walk running in another's sandbox, and its
 * note carried that project's command (xr-molecule-flash-m208 +12:00, waiting on m207's walk).
 */
const launchedByBackend = new WeakMap<ExecutionBackend, Set<string>>()

/** A task id this tool minted — the only shape a /tmp path is ever built from. */
const TASK_ID = /^mol-bg-[a-z0-9]+-[a-z0-9]+$/

/**
 * Which of `ids` are this project's tasks: launched through this backend, or with the files a
 * launch writes (`/tmp/<id>.sh`, `.log`, `.pid`) present in this backend's sandbox — the second
 * answer survives an API restart, which empties process memory but not the sandbox.
 *
 * @param backend - The project's execution backend.
 * @param ids - Candidate task ids.
 * @returns The owned subset, or null when none is known to be owned and the sandbox could not answer.
 */
async function ownedTaskIds(backend: ExecutionBackend, ids: string[]): Promise<Set<string> | null> {
  const launched = launchedByBackend.get(backend)
  const owned = new Set(ids.filter((id) => launched?.has(id)))
  const rest = [...new Set(ids)].filter((id) => !owned.has(id) && TASK_ID.test(id))
  if (!rest.length) return owned
  let stdout: string
  try {
    const r = await backend.run(
      `for i in ${rest.join(' ')}; do ` +
        `{ [ -e /tmp/$i.sh ] || [ -e /tmp/$i.log ] || [ -e /tmp/$i.pid ]; } && echo "MOL_OWN_TASK $i"; ` +
        `done; echo MOL_OWN_TASKS_END`,
      { timeout: 5_000 },
    )
    stdout = String(r.stdout ?? '')
  } catch (_error) {
    // The sandbox did not answer: only what this backend launched is known to be its own.
    return owned.size ? owned : null
  }
  if (!stdout.includes('MOL_OWN_TASKS_END')) return owned.size ? owned : null
  for (const m of stdout.matchAll(/^MOL_OWN_TASK (\S+)$/gm))
    if (rest.includes(m[1]!)) owned.add(m[1]!)
  return owned
}

/**
 * Why a finished suite run's result carries no exit code: the code a pipeline reports is its last
 * stage's, and a stage after the runner (or a code of 0 beside a failure in the tally) is not the
 * run's verdict. Said in the result so the missing field does not read as an omission.
 */
const FILTERED_EXIT_NOTE =
  'No exit code is reported for this run: a stage after the test runner produced the pipeline’s ' +
  'code (or the code says 0 beside a failure in the tally), so read the pass/fail tally in the ' +
  'log instead.'

/**
 * What a finished run says when its suite sits inside a `sh -c '<command>'` string: the stages are
 * positions in THAT string, so the platform cannot point at one in the command's own text. Said
 * instead of {@link FILTERED_EXIT_NOTE} — that note names a stage after the runner, and this run
 * cannot be read as having one; a command with nothing piped after the runner keeps its code.
 */
const UNPLACED_KEPT_NOTE =
  'The suite sits inside a `sh -c` string, so its stages cannot be placed in the command’s own ' +
  'text; nothing follows the runner there, so the exit code above is the run’s own — read the ' +
  'pass/fail tally in the log for the verdict.'

/** {@link UNPLACED_KEPT_NOTE} when between them a stage after the runner produced the code. */
const UNPLACED_PIPED_NOTE =
  'The suite sits inside a `sh -c` string, so its stages cannot be placed in the command’s own ' +
  'text, and a stage after the runner may have produced the pipeline’s code: none is reported, ' +
  'so read the pass/fail tally in the log instead.'

/**
 * The sentence a finished suite run's result carries about its exit code, or null when the code it
 * reports is the run's own and needs no explanation.
 *
 * {@link FILTERED_EXIT_NOTE} names a stage after the runner, so it is said only when the parse
 * found one; a run whose stages cannot be placed says THAT instead, and keeps the command's own
 * code when nothing follows the runner.
 *
 * @param placement - Where the code came from ({@link suiteRunPipelinePlacement}).
 * @param reported - The code the result reports, or null when it reports none.
 * @returns The note, or null.
 */
function suiteExitCodeNote(
  placement: SuiteRunPipelinePlacement,
  reported: number | null,
): string | null {
  if (placement.unplaced) return reported === null ? UNPLACED_PIPED_NOTE : UNPLACED_KEPT_NOTE
  return reported === null ? FILTERED_EXIT_NOTE : null
}

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

/**
 * How often a wait re-asks whether a task whose exit file has not appeared has ended. The exit
 * file is read every tick; this probe is a process test plus the task's own output, and 3 s is
 * close enough that a run which ended is never waited out (m182: 281 s on a walk that ended in 20).
 */
const TASK_END_LOOK_MS = 3_000

/** How much of a task's own output the end test reads — a runner's tally is its last lines. */
const TASK_OUTPUT_END_BYTES = 4_000

/** What a background task's process and its own output say about whether it has ended. */
interface TaskEndState {
  /** Whether the task has ended. */
  ended: boolean
  /** The code its own output records (`EXIT=<n>`), or null when nothing recorded one. */
  exitCode: number | null
}

/**
 * The verdict an exit file holds, or null when it holds none.
 *
 * The launcher writes the file as `echo $? > <exitFile>`, which opens it and then writes the code
 * — so a reader can catch it EMPTY in between, and a wrapper killed at that instant leaves it
 * empty for good. Neither is a verdict. Reading it as 0 (what this used to do) hands back success
 * for a command that may have failed — the same fabrication `molecule-dev/api/src/ai/
 * background-tasks.ts` refuses when it treats such a read as "no exit file yet".
 *
 * @param raw - The exit file's content as read.
 * @returns The exit code it records, or null when it records none.
 */
function exitCodeIn(raw: string): number | null {
  const trimmed = raw.trim()
  return /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : null
}

/**
 * The shell probe behind {@link taskEndState}: the code the launcher wrote, the pid it wrote, and
 * the end of the file the command redirects its own output to.
 *
 * The pid test is the one `molecule-dev/api/src/ai/background-tasks.ts` applies in `liveness` —
 * a written exit code ends the task, a live pid keeps it running, and a handle the sandbox cannot
 * account for stays unknown — so this package and that one cannot disagree about whether a task
 * is still walking.
 *
 * The exit file is read in THIS shell, beside the pid test, because the two are ONE observation.
 * Read as two round trips — a wait's tick reading the file, then this probe asking the pid — a
 * wrapper that finished and wrote its code between them was reported "ended without writing an
 * exit code" while its code was on disk (xr-molecule-flash-m303: 13/13 Hurl files green,
 * `exitCode: null`, after a wait that returned on the tick the run ended).
 *
 * The pid test runs BEFORE the exit file is read, and that order is the point: the launcher writes
 * the code and then exits, and `kill -0` answers "gone" only once the process is reaped — so a
 * "gone" answer means the write has already happened, and the read that follows cannot miss it.
 * Read first, the same shell would still have a window between the two statements.
 *
 * The first TWO lines are always the two headers, in this order, and the exit header is always
 * there (`unknown` when the file holds no code yet). {@link taskEndState} reads those positions
 * and nothing else, so a run whose own output prints `MOL_TASK_EXIT 0` cannot have that line
 * mistaken for a written code — the bytes a command can produce start at the third line.
 *
 * @param taskId - The task's `mol-bg-…` handle (format already checked by the caller).
 * @param own - The file the command redirects its own output to, when the launch could tell.
 * @returns The command; line 1 is `MOL_TASK_STATE <alive|gone|unknown>`, line 2
 *   `MOL_TASK_EXIT <n|unknown>`, and the rest the tail of the run's own output.
 */
const taskStateCommand = (taskId: string, own?: string): string =>
  `P=$(cat /tmp/${taskId}.pid 2>/dev/null); ` +
  `if [ -z "$P" ] || [ ! -f /tmp/${taskId}.sh ]; then S=unknown; ` +
  `elif kill -0 "$P" 2>/dev/null; then S=alive; ` +
  `else S=gone; fi; ` +
  `c=$(cat /tmp/${taskId}.exit 2>/dev/null); ` +
  `case "$c" in ''|*[!0-9]*) X=unknown;; *) X=$c;; esac; ` +
  `echo MOL_TASK_STATE "$S"; ` +
  `echo MOL_TASK_EXIT "$X"; ` +
  (own ? `tail -c ${TASK_OUTPUT_END_BYTES} ${shellQuote(own)} 2>/dev/null` : 'true')

/**
 * The ending a task's own output already records, read from the file its command redirects to.
 *
 * A command can put its real work in a subshell and leave the platform's wrapper waiting on
 * something else — `( runner > /tmp/full-run.log; echo EXIT=$? >> /tmp/full-run.log ) &` — so
 * the task log stays empty and the exit file may never appear while the run itself is over. The
 * run's own file is where its outcome is: an `EXIT=<n>` line the command appended, or the
 * runner's closing tally (Playwright's status lines, Vitest's `Tests …` line, Hurl's
 * `Executed files:`), which is the last thing a finished run prints.
 *
 * @param text - The tail of the task's own output file.
 * @returns Whether the output records an ending, and the code when it recorded one.
 */
function outputEnding(text: string): TaskEndState {
  const trimmed = text.trimEnd()
  if (!trimmed) return { ended: false, exitCode: null }
  // An explicit marker the command appended is the run's own verdict, whatever precedes it.
  const marker = /(?:^|\n)EXIT=(\d+)\s*$/.exec(trimmed)
  if (marker) return { ended: true, exitCode: Number(marker[1]) }
  const lastLine = trimmed.slice(trimmed.lastIndexOf('\n') + 1).trim()
  // A tally is an ending only as the LAST line: a second walk starts by printing its own header,
  // so a file whose last line is still the first walk's tally is between the two.
  const tallyLine =
    /^\d+\s+(?:passed|failed|flaky|skipped|interrupted|timed out|did not run)\b/.test(lastLine) ||
    /^Tests\s+.+\(\d+\)$/.test(lastLine) ||
    /\bExecuted files:\s*\d+/.test(lastLine)
  if (!tallyLine) return { ended: false, exitCode: null }
  return { ended: suiteSummary(trimmed)?.finished ?? false, exitCode: null }
}

/**
 * Whether a background task has ENDED, asked of the task itself rather than of a note about it.
 *
 * A missing exit file alone is not "running": the launcher writes that file from the wrapper it
 * started, and a command that backgrounds its real work leaves the file missing after the run is
 * over. X1 xr-molecule-flash-m182 (+30:25) waited 281 s — its whole remaining ceiling — on a walk
 * that had ended in 20 s, and a `sleep 240; tail` on the same handle was answered "is live". The
 * end is read the way `molecule-dev/api/src/ai/background-tasks.ts` reads it — exit file, then
 * the pid — plus the one signal this package has and that tracker does not: the task's own output
 * file already holding its ending.
 *
 * @param backend - The execution backend the task runs on.
 * @param taskId - The task's `mol-bg-…` handle.
 * @returns Whether it has ended, and the code the exit file (or the run's own output) recorded,
 *   or null when there is no verdict to report.
 */
async function taskEndState(backend: ExecutionBackend, taskId: string): Promise<TaskEndState> {
  const own = outputFileByTask.get(taskId)
  const detached = detachedByTask.has(taskId)
  let stdout: string
  try {
    const r = await backend.run(taskStateCommand(taskId, own), { timeout: 5_000 })
    stdout = String(r.stdout ?? '')
  } catch (_error) {
    // A sandbox that cannot answer is not evidence of an ending: the quiet failure (a wait) beats
    // the loud one (a result handed back for a run that is still walking).
    return { ended: false, exitCode: null }
  }
  // The headers are OURS, at fixed positions — a line the run's own output prints that is shaped
  // like one cannot be read as one, and the bytes after line 2 are the run's tail regardless.
  const lines = stdout.split('\n').map((line) => line.replace(/\r$/, ''))
  const state = /^MOL_TASK_STATE (alive|gone|unknown)$/.exec(lines[0] ?? '')?.[1] ?? 'unknown'
  const headerCode = /^MOL_TASK_EXIT (\d+)$/.exec(lines[1] ?? '')?.[1]
  const reported = headerCode === undefined ? null : Number(headerCode)
  const ownEnding = outputEnding(lines.slice(2).join('\n'))
  // The run's own output can end the task while its wrapper is still alive: the wrapper may be
  // waiting on the wrong thing (m182's was blocked) while the run it started is over. An explicit
  // `EXIT=<n>` is that verdict — more specific than the wrapper's own code, which in that shape is
  // the status of the backgrounding statement, not of the run — and a bare tally is trusted only
  // once the pid is gone, because the instant between a walk's tally and its next walk's header
  // reads the same.
  if (ownEnding.ended && (ownEnding.exitCode !== null || state === 'gone')) return ownEnding
  // The code the launcher wrote, read in the same shell as the pid test. It is an ending only once
  // the wrapper is GONE: a wrapper still alive has not reached that write yet (or is a moment away
  // from exiting), so the code is not an ending for it — and a launch whose LAST statement is
  // backgrounded (`… &`) returned the status of the backgrounding operation, a launch
  // acknowledgement, that is never the run's verdict (see {@link detachedByTask}). Read after the
  // pid test, it is found here rather than reported as never written (xr-molecule-flash-m303).
  if (!detached && reported !== null && state === 'gone') return { ended: true, exitCode: reported }
  // A pid this sandbox can account for and that is gone, with no exit file: the wrapper that
  // writes the exit code was killed or exited, so the task ended and has no verdict to invent.
  if (!detached && state === 'gone') return { ended: true, exitCode: null }
  return { ended: false, exitCode: null }
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
 * Playwright's start-of-walk line, `Running 138 tests using 1 worker` — the first thing a walk
 * prints, so a second one in one log is a second walk.
 */
const WALK_START = /^[ \t]*Running \d+ tests?\b/gm

/**
 * One status line of a runner's closing tally — `  4 failed`, `  70 passed (4.5m)`,
 * `  65 skipped`.
 */
const TALLY_STATUS =
  /^[ \t]*(\d+)[ \t]+(passed|failed|flaky|skipped|interrupted|timed out|did not run)\b[^\n]*/gm

/**
 * A runner's CLOSING tally, the line that only prints once a walk has finished: Playwright's
 * duration-bearing `70 passed (4.5m)`, a `1 flaky` summary, or Hurl's `Executed files:` count.
 *
 * The same reading as molecule-dev's `suite-proof.ts` `FINAL_TALLY_RE` (the platform's finished-run
 * detector); this package cannot import it, so the shape is mirrored here and nowhere else.
 */
const FINISHED_TALLY =
  /\b\d+[ \t]+(?:passed|failed)[ \t]+\(\d+(?:\.\d+)?(?:ms|s|m|h)\)|^[ \t]*\d+[ \t]+flaky\b|^[ \t]*Executed files:/m

/**
 * Whether a task's log holds a SECOND walk of the same suite — a finished tally followed by a
 * fresh `Running N tests` header — and what the finished walk's tally said.
 *
 * A command that chained two suite runs starts the second walk the moment the first ends, and the
 * wait used to read that log as one slow run ("slow, not stuck") for the whole second walk. X1
 * xr-molecule-flash-m157 (+14:02) waited out 4.5 minutes of a duplicate walk that measured nothing:
 * the first walk had already printed `4 failed / 65 skipped / 70 passed (4.5m)`.
 *
 * @param slice - The log slice this wait read.
 * @returns The finished walk's tally lines, or null when the log shows one walk (or none).
 */
function secondSuiteWalk(slice: string): { tally: string } | null {
  const header = [...slice.matchAll(WALK_START)].at(-1)
  if (!header || header.index === undefined) return null
  const finished = FINISHED_TALLY.exec(slice)
  // One walk prints its header FIRST and its tally last, so a tally before the last header is
  // another walk's. The slice repeats what it greps and then the log's own tail, so the same
  // tally can appear twice; one line per status, taken at its last position, keeps it once.
  if (!finished || finished.index === undefined || finished.index > header.index) return null
  const seen = new Map<string, { at: number; text: string }>()
  for (const match of slice.matchAll(TALLY_STATUS)) {
    if (match.index === undefined || match.index >= header.index) continue
    seen.set(match[2] ?? '', { at: match.index, text: match[0].trim().replace(/\s+/g, ' ') })
  }
  const tally = [...seen.values()]
    .sort((a, b) => a.at - b.at)
    .map((v) => v.text)
    .join(' / ')
  return { tally: tally || 'its closing tally' }
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
  // A log that already finished one walk and started another says so instead of "slow, not
  // stuck": the growth is the SECOND walk printing, and its counter is not this run's progress.
  const secondWalk = secondSuiteWalk(o.slice)
  if (o.stillWriting && !secondWalk)
    clauses.push(`its output is still growing (${o.bytes} bytes) — slow, not stuck`)
  else if (o.bytes !== null && !secondWalk)
    clauses.push(`its log has not grown during this wait (${o.bytes} bytes)`)
  if (secondWalk)
    clauses.push(
      `the first walk in this command has finished (${secondWalk.tally}); the command started a ` +
        'SECOND walk of the same suite — stop it (it measures nothing new) and read the first tally',
    )
  const counter = secondWalk ? null : logProgress(o.slice)
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

/**
 * The background task a leading `sleep` was about to peek at, and its state now — or null when the
 * command has no task of this process's to report, in which case the sleep runs as written (the
 * tool's own budget bounds it, as before).
 *
 * X1 xr-molecule-flash-m105 (+08:49 → +10:53, 2026-10-17) hand-polled with `sleep N; tail …`
 * three times. The state the executor wanted was always one the platform already held: two tasks
 * had ended 0.1 s in (exit 127, and `Error: No tests found`) and the third was live at 72 of 139
 * with failures the log already carried. So a command that opens with a long sleep is answered
 * from the same reads `wait_for_task` makes — the exit file, and the failure-lines-plus-tail slice
 * of the log — and the sleep is dropped.
 *
 * The command names WHAT it is peeking at (`/tmp/<id>.log`, or the file the task redirects its own
 * output to), and that task is the answer whether it has ended or not: the two dead peeks are
 * exactly this shape. With no name to follow, the newest LIVE task is the answer — the point of
 * the rule is that a sleep never outlives a run it could have been waiting on — and with no live
 * task there is nothing to report.
 *
 * @param backend - The execution backend the task runs on.
 * @param command - The command whose leading sleep is being replaced.
 * @param seconds - The seconds that leading sleep asked for.
 * @param ceilingMs - The wait ceiling a `wait_for_task` would have, so the ETA it states is the
 *   one an actual wait would act on.
 * @returns One sentence naming the task's state and how to get its result, plus the log slice the
 *   caller attaches as `outputSoFar`; null when no task answers this command.
 */
async function backgroundTaskState(
  backend: ExecutionBackend,
  command: string,
  seconds: number,
  ceilingMs: number,
): Promise<{ note: string; slice: string } | null> {
  // Only this project's tasks: the registry holds every project's, newest last. Bounded, because
  // each candidate is one test in the ownership probe.
  const recent = [...runByTask.keys()].slice(-64)
  if (!recent.length) return null
  const owned = await ownedTaskIds(backend, recent)
  if (!owned?.size) return null
  const ids = recent.filter((id) => owned.has(id))
  const exitCodeOf = async (id: string): Promise<number | null> => {
    try {
      return exitCodeIn(await backend.readFile(`/tmp/${id}.exit`))
    } catch (_error) {
      // No exit file yet: the task is still running. Not an error.
      return null
    }
  }
  const names = (id: string): boolean => {
    if (command.includes(`/tmp/${id}.log`)) return true
    const own = outputFileByTask.get(id)
    return own !== undefined && command.includes(own)
  }
  // A task is only a candidate to WAIT on while it is still walking: the exit file and the same
  // end test `wait_for_task` applies both say when it ended, so a sleep is never held for a handle
  // whose run is already over (m182 +30:25: `sleep 240; tail /tmp/full-run.log` was answered "is
  // live" for a task that had ended 20 s after it started).
  const stateOf = async (
    id: string,
  ): Promise<{ id: string; ended: boolean; exitCode: number | null }> => {
    // A launch that ended in `&` writes its exit file at once with the launch's own status; that
    // is an acknowledgement, and the task's end is read from its own output instead.
    const exitCode = detachedByTask.has(id) ? null : await exitCodeOf(id)
    if (exitCode !== null) return { id, ended: true, exitCode }
    return { id, ...(await taskEndState(backend, id)) }
  }
  const newestFirst = [...ids].reverse()
  const namedId = newestFirst.find(names)
  let target: { id: string; ended: boolean; exitCode: number | null } | null = namedId
    ? await stateOf(namedId)
    : null
  if (!target) {
    // Bounded: a long session can leave many finished tasks behind, and each look costs a read.
    for (const id of newestFirst.slice(0, 8)) {
      const state = await stateOf(id)
      if (!state.ended) {
        target = state
        break
      }
    }
  }
  if (!target) return null
  let slice = ''
  try {
    const r = await backend.run(
      runningOutputSliceCommand(`/tmp/${target.id}.log`, outputFileByTask.get(target.id)),
      { timeout: 5_000 },
    )
    slice = r.stdout ?? ''
  } catch (_error) {
    // No slice: the note still says the task's state and how to get its result.
  }
  const secondsText = `Did not sleep ${Math.round(seconds)} s: background task \`${target.id}\``
  if (!target.ended) {
    const facts = waitProgressClauses({
      taskId: target.id,
      slice,
      stillWriting: false,
      bytes: null,
      ceilingMs,
      waitedMs: 0,
    })
    const failures = slice.trim() ? '; the failures already in its log are in outputSoFar' : ''
    return {
      note:
        `${secondsText} is live (${facts.join('; ')})${failures} — ` +
        `\`wait_for_task ${target.id}\` returns its result the moment it ends.`,
      slice,
    }
  }
  const counter = logProgress(slice)
  const progress = counter ? `, at ${counter.done} of ${counter.total} in its log` : ''
  const failures = slice.trim() ? '; the failures in its log are in outputSoFar' : ''
  // No exit file and no code in the run's own output: it ended and there is no verdict to invent.
  const verdict =
    target.exitCode === null
      ? 'no exit code — its process is gone and its output recorded none'
      : `exit code ${target.exitCode}`
  return {
    note:
      `${secondsText} had already ended (${verdict})${progress}${failures} — ` +
      `\`wait_for_task ${target.id}\` returns its result now.`,
    slice,
  }
}
import { suiteCommandTarget } from './suite-overlap.js'
import { diagnosisTraceCommand } from './trace-artifacts.js'
import type { ExecutionBackend, ToolBuildConfig } from './types.js'
import {
  BRACE_GLOB_HINT,
  checkBlockedCommand,
  declaredBudgetSeconds,
  DEFAULT_SEARCH_EXCLUDED_DIRS,
  directoryReadHint,
  earlyReturnCause,
  emptyCallError,
  expandBraceGlob,
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
  linesWithinSerialized,
  literalDirPrefix,
  logShowsInlineFailureBodies,
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
  repeatedSuiteRunError,
  type RepeatingFailure,
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
  suiteRunBudgetCommand,
  suiteRunConfigCommand,
  type SuiteRunPipelinePlacement,
  suiteRunPipelinePlacement,
  suiteRunPriorityLaunch,
  TOOL_RESULT_CHARS,
  truncateMiddle,
  universalCause,
  whitespaceTolerantReplace,
  withoutSuiteTimeout,
} from './utilities.js'

/**
 * How long exec_command waits for a command it backgrounded only because the
 * command asked for more than the tool's ceiling, before handing back a task id.
 */
const OVER_CEILING_GRACE_MS = 45_000

/**
 * How close to this tool's ceiling an executor-written bound has to be before it is read as the
 * ceiling written down rather than a budget for the walk: `timeout 290` beside a 290 s ceiling.
 * The slack covers the rounding an executor does (`timeout 300` for a 290 s budget).
 */
const CEILING_FITTED_SLACK_SECONDS = 30

/**
 * What a run's {@link ToolBuildConfig.suiteBudget} hook actually put on it: the flags and the
 * derived config placed on the runner, the settings the derived config carries, and every setting
 * the run's config still makes different from the suite's.
 */
interface SuiteBudgetOutcome {
  /** The flags written on the runner (`--timeout=15000`). */
  pinned: string[]
  /** The derived config the run was pointed at, or null when none was placed. */
  config: string | null
  /** The settings the derived config pins, by the scan's key. */
  values: Readonly<Record<string, string>>
  /** Every differing setting the consumer's scan reported, pinned or not. */
  drift: Readonly<Record<string, { used: string; suite: string }>>
}

/**
 * The machine-readable mark on a result whose run carried the supplied suite's own settings
 * ({@link ToolBuildConfig.suiteBudget}) — the flags and derived config actually written, every
 * pinned value, and the RESIDUAL drift, so a consumer's notes can treat those settings as equal to
 * the suite's instead of re-reading the config, and can see which ones this run still measures
 * differently.
 *
 * @param outcome - What the placement put on the command.
 * @returns The result field, or nothing when nothing was placed and nothing differs.
 */
function suiteBudgetField(outcome: SuiteBudgetOutcome): Record<string, unknown> {
  const field: Record<string, unknown> = {}
  if (outcome.pinned.length > 0) field.pinned = [...outcome.pinned]
  if (outcome.config !== null) field.config = outcome.config
  // A derived config that was NOT placed carries nothing: its values are then residual drift.
  const values = outcome.config === null ? {} : { ...outcome.values }
  if (Object.keys(values).length > 0) field.values = values
  const carried = new Set([
    ...outcome.pinned.map((flag) => flag.slice(2).split('=')[0] ?? ''),
    ...Object.keys(values),
  ])
  const drift = Object.fromEntries(
    Object.entries(outcome.drift).filter(([key]) => !carried.has(key)),
  )
  if (Object.keys(drift).length > 0) field.drift = drift
  return Object.keys(field).length === 0 ? {} : { suiteBudget: field }
}

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
 * The include-glob error. It keeps the original character-rule sentence and
 * names the accepted multi-extension form, so a refusal teaches the syntax
 * rather than only reporting that the value was wrong.
 */
const INCLUDE_GLOB_ERROR =
  'Invalid include glob pattern. Allowed: alphanumeric and @ * ? . _ - / [ ] ( ), ' +
  BRACE_GLOB_HINT

/**
 * The `find_files` pattern error. Same shape as {@link INCLUDE_GLOB_ERROR} —
 * the brace sentence is shared, so a brace refusal reads the same in both
 * search tools — with the route-directory note this tool has always carried.
 */
const FIND_PATTERN_ERROR =
  'Invalid pattern. Allowed: alphanumeric and @ * ? . _ - / [ ] ( ) ' +
  '(brackets/parens support Next.js route dirs like [id] or (group)), ' +
  BRACE_GLOB_HINT

/**
 * The `find` predicate for one or more expanded patterns, ORed inside parens
 * when a brace group expanded to more than one.
 *
 * @param patterns - Patterns, each already accepted by the glob character rule.
 * @returns A predicate list for `find`.
 */
function findArgsForPatterns(patterns: string[]): string {
  return joinFindArgs(patterns.map((p) => findPatternArgs(p)))
}

/**
 * Join `find` predicates into one, parenthesising an OR when a brace group
 * expanded to more than one alternative.
 *
 * @param args - One predicate expansion per alternative.
 * @returns The predicate text.
 */
function joinFindArgs(args: string[]): string {
  return args.length === 1 ? args[0] : `\\( ${args.join(' -o ')} \\)`
}
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
 * What the filesystem says about a write target under `node_modules` — the half
 * of the decision a path's spelling cannot make.
 *
 * @remarks
 * A path that reads `node_modules` is not necessarily an install: a run links
 * `node_modules` beside its e2e copy to borrow the hoisted tree, and that link
 * is its own. X0 xr-molecule-flash-m106 (+07:58) made exactly that link, found
 * it dangling (everything was hoisted to `/workspace/node_modules`), and was
 * refused three times for trying to remove it — 40 s and a "3rd time this turn
 * … ask the user" escalation, in an unattended run, over a broken symlink in
 * the run's own scratch directory. So the guard asks what is there.
 */
export interface InstalledPackageFacts {
  /** Whether the `node_modules` entry the path goes through is a symbolic link. */
  readonly symlink: boolean
  /** Whether a package is really installed there: a `package.json` resolves under the entry. */
  readonly installed: boolean
}

/**
 * Looks at the filesystem for {@link InstalledPackageFacts}.
 *
 * The guard cannot `stat` the path itself: the tools act through a backend (a
 * sandbox over the network for the fleet), so the caller — which holds that
 * backend — supplies the look. {@link shellInstalledPackageProbe} builds one
 * from any shell runner.
 */
export type InstalledPackageProbe = (path: string) => Promise<InstalledPackageFacts>

/**
 * The `node_modules` entry a path goes through, and the package name after it
 * (`null` when the path IS the entry).
 *
 * @param path - An absolute path.
 * @returns The entry and the name, or null when no `node_modules` component is in the path.
 */
function nodeModulesParts(path: string): { entry: string; name: string | null } | null {
  // A path may sit in a NESTED node_modules (`app/node_modules/...`) as well as the
  // hoisted root one: both can be installed trees.
  const at = /(?:^|\/)node_modules(?:\/|$)/.exec(path)
  if (!at) return null
  const head = path.slice(0, at.index)
  const entry = `${head}${head === '' || head.endsWith('/') ? '' : '/'}node_modules`
  const named = /node_modules\/((?:@[^/]+\/)?[^/]+)(?:\/|$)/.exec(path.slice(at.index))
  return { entry, name: named?.[1] ?? null }
}

/**
 * Build an {@link InstalledPackageProbe} from a shell runner (a backend's
 * `run`, or a sandbox's `exec`): one command reports whether the entry is a
 * link and whether a `package.json` resolves under it.
 *
 * @param run - Runs a command where the path lives.
 * @returns The probe.
 */
export function shellInstalledPackageProbe(
  run: (command: string) => Promise<{ stdout?: string } | null | undefined>,
): InstalledPackageProbe {
  return async (path: string): Promise<InstalledPackageFacts> => {
    const parts = nodeModulesParts(path)
    if (!parts) return { symlink: false, installed: false }
    const { entry, name } = parts
    // A bare `@scope` is not a package, but removing it takes every package under
    // it: treat the scope directory like the entry itself and look beneath it.
    const scopeOnly = name !== null && /^@[^/]+$/.test(name)
    const install =
      name !== null && !scopeOnly
        ? `if [ -e ${shellQuote(`${entry}/${name}/package.json`)} ]; then echo installed; fi`
        : `if find ${shellQuote(name === null ? entry : `${entry}/${name}`)} -maxdepth 3 -name package.json -print -quit 2>/dev/null | grep -q .; then echo installed; fi`
    const out = String(
      (await run(`if [ -L ${shellQuote(entry)} ]; then echo symlink; fi; ${install}`))?.stdout ??
        '',
    )
    return { symlink: out.includes('symlink'), installed: out.includes('installed') }
  }
}

/**
 * The refusal for a write whose target is inside an INSTALLED package, or null
 * when the path is not under `node_modules` or nothing is installed there.
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
 * What is protected is the INSTALL, not the spelling: the decision comes from
 * {@link InstalledPackageFacts}, never from the path alone (m106 above). Three
 * things are the run's own to remove or replace —
 *
 * - a `node_modules` that is a SYMLINK: `rm`/`unlink` removes the link, never the
 *   tree it points at, so a link the run made cannot clobber anything;
 * - anything under the run's own `.mol-scratch/` directory;
 * - a `node_modules` with no `package.json` under it (nothing was ever installed).
 *
 * A path INSIDE the link is still decided by what resolves there: a link into a
 * real tree is refused, because removing or writing through it reaches the
 * install.
 *
 * The restore route is named because the model that has ALREADY clobbered a file
 * (this refusal is too late for it) is the one who needs it, and because the
 * obvious repair — `npm install <pkg>` — is itself refused in the pre-installed
 * sandbox. `npm pack` + a `tar` extraction over the package directory is what
 * m91 used, and what both guards leave alone.
 *
 * @param path - An absolute path a tool is about to write.
 * @param probe - Looks at the filesystem where the path lives.
 * @returns The one-line refusal naming the package, or null when nothing is installed there.
 */
export async function installedPackageWriteRefusal(
  path: string,
  probe?: InstalledPackageProbe,
): Promise<string | null> {
  const parts = nodeModulesParts(path)
  if (!parts) return null
  const { entry, name } = parts
  // The run's own scratch directory is the run's to clean: the platform tells it
  // to put throwaway work there (system prompt, "Throwaway probes go in
  // `.mol-scratch/`"), so nothing in it is the pre-installed tree.
  if (/(?:^|\/)\.mol-scratch(?:\/|$)/.test(path)) return null
  // No probe, or a probe that could not answer: keep the old, conservative
  // reading (everything under node_modules is an install).
  const facts = probe ? await probe(path).catch(() => null) : null
  const symlink = facts?.symlink ?? false
  const installed = facts?.installed ?? true
  // The entry itself — the link (or a tree with nothing in it) the run may take
  // away. Removing a symlink deletes the LINK only; its target is untouched.
  if (name === null && (symlink || !installed)) return null
  // A path under the entry: `installed` resolved through any link, so it is true
  // exactly when a write here would land in a real installation.
  if (name !== null && !installed) return null
  const dir = name ? `${entry}/${name}` : null
  const what = name ? `the installed package ${name}` : 'an installed node_modules tree'
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
 * Delays between retries of the symlink guard while a sandbox's command channel is
 * still attaching: four attempts over roughly 2.6 s (plus the commands' own time),
 * which covers the span a freshly claimed E2B sandbox answers `SandboxNotFoundError`
 * before its exec channel is usable (xr-molecule-flash-m120 +00:29). A plain slow
 * answer keeps the single 300 ms retry instead — a sandbox that is gone does not
 * come back inside five seconds.
 */
const SANDBOX_STARTING_BACKOFF_MS: readonly number[] = [300, 800, 1_500]

/**
 * Whether an error from the sandbox's command channel says the sandbox is still
 * STARTING rather than gone for good.
 *
 * A sandbox created seconds earlier answers `SandboxNotFoundError` ("Sandbox is
 * probably not running anymore") until its channel attaches, and that message names
 * the worse of the two causes — so a file tool refused it as if the sandbox were
 * dead. These shapes are retried; anything else keeps the one quick retry.
 *
 * @param error - The error thrown by `backend.run`.
 * @returns True when the sandbox looks like it is still coming up.
 */
function sandboxStillStarting(error: unknown): boolean {
  const err = error as { name?: unknown; message?: unknown } | null | undefined
  const name = typeof err?.name === 'string' ? err.name : ''
  const message = typeof err?.message === 'string' ? err.message : ''
  if (/^SandboxNotFound(?:Error)?$/i.test(name)) return true
  return /not (?:found|running)|notfound|not attached|still starting/i.test(`${name} ${message}`)
}

/**
 * The most entries a bounded `list_files` result lists. A package catalog is not read entry by
 * entry — the executor wants one package it can name — so the summary keeps enough names to show
 * the naming pattern and no more.
 */
const LIST_FILES_HEAD_ENTRIES = 20

/**
 * The line a package-catalog listing carries instead of a catalog's worth of names: a directory
 * of 1,032 names answers no question, while `find_package` answers the one that was asked.
 */
const MOLECULE_CATALOG_POINTER =
  'use find_package(query) to search the @molecule catalog by what you need, and ' +
  'read_molecule_doc(name) for one package'

/**
 * Which package catalog a `list_files` path is, when it is one: the `@molecule` scope (1,032
 * package directories, ~53 KB of names in one plan-phase call — X0 xr-molecule-flash-m151 at
 * +01:54) or the `node_modules` root above it.
 *
 * @param path - A resolved (absolute, normalized) directory path.
 * @returns `'molecule'` for the `@molecule` scope, `'packages'` for a `node_modules` root, or null.
 */
function packageCatalog(path: string): 'molecule' | 'packages' | null {
  if (/(^|\/)node_modules\/@molecule$/.test(path)) return 'molecule'
  if (/(^|\/)node_modules$/.test(path)) return 'packages'
  return null
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
    requiredSuiteEnv,
    suiteRunMs,
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
  async function resolveWrite(path: string): Promise<string> {
    const resolved = resolve(path)
    // The guard decides from what is installed where the path lives, so the
    // backend is asked (one command, only for a path that names node_modules).
    const refusal = await installedPackageWriteRefusal(
      resolved,
      shellInstalledPackageProbe((command) => backend.run(command, { timeout: 8000 })),
    )
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
    // The retry budget is failure-aware. A plain slow answer gets ONE quick retry
    // (X1 flash-m44: three paths refused in 332 ms, the same check passing a beat
    // later). A channel that is still ATTACHING gets longer: a sandbox created
    // seconds earlier answers `SandboxNotFoundError` for well over 600 ms, so the
    // fixed 2 × 300 ms budget ran out and the run's FIRST file tool was refused with
    // "probably not running anymore" 300 ms before the same tool answered
    // (xr-molecule-flash-m120 +00:29). Those errors are about a sandbox that is
    // still starting, not one that is gone, so they are retried up to ~5 s.
    let lastError: unknown
    let attempts = 0
    for (;;) {
      attempts++
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
        const backoff = sandboxStillStarting(lastError) ? SANDBOX_STARTING_BACKOFF_MS : []
        const wait = backoff[attempts - 1] ?? (attempts === 1 ? 300 : undefined)
        if (wait === undefined) break
        await new Promise((resolve) => setTimeout(resolve, wait))
      }
    }
    // Deny conservatively, and say what failed: "access denied" read as a forbidden path,
    // and a fixed "did not answer within 5 s" hid an error that took 332 ms.
    const err = lastError as (Error & { elapsedMs?: number }) | undefined
    const timedOut = err?.name === 'TimeoutError' || (err?.elapsedMs ?? 0) >= 4900
    if (timedOut) {
      return (
        'Unable to verify path safety: the sandbox did not answer the check within 5 s (it may be ' +
        'restarting or out of memory), so the path was refused to stay safe. Retry in a moment; if ' +
        'every file tool fails this way, the sandbox needs a restart.'
      )
    }
    if (sandboxStillStarting(err)) {
      return (
        'Unable to verify path safety: the sandbox is still starting (its command channel is not ' +
        'attached yet), so the path was refused to stay safe. Retry in a few seconds — a freshly ' +
        'created sandbox can take a moment to attach.'
      )
    }
    return (
      `Unable to verify path safety: the sandbox's command channel failed (${err?.name ?? 'Error'}: ${String(err?.message ?? err).slice(0, 160)}), ` +
      'so the path was refused to stay safe. Retry the call; if every file tool fails this way, the sandbox needs a restart.'
    )
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

  // ── Binary reads ───────────────────────────────────────────────

  /** Extensions whose files are never text: a `read_file` on one is refused by name. */
  const BINARY_FILE_EXTENSIONS = new Set([
    'avif',
    'gif',
    'gz',
    'ico',
    'jpeg',
    'jpg',
    'otf',
    'pdf',
    'png',
    'tgz',
    'ttf',
    'wasm',
    'webp',
    'woff',
    'woff2',
    'zip',
  ])
  /** How many chars of a read are inspected for binary markers. */
  const BINARY_SAMPLE_CHARS = 512
  /**
   * A replacement character (a byte UTF-8 could not decode) marks binary only in
   * bulk: one literal U+FFFD in a source string is ordinary text.
   */
  const BINARY_MIN_REPLACEMENTS = 8
  const BINARY_REPLACEMENT_DENSITY = 0.05

  /**
   * The kind of a BINARY file, or `null` for text.
   *
   * `read_file` asks the backend for a string, so a PNG comes back as UTF-8
   * replacement characters and used to be handed to the model whole — 21,191
   * chars of unreadable bytes it cannot look at, ~12k tokens per read, asked for
   * twice in one run (xr-molecule-flash-m155 +09:58). A known binary extension is
   * refused by name; a file without one is caught from the bytes themselves, by
   * a NUL byte or by the density of replacement characters in its first
   * {@link BINARY_SAMPLE_CHARS} chars.
   *
   * @param path - The already-resolved path.
   * @param content - The content the backend decoded as UTF-8.
   * @returns The binary kind to name (e.g. `png`, `binary data`), or `null` for text.
   */
  function binaryFileKind(path: string, content: string): string | null {
    const ext = posix.extname(path).slice(1).toLowerCase()
    if (BINARY_FILE_EXTENSIONS.has(ext)) return ext
    const sample = content.slice(0, BINARY_SAMPLE_CHARS)
    if (sample.includes('\u0000')) return 'binary data'
    let replacements = 0
    for (const char of sample) if (char === '\uFFFD') replacements += 1
    return replacements >= BINARY_MIN_REPLACEMENTS &&
      replacements / sample.length >= BINARY_REPLACEMENT_DENSITY
      ? 'binary data'
      : null
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
   * The counts are a real line diff ({@link diffLineCount}), not the change in
   * line count: replacing one line with another leaves the file the same
   * length, and a length delta reported that edit as `0/0` — reading to the
   * model as "your write changed nothing" (xr-molecule-flash-m141 +09:56, a
   * one-line rewrite of `ArticlePreview.tsx`). A write that leaves the content
   * identical is `unchanged` rather than a `modified` with `0/0`, so the two
   * are distinguishable.
   *
   * @param oldContent - Previous file contents, or `null` when creating a file.
   * @param newContent - Replacement file contents after a write/edit.
   * @returns Counts describing whether the file was created, modified or left unchanged.
   */
  function computeDiff(
    oldContent: string | null,
    newContent: string,
  ): { type: 'created' | 'modified' | 'unchanged'; linesAdded: number; linesRemoved: number } {
    if (oldContent === null) {
      return { type: 'created', linesAdded: countLines(newContent), linesRemoved: 0 }
    }
    if (oldContent === newContent) {
      return { type: 'unchanged', linesAdded: 0, linesRemoved: 0 }
    }
    const { added, removed } = diffLineCount(oldContent.split('\n'), newContent.split('\n'))
    return { type: 'modified', linesAdded: added, linesRemoved: removed }
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
      // A binary file decoded as UTF-8 is unreadable by definition — say what it
      // is instead of returning the bytes (see binaryFileKind).
      const binaryKind = binaryFileKind(path, content)
      if (binaryKind) {
        // The read already happened, so the decoded length is the fallback size;
        // `wc -c` gives the file's real byte count when the backend can run it.
        const bytes = (await probeFileSize(path)) ?? content.length
        return {
          error:
            `${path} is a binary file (${binaryKind}, ${Math.max(1, Math.round(bytes / 1024))} KB). ` +
            `read_file returns text only — to look at a page use screenshot_preview; to inspect an ` +
            `image you produced, measure it in a script and print the numbers (its size, pixel counts).`,
        }
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

  /**
   * A `list_files` result, bounded when the directory is a package catalog or when the whole
   * listing would not fit one tool result ({@link TOOL_RESULT_CHARS} — molecule-dev's cap on a
   * tool result's text, which cuts a longer one through its MIDDLE). A normal app directory whose
   * listing fits comes back exactly as it always has.
   *
   * @param path - The resolved directory path.
   * @param entries - Everything the backend listed.
   * @returns The listing, or its count plus the first {@link LIST_FILES_HEAD_ENTRIES} names and a note.
   */
  function listFilesResult(
    path: string,
    entries: Array<{ name: string; type: 'file' | 'directory' }>,
  ): Record<string, unknown> {
    const listing = {
      path,
      entries: entries.map((entry) => ({ name: entry.name, type: entry.type })),
    }
    const catalog = packageCatalog(path)
    if (!catalog && JSON.stringify(listing).length <= TOOL_RESULT_CHARS) return listing
    const head = listing.entries.slice(0, LIST_FILES_HEAD_ENTRIES)
    const cut = head.length < entries.length
    const note =
      catalog === 'molecule'
        ? `${entries.length} @molecule packages are installed here` +
          (cut ? `; this listing is cut to ${head.length} names` : '') +
          `. ${MOLECULE_CATALOG_POINTER}.`
        : catalog === 'packages'
          ? `This node_modules holds ${entries.length} entries` +
            (cut ? `; this listing is cut to ${head.length} names` : '') +
            `. ${MOLECULE_CATALOG_POINTER}.`
          : `This directory holds ${entries.length} entries` +
            (cut ? `; this listing is cut to ${head.length}` : '') +
            '. Narrow it with find_files (by path pattern) or search_files (by content), or list a subdirectory.'
    return { path, count: entries.length, entries: head, note }
  }

  const toolImpls: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
    async list_files(input) {
      const path = resolve((input.path as string) || '')
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const entries = await backend.readDir(path)
        return listFilesResult(path, entries)
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
      const path = await resolveWrite(input.path as string)
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

        // The text on disk is the text just written unless an after-write hook (a formatter)
        // may have rewritten it. Without one, the re-read is a whole sandbox round trip per
        // write that can only return what is already in hand — measured in the write path's
        // own timings (x0 fast-file-writes: four sandbox calls per write, one of them this
        // re-read, and the excerpt it feeds is identical either way).
        const finalContent = onAfterWrite
          ? await backend.readFile(path).catch(() => content)
          : content
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
      // The batch and the single top-level pair are EXCLUSIVE forms. A call that
      // carried a nonempty batch AND either top-level string used to apply the
      // batch and silently discard the pair, so the executor believed both edits
      // landed (xr-molecule-flash-m257 +06:08). Refuse BEFORE resolving, reading or
      // writing the file: which form wins, and where the pair would sit in the
      // batch order, cannot be inferred — and merging the two would silently apply
      // an overlap the model never asked the tool to resolve.
      const hasBatch = Array.isArray(input.replacements) && input.replacements.length > 0
      const hasTopLevelEdit = input.old_string !== undefined || input.new_string !== undefined
      if (hasBatch && hasTopLevelEdit) {
        // Name the edit that would have vanished (its first line) so the model
        // recognises it in the re-sent call.
        const head =
          typeof input.old_string === 'string'
            ? input.old_string.split('\n')[0].trim().slice(0, 80)
            : ''
        return {
          error:
            'Nothing changed: edit_file received both edit formats' +
            (head ? ` (the top-level edit starts "${head}")` : '') +
            '. Put EVERY edit, including the top-level old_string/new_string pair, in replacements, in the intended order — or send only the top-level pair with no replacements array. Never mix the two.',
        }
      }
      const path = await resolveWrite(input.path as string)
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

      // `--include` has no brace expansion inside the quoted grep argument, so
      // a brace group is expanded here and grep gets one --include per pattern.
      const includes = include ? expandBraceGlob(include) : []
      if (includes === null) return { error: INCLUDE_GLOB_ERROR }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const globArg = includes.length
          ? includes.map((p) => `--include=${shellQuote(p)}`).join(' ')
          : ''
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
      // `find` has no brace expansion either — the pattern is shell-quoted
      // before it reaches it — so `*.{ts,tsx}` expands here into one predicate
      // per alternative (xr-molecule-flash-m199).
      const patterns = expandBraceGlob(pattern)
      if (patterns === null) return { error: FIND_PATTERN_ERROR }

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
      // Brace alternatives may each name a directory (`{src/a,src/b}/*.ts`),
      // so a narrowing prefix is used only when every expansion agrees on it.
      const prefixes = patterns.map((p) => literalDirPrefix(p))
      const prefixDir = prefixes.every((p) => p === prefixes[0]) ? prefixes[0] : null
      let findRoot = path
      let findArgs = findArgsForPatterns(patterns)
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
            findArgs = joinFindArgs(
              patterns.map((p) =>
                findPathArgs(p.replace(/^(?:\.?\/)+/, '').slice(prefixDir.length + 1)),
              ),
            )
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
      const path = await resolveWrite(input.path as string)
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
      const oldPath = await resolveWrite(input.old_path as string)
      const newPath = await resolveWrite(input.new_path as string)
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
      const path = await resolveWrite(input.path as string)
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

      // A command that starts the suite more than once is refused BEFORE anything runs, in the
      // foreground as well as in the background: each walk measures the same code, and only the
      // last one is rewritten here. The background launcher already refused it; a foreground
      // command ran both, and the platform's note read the first walk's tally beside the second
      // walk's host (X1 xr-molecule-flash-m170 +06:02). ONE reading — {@link repeatedSuiteRunError}
      // — so every launch site refuses the same commands.
      const repeatedSuiteRun = repeatedSuiteRunError(rawCommand)
      if (repeatedSuiteRun) return { error: repeatedSuiteRun }

      // A FOREGROUND command that starts a server never returns: it holds this tool for its whole
      // budget and — behind `| tail`, the way these probes are usually written — prints nothing
      // until it does. X1 xr-molecule-flash-m167 (+19:16 → +24:04) sent
      // `npx tsx --env-file=.env /tmp/probe.mts | tail -15` where the script imports the app's
      // `api/src/server.ts` and calls `create(0)`, whose `listen()` keeps the process alive; the
      // run waited 290 s and was then told to "run a smaller unit". Refused BEFORE anything runs,
      // with the two shapes that work: a background launch (which the platform tracks and hands a
      // task id for) or a probe of the API already on :4000.
      if (input.run_in_background !== true) {
        const server = await foregroundServerCommand(rawCommand, (path) => backend.readFile(path))
        if (server) {
          return {
            error: serverCommandRefusal(
              server,
              Math.max(1, Math.round((commandBudgetMs ?? 290_000) / 1000)),
            ),
          }
        }
        // The same never-returns class, one handle lower: a standalone script that launches a
        // browser and never closes it. X1 xr-molecule-flash-m257 (+10:44 → +15:34) ran a 30-line
        // `fav-probe.mjs` whose `const browser = await chromium.launch()` had no `close()`; Chromium
        // is a live handle, so Node never exited. Behind `| tail` it printed nothing, the tool
        // waited its whole 290 s budget, and the over-budget message then advised "run it in the
        // background" — which only moves the hang. The source reading is narrow and closed-world
        // (browser-probe.ts): an alias, a helper, a context/page disposal or any other cleanup path
        // is left alone.
        const browserProbe = await foregroundBrowserProbe(rawCommand, (path) =>
          backend.readFile(path),
        )
        if (browserProbe) {
          return {
            error: browserProbeRefusal(
              browserProbe,
              Math.max(1, Math.round((commandBudgetMs ?? 290_000) / 1000)),
              /\|\s*(?:tail|head)\b/.test(rawCommand),
            ),
          }
        }
      }

      // A Playwright run of a suite whose config records no trace gets one recorded anyway
      // (`diagnosisTraceCommand`, trace-artifacts.ts): the failing tests' own network log is what
      // tells a swallowed request error from a selector, and X1 xr-molecule-flash-m100 spent the
      // last minutes of its run hand-writing Chromium probes for what the trace it never wrote
      // down would have said. The whole rule is that function's; the whole-suite proof run gets it
      // too, since a trace is retained only for a failing test (m163's proof run left none and the
      // executor hunted one that did not exist).
      const traced = await diagnosisTraceCommand({
        command: rawCommand,
        cwd,
        readFile: (path) => backend.readFile(path),
      })
      let command = traced.command

      // A leading `sleep N; <read of a background task's log>` is a hand-rolled poll, and the
      // platform knows the task's state better than the log's tail does (see
      // {@link backgroundTaskState}): X1 xr-molecule-flash-m105 slept 225 s this way, two of the
      // three on tasks that had already ended. The sleep is dropped and the rest of the command
      // runs at once; with no background task behind it, the sleep is left exactly as sent — the
      // tool's own budget is the existing bound.
      const sleepPeek = leadingSleepPeek(command)
      const peekedTask = sleepPeek
        ? await backgroundTaskState(
            backend,
            command,
            sleepPeek.seconds,
            Math.max(5_000, (commandBudgetMs ?? 290_000) - 10_000),
          )
        : null
      const sleepNote = peekedTask?.note ?? null
      if (sleepPeek && peekedTask) {
        command = sleepPeek.rest
        if (!command) {
          return {
            status: 'task_state',
            note: peekedTask.note,
            ...(peekedTask.slice.trim() ? { outputSoFar: sanitizeOutput(peekedTask.slice) } : {}),
          }
        }
      }

      // The supplied suite's own budget. A run whose runner config sets a different per-test
      // timeout or worker count measures a run the grader never sees: xr-molecule-flash-m169 wrote
      // a 60 s wrapper config, the platform proved the suite on it, and the official 15 s grader
      // then failed five tests the proof could never show. The suite's values are put back on the
      // runner's own arguments — the one place Playwright lets them win over every config — and the
      // result carries the sentence. The consumer reads the configs (it knows where the suite and
      // its base live); this tool only writes the flags where they belong. Before the background
      // branch, so a task launch and a foreground run carry them alike.
      let budgetNote: string | null = null
      const budget: SuiteBudgetOutcome = { pinned: [], config: null, values: {}, drift: {} }
      if (config?.suiteBudget !== undefined && isPlaywrightRunCommand(command)) {
        try {
          const pin = await config.suiteBudget(command, cwd)
          if (pin !== null && pin !== undefined) {
            budgetNote = pin.note
            if (pin.flags.length > 0) {
              const pinned = suiteRunBudgetCommand(command, pin.flags)
              command = pinned.command
              budget.pinned = pinned.placed
            }
            // The settings with no Playwright flag are carried by a config the consumer wrote
            // outside the supplied suite: this run loads that one instead of the config it named.
            if (pin.config !== undefined && pin.config !== '') {
              const configured = suiteRunConfigCommand(command, pin.config)
              if (configured.placed) {
                command = configured.command
                budget.config = pin.config
              }
            }
            budget.values = pin.values ?? {}
            budget.drift = pin.drift ?? {}
          }
        } catch (_error) {
          // A consumer's scan that fails changes nothing: the command runs exactly as asked.
        }
      }

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
          // The platform moved this run to the background because its own bound could not fit
          // this tool's ceiling — and in the background the ceiling no longer applies, so the
          // `timeout N` the executor wrote to fit it is the only bound left, and it kills the
          // walk mid-run with no tally (X1 xr-molecule-flash-m143 +24:45). Lift it from the
          // statement that runs the suite.
          //
          // A run the EXECUTOR detached itself is lifted too when its bound is not a bound for
          // the walk: a number no larger than this tool's ceiling is the ceiling written down
          // (`timeout 290` beside a 290 s ceiling), and a number shorter than the whole walk the
          // consumer measured kills it just the same (xr-molecule-flash-m200: a deployed walk
          // killed at test 103 of 138 by `timeout 290` beside a 290 s ceiling). A bound that is a
          // real budget for the walk is kept (`timeout 900`).
          let wholeRunMs: number | null = null
          let lifted: { command: string; seconds: number | null } = { command, seconds: null }
          if (overCeiling && input.run_in_background !== true) {
            lifted = withoutSuiteTimeout(command)
          } else if (input.run_in_background === true && isSuiteRunCommand(command)) {
            const candidate = withoutSuiteTimeout(command)
            if (candidate.seconds !== null && candidate.seconds > 0) {
              let measured: number | null = null
              try {
                measured = (await suiteRunMs?.(command, cwd)) ?? null
              } catch (_error) {
                // A consumer's reading that fails changes nothing: the ceiling rule still runs.
                measured = null
              }
              const fitsCeiling =
                ceilingSeconds > 0 &&
                candidate.seconds <= ceilingSeconds + CEILING_FITTED_SLACK_SECONDS
              const shorterThanWalk =
                measured !== null &&
                Number.isFinite(measured) &&
                measured > 0 &&
                candidate.seconds * 1000 < measured
              if (fitsCeiling || shorterThanWalk) {
                lifted = candidate
                // The duration is named only when it is what justifies the lift: a measured walk
                // shorter than the bound says nothing about why a ceiling-sized bound goes.
                wholeRunMs = shorterThanWalk ? measured : null
              }
            }
          }
          if (lifted.seconds !== null) command = lifted.command
          // Keep the log growing while it runs (see streamingBackgroundCommand):
          // an empty log is what wait_for_task reads as stuck.
          // The request's own exclusions ride along: a `--grep-invert` that names one of them is
          // the proof scope written as a flag, not a diagnosis, so it keeps the suite's retries
          // (xr-molecule-flash-m170 +33:16). The getter is the host's, read here at launch time.
          const streaming = streamingBackgroundCommand(command, {
            approvedExclusions: excludedTestTitles?.() ?? [],
          })
          // A command that starts the suite more than once is refused here, before anything is
          // written or launched: each walk measures the same code, and only the last is rewritten
          // (X1 xr-molecule-flash-m157 +14:02 — two whole walks chained with `;`).
          if (streaming.error) return { error: streaming.error }
          // This tool already backgrounds the script. If its last statement also uses `&`,
          // let the same shell wait for that child and preserve its exit code. Inferring its
          // completion from output cannot work for silent commands such as `true &`.
          // The parser reads the outer shell: an inner `sh -c '… &'` has its own job table.
          if (endsInBackground(streaming.command)) {
            streaming.command += '\nwait "$!"'
          }
          // …and the trace flag this tool added (above), which the streaming rewrite never saw:
          // its changes are what this branch reports the run's own settings in.
          if (traced.change) streaming.changes.unshift(traced.change)
          // Said once, in the result that also hands back the task id or the run's output.
          if (lifted.seconds !== null) {
            streaming.changes.unshift(
              wholeRunMs !== null
                ? `Dropped your \`timeout ${lifted.seconds}\` from the suite run: a whole walk takes ` +
                    `~${durationText(wholeRunMs)} and runs in the background, where it is bounded by ` +
                    '`wait_for_task` and the turn’s deadline — the bound would only have killed the walk.'
                : `Dropped your \`timeout ${lifted.seconds}\` from the suite run: in the background it ` +
                    'is bounded by `wait_for_task` and the turn’s deadline, not by this tool’s ' +
                    'ceiling, so the bound you wrote would only have killed the walk.',
            )
          }
          // A whole-suite run starves the sandbox it shares with the app and with
          // every command the executor sends next, so it starts at lower CPU and
          // IO priority (see suiteRunPriorityLaunch). Foreground runs are never
          // touched, and a sandbox without the tools runs it unchanged.
          const prioritized = suiteRunPriorityLaunch(
            streaming.command,
            `sh ${script} > ${log} 2>&1; echo $? > ${exitFile}`,
          )
          // The target comes back without its shell quotes (`> '/tmp/x.log'` is `/tmp/x.log`);
          // `posix.resolve` leaves an absolute one absolute and places a relative one under the
          // cwd the command ran in (X1 flash-m134 +31:20: `${cwd}/${target}` produced
          // `/workspace/'/tmp/…'`, a path nothing writes).
          const ownTarget = outputRedirectTarget(streaming.command)
          const ownFile = ownTarget === null ? null : posix.resolve(cwd, ownTarget)
          if (ownFile) outputFileByTask.set(id, ownFile)
          // Nothing is recorded about the inline-failure switch here: every background launch is
          // given it, so the command says nothing about what the log will carry. A wait reads the
          // log itself (see inlineFailuresByTask).
          runByTask.set(id, { command: streaming.command, cwd })
          const launched = launchedByBackend.get(backend) ?? new Set<string>()
          launched.add(id)
          launchedByBackend.set(backend, launched)
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
          // exactly as a foreground run returns. A redundant final `&` is followed by `wait`
          // above, so this file also carries the actual child status in that case.
          if (overCeiling && input.run_in_background !== true) {
            const graceUntil = Date.now() + overCeilingGraceMs
            while (Date.now() < graceUntil) {
              let code: number | null = null
              try {
                code = exitCodeIn(await backend.readFile(exitFile))
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
                      (sleepNote ? `${sleepNote} ` : '') +
                      (budgetNote ? `${budgetNote} ` : '') +
                      cutRunSentence(cut) +
                      // A suite stopped in the background is never sent to the background again:
                      // the sentence says what to do, and the advice's reason (it “takes the run
                      // off this budget and writes its output to a log”) has already happened.
                      (cut.background
                        ? ''
                        : ` ${
                            isSuiteRunCommand(command)
                              ? SUITE_OVER_BUDGET_ADVICE
                              : SPLIT_WORK_ADVICE
                          }`),
                  }
                }
                // The exit file holds the PIPELINE's code: when a stage this rewrite could not
                // prove is output-only still follows the suite runner (`| tee run.log`), that code
                // is the filter's — report none and let the log's tally decide (m101 +25:54). The
                // note says this only when the parse found such a stage (m105 +08:12).
                const placement = suiteRunPipelinePlacement(streaming.command)
                const reported = suiteRunExitCode(code, output, placement.piped)
                const exitNote = suiteExitCodeNote(placement, reported)
                // The same question the foreground path asks: when the code is a filter's, say
                // which stage produced it (and what the output carries) rather than leaving a
                // 0 beside a printed error.
                const pipeNote =
                  reported === null
                    ? null
                    : pipelineExitCodeNote(streaming.command, reported, output)
                const notes = [
                  ...(sleepNote ? [sleepNote] : []),
                  ...(budgetNote ? [budgetNote] : []),
                  ...streaming.changes,
                  ...(exitNote === null ? [] : [exitNote]),
                ]
                return {
                  stdout,
                  stderr: '',
                  exitCode: reported,
                  ...(pipeNote === null ? {} : { exitCodeNote: pipeNote }),
                  ...(output.length > MAX_OUTPUT_SIZE ? { truncated: true, fullOutput: log } : {}),
                  ...(notes.length ? { note: notes.join(' ') } : {}),
                  ...suiteBudgetField(budget),
                }
              }
              await new Promise((r) => setTimeout(r, 1_500))
            }
          }
          return {
            taskId: id,
            log,
            exitFile,
            ...(peekedTask?.slice.trim() ? { outputSoFar: sanitizeOutput(peekedTask.slice) } : {}),
            ...suiteBudgetField(budget),
            note:
              (sleepNote ? `${sleepNote} ` : '') +
              (budgetNote ? `${budgetNote} ` : '') +
              (overCeiling
                ? declaredSeconds > ceilingSeconds
                  ? `This command asks for ${declaredSeconds}s, more than this tool's ${ceilingSeconds}s, and its ` +
                    'output only appears when it ends — so it was started in the background instead. '
                  : `A Playwright run can take longer than this tool's ${ceilingSeconds}s, and behind a pipe its ` +
                    'output only appears when it ends — so it was started in the background instead. '
                : '') +
              `Started in the background. Its output is written to ${log} and comes back as the ` +
              `stdout of wait_for_task when the command finishes (read_file cannot reach /tmp). If ` +
              `you have other work, do it and check back. If you need this result before you can ` +
              `continue, call wait_for_task with this taskId: it returns the moment the command ` +
              `ends, returns early when a failure cause repeats, and reports progress and the ` +
              `failures so far — never sleep and read the log by hand.` +
              (streaming.changes.length ? ` ${streaming.changes.join(' ')}` : '') +
              (prioritized.note ? ` ${prioritized.note}` : '') +
              (ownFile
                ? ` This command writes its own output to ${ownFile}, so the task log stays empty: wait_for_task reads that file when the command ends and reports its progress while it runs — never sleep and tail it by hand.`
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
        // An inline interpreter program that only reads and writes local files (a `python3`
        // heredoc, `node -e`) finishes in milliseconds or never ends — xr-molecule-flash-m200
        // (+03:45) burned 291 s on a backtracking `re.findall` over a minified CSS file, then was
        // told to "run it in the background", which only moves the hang. It gets a short budget
        // instead of the build budget, and a cut says what it is (inline-script.ts).
        const inlineScript = inlineLocalScriptCommand(command)
        const toolCeilingMs =
          inlineScript === null
            ? commandBudgetMs
            : Math.min(commandBudgetMs ?? INLINE_SCRIPT_BUDGET_MS, INLINE_SCRIPT_BUDGET_MS)
        const budgetSeconds = toolCeilingMs ? Math.max(1, Math.round(toolCeilingMs / 1000)) : 0

        // A requested budget is honored DOWNWARD only. The model used to send
        // `timeout: 900000` for a test suite, the field was not declared so it
        // was silently dropped, and the command was killed at the ceiling with
        // no hint that a ceiling existed — costing a full budget per attempt
        // before the overrun message could teach anything (X0 R83/R84). Now the
        // ceiling is reported the FIRST time a larger one is asked for.
        const requestedMs = Number(input.timeout)
        const wantsMore =
          inlineScript === null &&
          Number.isFinite(requestedMs) &&
          requestedMs > 0 &&
          requestedMs > (toolCeilingMs ?? 0)
        const effectiveBudgetMs =
          Number.isFinite(requestedMs) && requestedMs > 0 && toolCeilingMs
            ? Math.min(requestedMs, toolCeilingMs)
            : toolCeilingMs
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
          // A probe that wrote its own script and then ran it is only readable NOW: the preflight
          // read a file that did not exist yet (m257's `fav-probe.mjs` was written in an earlier
          // turn, but a `cat > probe.mjs <<EOF … && node probe.mjs` is the same seam). Re-read it
          // before falling back to "run a smaller unit", which is advice about the wrong axis —
          // and would send a leaked handle to the background, where it hangs just the same.
          const cutBrowserProbe =
            inlineScript === null && !startsServerProgram(command) && !isSuiteRunCommand(command)
              ? await foregroundBrowserProbe(command, (path) => backend.readFile(path))
              : null
          if (cutBrowserProbe !== null) cut.browserProbe = cutBrowserProbe.variable
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
              (sleepNote ? `${sleepNote} ` : '') +
              (budgetNote ? `${budgetNote} ` : '') +
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
              (inlineScript !== null
                ? inlineScriptRunawaySentence(inlineScript, cut.seconds)
                : startsServerProgram(command)
                  ? SERVER_OVER_BUDGET_ADVICE
                  : cutBrowserProbe !== null
                    ? browserProbeOverBudgetAdvice(cutBrowserProbe)
                    : isSuiteRunCommand(command)
                      ? SUITE_OVER_BUDGET_ADVICE
                      : SPLIT_WORK_ADVICE),
          }
        }
        // A pipeline reports its LAST stage's code: `tsc | head` says 0 beside a printed type
        // error, and `tsc | head && tail missing.log` says 1 beside a clean check. Name the
        // stage the number came from (pipeline-exit-note.ts) — the field the executor trusts
        // most must not contradict the text it can read.
        const exitCodeNote = pipelineExitCodeNote(
          command,
          result.exitCode,
          `${result.stdout}\n${result.stderr}`,
        )
        return {
          stdout,
          stderr,
          exitCode: result.exitCode,
          ...(exitCodeNote === null ? {} : { exitCodeNote }),
          ...(peekedTask?.slice.trim() ? { outputSoFar: sanitizeOutput(peekedTask.slice) } : {}),
          ...suiteBudgetField(budget),
          ...(sleepNote || ceilingNote || traced.change || budgetNote
            ? {
                note: [sleepNote, ceilingNote, traced.change, budgetNote].filter(Boolean).join(' '),
              }
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
      // An id another project launched is not this project's to wait on — its files are in that
      // project's sandbox, so a wait here would poll for an exit file that never appears, and its
      // wait time would count against that project's own stuck clock (xr-molecule-flash-m208
      // +12:00 waited ~5 min on m207's walk). Answered at once, before any per-task state is read.
      if (TASK_ID.test(taskId)) {
        const owned = await ownedTaskIds(backend, [taskId])
        if (owned && !owned.has(taskId)) {
          const recent = [...runByTask.keys()].slice(-64)
          const mine = (await ownedTaskIds(backend, recent)) ?? new Set<string>()
          const list = recent.filter((id) => mine.has(id)).reverse()
          return {
            taskId,
            status: 'unknown',
            note:
              `No background task \`${taskId}\` was started in this project — ` +
              (list.length
                ? `the ids this project launched are: ${list.map((id) => `\`${id}\``).join(', ')}.`
                : 'this project has launched no background task.'),
          }
        }
      }
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
          const script = await backend.readFile(`/tmp/${taskId}.sh`)
          const target = outputRedirectTarget(script)
          // A relative target was written against the command's own cwd, which
          // the handle does not carry; the project root is where a background
          // command runs unless the caller passed one. An absolute target is
          // already resolved and stays as written.
          if (target) outputFileByTask.set(taskId, posix.resolve(root, target))
          // The launch's own shape outlives this process the same way its redirect target does:
          // a command that ended in `&` is still a launch acknowledgement, not a finished run.
          if (endsInBackground(script)) detachedByTask.add(taskId)
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
      // The file every note below must point the executor at: the one its own reads and
      // `outputSoFar` come from. A command that redirects its output (`> /tmp/pw-full.log`) leaves
      // the task log holding a word, so a grep composed against THAT prints nothing — xr-molecule-
      // flash-m173 (+17:07) obeyed the +12:18 note's `grep … /tmp/mol-bg-….log`, every grep
      // printed empty, and the whole mid-run diagnosis window was lost. The task's own wrapper log
      // stays `log` wherever something is read from both (the size probe and the slice do).
      const readLog = outputFileByTask.get(taskId) ?? log
      const exitFile = `/tmp/${taskId}.exit`
      // Leave the outer tool ceiling a margin so this returns a result rather
      // than being killed by it.
      const ceiling = Math.max(5_000, (commandBudgetMs ?? 290_000) - 10_000)
      const requested = Number(input.timeout)
      const budgetMs =
        Number.isFinite(requested) && requested > 0 ? Math.min(requested, ceiling) : ceiling
      const startedAt = Date.now()
      // A task whose command ended in `&` writes its exit file the moment it launches, with the
      // launch's own status: that code is an acknowledgement, never the run's verdict, and its end
      // is read from its own output by {@link taskEndState} instead.
      const detachedRun = detachedByTask.has(taskId)
      const readExit = async (): Promise<number | null> => {
        if (detachedRun) return null
        try {
          // A file that is there but holds no number yet is the launcher's truncate-then-write
          // instant, not a verdict — the next tick reads the code (see {@link exitCodeIn}).
          return exitCodeIn(await backend.readFile(exitFile))
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
      // How this run was started, so the note can hand over the re-run to send once it ends
      // instead of one for now — the platform refuses a second run against the same app and
      // database while this one walks (xr-molecule-flash-m89: the +19:59 note named a re-run
      // and its overlap hold refused that exact run 23 s later) — and so a run narrowed to a
      // file or two is judged against what it selected (xr-molecule-flash-m119 +42:08). Read
      // BEFORE the loop: the running answers below are built after it closes and still need it.
      const started = runByTask.get(taskId)
      let midRunNote: string | null = null
      let lastCauseLookAt = startedAt - repeatingCauseLookMs()
      let lastEndLookAt = startedAt - TASK_END_LOOK_MS
      let endedWithoutCode = false
      let exitCode = await readExit()
      while (exitCode === null && Date.now() - startedAt < budgetMs) {
        await new Promise((r) =>
          setTimeout(r, Math.min(2_000, budgetMs - (Date.now() - startedAt))),
        )
        exitCode = await readExit()
        // The exit file is read first, so a run that finishes between two looks still returns
        // its real result instead of a note about it.
        if (exitCode !== null) break
        // A missing exit file is not "running": the launcher writes that file from its wrapper,
        // and a command that backgrounds its real work leaves it missing after the run is over.
        // The same end test the sleep peek uses answers here, before a cause look can `continue`
        // past it — m182 (+30:25) waited 281 s on a walk that had ended in 20 s.
        if (Date.now() - lastEndLookAt >= TASK_END_LOOK_MS) {
          lastEndLookAt = Date.now()
          const state = await taskEndState(backend, taskId)
          if (state.ended) {
            exitCode = state.exitCode
            endedWithoutCode = state.exitCode === null
            break
          }
        }
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
        // The log is the evidence for what the wait may promise about it: a failure's own body
        // printed under a `✘` row means the run writes each failure's report as that test fails
        // (see inlineFailuresByTask).
        if (!inlineFailuresByTask.has(taskId) && logShowsInlineFailureBodies(causeLog))
          inlineFailuresByTask.add(taskId)
        const found = repeatingFailure(causeLog)
        // The page-renders-nothing cause needs no repeated signature: every spec waits for its
        // own first element, so the failures differ while the cause does not (m141).
        const universal = universalCause(causeLog, found, started?.command)
        if (!found && !universal) continue
        // The ONE predicate behind this decision and `repeatingFailureNote`'s wording, so the two
        // cannot come to different verdicts.
        const stopCause = earlyReturnCause(found, universal)
        if (stopCause) {
          // The note's rows and re-run hint are about the failures the cause covers; an
          // empty-page cause carries its own list, and a run with no repeated signature has no
          // other one.
          const noted: RepeatingFailure = found ?? {
            count: stopCause.count,
            message: null,
            seconds: null,
            tests: stopCause.tests ?? [],
          }
          // …and only now is the pid walk paid for.
          repeatingCauseNoted.add(taskId)
          const earlyMs = Date.now() - startedAt
          waitedByTask.set(taskId, waitedBefore + earlyMs)
          return {
            taskId,
            status: 'repeating_failure',
            waitedMs: earlyMs,
            note: repeatingFailureNote(noted, {
              taskId,
              log: readLog,
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
        // Without a repeated signature there is no lead to note (the empty-page cause above is
        // the only reading that needs none).
        if (!found) continue
        if (!midRunLeadNoted.has(taskId)) {
          midRunLeadNoted.add(taskId)
          // A run against the sandbox's own app is changed by an edit while it walks — the two
          // instructions the note and the wait's own sentence give must agree (xr-molecule-flash-
          // m122 +19:00: one result said editing app/src "changes the code the run is testing" and
          // "Start fixing it now"). The target is read off the command the task was started with.
          const editsInvalidateRun =
            started === undefined || suiteCommandTarget(started.command) === 'local'
          midRunNote = repeatingFailureNote(found, {
            taskId,
            log: readLog,
            stop: '',
            universal: null,
            ...(started ? { run: started } : {}),
            ...(editsInvalidateRun ? { editsInvalidateRun: true } : {}),
          })
        }
      }
      const waitedMs = Date.now() - startedAt
      waitedByTask.set(taskId, waitedBefore + waitedMs)
      // A task the end test found over with no exit code is FINISHED, not still walking: its
      // result is read below from its own output. Only a task still alive (or a sandbox that
      // could not answer) reaches the running/stuck answers.
      if (exitCode === null && !endedWithoutCode) {
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
        // The slice is the log's own text, so it answers what the note may promise: a body under
        // a `✘` row means this run prints each failure's report as that test fails (see
        // inlineFailuresByTask). Read here as well as in the cause look, because a wait shorter
        // than the look's interval never takes one.
        if (!inlineFailuresByTask.has(taskId) && logShowsInlineFailureBodies(soFar))
          inlineFailuresByTask.add(taskId)
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
        // A log that already finished one walk and started a second is not a run to keep waiting
        // on: the first walk's tally is the measurement and the second only repeats it, so the
        // advice below hands over the stop instead of "keep waiting" (m157 +14:02).
        const secondWalk = secondSuiteWalk(soFar) !== null
        const stopInstead = secondWalk
          ? ` Stop it (\`exec_command: ${await taskStopCommand(backend, taskId)}\`) and read the ` +
            `first walk's tally in ${readLog} — the second walk measures nothing new.`
          : null
        if (stillWriting && waitedBefore + waitedMs >= stuckAfterMs()) {
          waitedByTask.set(taskId, 0)
          return {
            taskId,
            status: 'running',
            waitedMs,
            ...sliceField,
            note:
              `${progress}` +
              (stopInstead ??
                ` Call wait_for_task again to keep waiting — it returns the moment the ` +
                  `command ends and reports the failures as they appear.`) +
              `${midRun}`,
          }
        }
        if (waitedBefore + waitedMs >= stuckAfterMs()) {
          return {
            taskId,
            status: 'stuck',
            waitedMs: waitedBefore + waitedMs,
            note:
              `${Math.round((waitedBefore + waitedMs) / 1000)}s of waiting and it has not exited — it is ` +
              `stuck, not slow. See what it printed with exec_command (tail ${readLog} — ` +
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
            `${progress}` +
            (stopInstead ??
              ` Call wait_for_task again to ` +
                `keep waiting — its result carries the log output. ` +
                (soFar.trim()
                  ? `outputSoFar is the failure lines so far (up to ${RUNNING_FAILURE_LINES}) and then the end of ` +
                    `the log, not the whole run — \`grep -n '✘' ${readLog} | head -40\` lists every failure, ` +
                    `\`grep -n -A 20 '<test name>' ${readLog}\` reads one failure's error: ` +
                    // The promise is made only when the launch actually set the inline switch
                    // (inlineFailuresByTask). A run whose shape withheld it prints each failure's
                    // error in the end-of-run summary alone, and telling the model to grep under
                    // the ✘ row sent it through greps that could not match (xr-molecule-flash-m173
                    // +17:07, +39:14 — the m99 class, recurring).
                    (inlineFailuresByTask.has(taskId)
                      ? `this run writes each failure's own report into the log as that test fails, ` +
                        `right under its ✘ line, not only in the summary at the end. `
                      : `this run prints each failure's error only in the summary at the end; until ` +
                        `then the ✘ rows are all there is. `)
                  : `Nothing has been printed yet — \`grep -n '✘' ${readLog} | head -40\` lists failures as they appear. `) +
                // What an edit does to this run depends on what the run MEASURES: the sandbox's own
                // app is re-served from app/src as it is edited, so the run's result stops counting; a
                // run against the deployed build is untouched by a local edit, and the executor can
                // spend the rest of the run fixing (xr-molecule-flash-m122 +19:00: a deployed run was
                // told editing changes what it tests, then handed "Start fixing it now" in the same
                // result — it waited out 1 min 11 s of free fixing time).
                (started !== undefined && suiteCommandTarget(started.command) !== 'local'
                  ? `Meanwhile fix what it has already named: this run tests the deployed build, so editing app/src or api/src now does not change what it tests — fix the causes it has already named while it walks, run nothing against the app until it ends, then deploy once.`
                  : `Meanwhile do work that leaves the code under test alone (read the failures so far, plan the fixes): editing app/src or api/src now changes the code the run is testing, and its result no longer counts.`)) +
            `${midRun}`,
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
      // What the REQUEST requires of this suite and the run left out: the narrowed re-run below
      // is composed from the run's own command, so without these it would measure the same wrong
      // configuration again (m182: the request names `TEST_MODE=fullstack`, the run and its
      // re-run both omitted it, and the walk measured the `spa` suite). The consumer's reading,
      // asked once per finished run; a failure to read answers "nothing required".
      const requiredEnv =
        run && requiredSuiteEnv
          ? ((await requiredSuiteEnv(run.command, run.cwd).catch(() => [])) ?? [])
          : []
      // The tests the request excludes are not causes to fix, and the re-run below inverts them
      // out — a result must never ask the executor to fix a test it also says does not count.
      // The log's own path rides along so a recap that leaves causes out can hand over the ONE
      // grep that prints their bodies: the stdout above is cut in the middle, so the log is where
      // they still are whole.
      const causes = failureCausesNote(
        output,
        excludedTestTitles?.() ?? [],
        run ? { ...run, log: ownFile ?? log, env: requiredEnv } : undefined,
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
      // the same way. The exit file holds the PIPELINE's code: when a stage this rewrite could not
      // prove is output-only still follows the suite runner (`| tee run.log`), that code is the
      // filter's — report none and let the log's tally decide (m101 +25:54). The note says this
      // only when the parse found such a stage (m105 +08:12).
      const placement = run
        ? suiteRunPipelinePlacement(run.command)
        : { piped: false, unplaced: false }
      const reported = suiteRunExitCode(exitCode, output, placement.piped)
      // A run that ended with no code at all is not a filtered pipeline: the sentence below says
      // where its result came from, and claiming a stage after the runner would contradict it.
      const noCodeNote = endedWithoutCode ? null : suiteExitCodeNote(placement, reported)
      // The task ended and no exit file recorded a verdict: say so, and say where the result came
      // from, so the executor reads it instead of waiting on a handle that can never answer.
      const endedNote = endedWithoutCode
        ? 'It ended without writing an exit code — its process is gone' +
          (ownFile ? `, and its own output (${ownFile}) is the result below` : '') +
          '. Read that result; do not wait on this task again.'
        : null
      // A FINISHED result says so, even when the code it would report is withheld: a filtered
      // pipeline's code is not the run's verdict ({@link FILTERED_EXIT_NOTE}), so `exitCode` alone
      // cannot tell a caller this is the delivered result rather than a progress return — and a
      // caller that tracks background tasks would hand the same result back as fresh news later.
      return {
        taskId,
        status: 'completed',
        exitCode: reported,
        waitedMs,
        ...(causes || noCodeNote || endedNote
          ? {
              note: [causes, noCodeNote, endedNote]
                .filter((n): n is string => Boolean(n))
                .join(' '),
            }
          : {}),
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
