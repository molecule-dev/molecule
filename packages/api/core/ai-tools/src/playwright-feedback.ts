/**
 * Run the project's real Playwright files at explicit checkpoints while an agent keeps writing.
 *
 * Writes only advance the source revision; nothing runs in the background. A checkpoint re-runs
 * only the failures recorded by completed native runs (the host's own, or an earlier checkpoint's),
 * using the runner's failed-test records and whole serial groups, and reuses current passes.
 * @module
 */
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { posix } from 'node:path'

import { feedbackProcessSource } from './playwright-feedback-process.js'
import { joinSerialGroups, withSerialGroups } from './playwright-feedback-records.js'
import {
  feedbackReporterSource,
  nativeFeedbackFailures,
  nativeTestOutcomes,
} from './playwright-feedback-reporter.js'
import { selectFeedbackSpecs } from './playwright-feedback-selection.js'
import type {
  FeedbackProject,
  FeedbackSource,
  FeedbackSpec,
  PlaywrightFeedback,
  PlaywrightFeedbackCheckOptions,
  PlaywrightFeedbackFailure,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from './playwright-feedback-types.js'
import { summarizePlaywrightReport } from './playwright-report.js'
import type { ExecutionBackend } from './types.js'
import { redactSecrets, shellQuote } from './utilities.js'

/**
 * Whether a source change can alter markup, copy, styling or local runner configuration.
 * @param path - The path reported by the host's file-change subscription.
 * @returns True for app source and data formats; never a correctness judgment.
 */
export function isPlaywrightFeedbackSource(path: string): boolean {
  return /\.(?:[cm]?[jt]sx?|vue|svelte|html?|css|json|mdx?)$/i.test(path)
}

/**
 * A native outcome with nothing left to fix: every test passed, or every test skipped itself.
 * @param result - One spec's native result.
 * @returns True for `passed` and `skipped`.
 */
function settledClean(result: PlaywrightFeedbackResult): boolean {
  return result.status === 'passed' || result.status === 'skipped'
}

/**
 * Runner output for a diagnostic reason, without the package manager's own notices.
 * @param text - The runner's stderr.
 * @returns The remaining lines, trimmed; empty when only notices were printed.
 */
function runnerOutput(text: string): string {
  return text
    .split('\n')
    .filter((line) => line.trim() && !/^npm (?:warn|notice)\b/i.test(line.trim()))
    .join('\n')
    .trim()
}

/**
 * Playwright's own last-run record, reduced to the ids of the tests it names.
 * @param text - A `.last-run.json` the runner wrote (`{ status, failedTests }`).
 * @returns The same record re-serialized with only its test ids, or undefined when it names none
 *   or is not a record (a missing, oversized or malformed file).
 */
function lastRunRecord(text: string): string | undefined {
  return failedTestsRecord(recordedTestIds(text))
}

/**
 * The test ids a last-run record names.
 * @param text - A `.last-run.json` (`{ status, failedTests }`).
 * @returns Its ids; none for a missing, oversized or malformed record.
 */
function recordedTestIds(text: string): string[] {
  if (text.length > 200_000) return []
  try {
    const value = JSON.parse(text) as { failedTests?: unknown }
    return Array.isArray(value.failedTests)
      ? value.failedTests.filter((id): id is string => typeof id === 'string' && id.length <= 200)
      : []
  } catch (_error) {
    // Not JSON: no record, so the next checkpoint runs the whole file.
    return []
  }
}

/**
 * A last-run record in Playwright's own shape, which `--last-failed` reads.
 * @param ids - Test ids, as the runner's reporter API reports them (`TestCase.id`).
 * @returns The record, or undefined when it would name no test.
 */
function failedTestsRecord(ids: readonly string[]): string | undefined {
  const distinct = [...new Set(ids)]
  return distinct.length ? JSON.stringify({ status: 'failed', failedTests: distinct }) : undefined
}

/**
 * Track source writes and answer explicit checkpoints with the project's native Playwright runs.
 *
 * Nothing runs on a write: a write only advances the source revision. Browser work runs inside
 * {@link PlaywrightFeedback.check}, which the host calls before an action that needs current
 * results (a deploy). A run the host made itself is handed over with
 * {@link PlaywrightFeedback.record}, so a checkpoint reuses its passes and re-runs only its
 * recorded failures.
 * @param options - Source loader and native runner.
 * @returns Write tracking, recorded outcomes and an explicit current-revision checkpoint.
 */
export function createPlaywrightFeedback(options: PlaywrightFeedbackOptions): PlaywrightFeedback {
  let revision = 0
  let running: Promise<PlaywrightFeedbackResult> | undefined
  let cancellation: AbortController | undefined
  let stopped = false
  let root: string | undefined
  let testRoots: string[] | undefined
  const commands = new Map<string, string>()
  const failing = new Set<string>()
  const outcomes = new Map<string, PlaywrightFeedbackResult>()
  // The runner's record of the tests each spec's latest failed run did not pass. A known-failures
  // checkpoint re-runs only those tests; a failed run without a record drops an older one.
  const failedRecords = new Map<string, string>()
  // Each file's serial groups, from every run that reported them. Every record kept or handed to
  // the runner names whole groups, so a group's later test never runs without its earlier ones.
  const serialGroups = new Map<string, string[][]>()
  const learnGroups = (path: string, result: PlaywrightFeedbackResult): void => {
    if (result.serialGroups?.length)
      serialGroups.set(path, joinSerialGroups(serialGroups.get(path) ?? [], result.serialGroups))
  }
  const grouped = (path: string, ids: readonly string[]): string | undefined =>
    failedTestsRecord(withSerialGroups(ids, serialGroups.get(path) ?? []))
  const remember = (path: string, result: PlaywrightFeedbackResult): void => {
    const record = result.lastRun ? grouped(path, recordedTestIds(result.lastRun)) : undefined
    if (record) failedRecords.set(path, record)
    else failedRecords.delete(path)
  }
  // A selection reports only the tests it ran. A known failure is a test whose latest run failed:
  // the tests it saw fail join the record, the ones it saw pass leave it, and the tests it did not
  // run keep whatever the older record said about them.
  const rememberSelection = (path: string, result: PlaywrightFeedbackResult): void => {
    const failedNow = result.lastRun ? recordedTestIds(result.lastRun) : []
    const passedNow = new Set(result.passedTests ?? [])
    if (!failedNow.length && !passedNow.size) return
    const known = failedRecords.get(path)
    const merged = grouped(path, [
      ...(known ? recordedTestIds(known) : []).filter((id) => !passedNow.has(id)),
      ...failedNow,
    ])
    if (merged) {
      failing.add(path)
      failedRecords.set(path, merged)
    } else if (known) {
      // Every test the record named has passed since, and none failed: nothing is known to fail.
      // A file known to fail without a record keeps that status; nothing here says which test.
      failing.delete(path)
      failedRecords.delete(path)
    }
  }
  const revisionSources = new Set<string>()
  let checking: Promise<PlaywrightFeedbackResult[]> | undefined
  const learnProject = (project: FeedbackProject): void => {
    root = project.root
    testRoots = project.testRoots?.map((input) => posix.resolve(input))
    for (const spec of project.specs) {
      const identity = JSON.stringify([spec.cwd, spec.command])
      const previous = commands.get(spec.path)
      commands.set(spec.path, identity)
      if (previous === undefined || previous === identity) continue
      failedRecords.delete(spec.path)
      serialGroups.delete(spec.path)
      outcomes.delete(spec.path)
    }
  }
  const check = (
    checkOptions: PlaywrightFeedbackCheckOptions = {},
  ): Promise<PlaywrightFeedbackResult[]> => {
    if (checking) return checking
    if (stopped) return Promise.resolve([])
    // Re-verifying known failures only: with none known there is nothing to load or run.
    if (checkOptions.failedOnly && failing.size === 0) return Promise.resolve([])
    checking = (async () => {
      const version = revision
      const abort = new AbortController()
      cancellation = abort
      const results: PlaywrightFeedbackResult[] = []
      try {
        const project = await options.load()
        if (stopped || abort.signal.aborted || version !== revision) return []
        learnProject(project)
        const paths = [...revisionSources].map((p) =>
          project.root ? posix.resolve(project.root, p) : p,
        )
        const selected = selectFeedbackSpecs(project, paths)
          .filter(({ spec }) => !checkOptions.failedOnly || failing.has(spec.path))
          .sort((a, b) => Number(failing.has(b.spec.path)) - Number(failing.has(a.spec.path)))
        const native = async (
          spec: FeedbackSpec,
          sourceFiles: string[],
          record?: string,
        ): Promise<PlaywrightFeedbackResult> => {
          // A whole-file run calls the host exactly as before; only a record adds the argument.
          running =
            record === undefined
              ? options.run(spec, sourceFiles, version, () => {}, abort.signal)
              : options.run(spec, sourceFiles, version, () => {}, abort.signal, record)
          try {
            return await running
          } finally {
            running = undefined
          }
        }
        for (const { spec, sourceFiles } of selected) {
          if (stopped || abort.signal.aborted || version !== revision) break
          let result = outcomes.get(spec.path)
          // Reuse passes and self-skipped specs only. A restart, fixture repair or
          // transient failure can change a failed outcome without changing application source.
          // With the file's serial groups as they are known now, which a later run may have widened.
          const stored = checkOptions.failedOnly ? failedRecords.get(spec.path) : undefined
          const record = stored && grouped(spec.path, recordedTestIds(stored))
          let answered = false
          if ((!result || !settledClean(result)) && record) {
            // Only the tests the last failed run named. Their pass clears the known failure; the
            // result is diagnosis of that selection, never a whole-file pass.
            const known = await native(spec, sourceFiles, record)
            learnGroups(spec.path, known)
            if (stopped || abort.signal.aborted || version !== revision) break
            options.onResult?.(known)
            if (known.selection === 'last-failed' && known.status === 'failed') {
              results.push(known)
              failing.add(spec.path)
              remember(spec.path, known)
              // Each known-failing file answers with its own record, so one hold names them all.
              continue
            }
            if (known.selection === 'last-failed' && settledClean(known)) {
              results.push(known)
              failing.delete(spec.path)
              failedRecords.delete(spec.path)
              continue
            }
            if (known.selection === 'last-failed') {
              // The record selected nothing the runner could run (a renamed or removed test):
              // the whole file answers instead.
              failedRecords.delete(spec.path)
            } else {
              // A host that does not pass records on ran the whole file: that is its answer.
              result = known
              outcomes.set(spec.path, known)
              answered = true
            }
          }
          if (!result || (!answered && !settledClean(result))) {
            result = await native(spec, sourceFiles)
            learnGroups(spec.path, result)
            if (stopped || abort.signal.aborted || version !== revision) break
            options.onResult?.(result)
            outcomes.set(spec.path, result)
          }
          results.push(result)
          if (result.status === 'failed') {
            failing.add(spec.path)
            remember(spec.path, result)
            // A full checkpoint answers at its first failing file; a known-failures checkpoint
            // goes on to every other file already known to fail.
            if (checkOptions.failedOnly) continue
          }
          if (!settledClean(result)) break
          failing.delete(spec.path)
          failedRecords.delete(spec.path)
        }
        if (stopped || abort.signal.aborted || version !== revision) return []
        return results
      } finally {
        running = undefined
        if (cancellation === abort) cancellation = undefined
      }
    })().finally(() => {
      checking = undefined
    })
    return checking
  }
  return {
    changed(paths) {
      if (stopped || paths.length === 0) return
      revision++
      if (
        paths.some((path) => {
          const absolute = root ? posix.resolve(root, path) : path
          return (
            commands.has(absolute) ||
            testRoots?.some(
              (input) => input === '/' || absolute === input || absolute.startsWith(input + '/'),
            )
          )
        })
      ) {
        failedRecords.clear()
        serialGroups.clear()
      }
      for (const path of paths) revisionSources.add(path)
      outcomes.clear()
      // A checkpoint answers for the current source, so a write interrupts it and its partial
      // result is discarded.
      if (checking) cancellation?.abort()
    },
    check,
    failingSpecs: () => [...failing],
    revision: () => revision,
    record(results, at) {
      // Host failures seed the known failures that the next known-failures checkpoint re-runs.
      if (stopped || at !== revision) return
      for (const result of results) {
        if (result.status !== 'failed' && !settledClean(result)) continue
        learnGroups(result.spec, result)
        if (!result.selection) outcomes.set(result.spec, { ...result, revision })
        else outcomes.delete(result.spec)
        if (result.selection) {
          rememberSelection(result.spec, result)
          if (result.status === 'failed' && !result.lastRun) {
            failing.add(result.spec)
            failedRecords.delete(result.spec)
          }
        } else if (result.status === 'failed') {
          failing.add(result.spec)
          remember(result.spec, result)
        } else {
          failing.delete(result.spec)
          failedRecords.delete(result.spec)
        }
      }
    },
    async close() {
      stopped = true
      cancellation?.abort()
      if (checking) await checking
    },
  }
}

/**
 * Read explicit source roots and supplied helper/spec paths in one backend round trip.
 * The standard filesystem and TypeScript parser own traversal/syntax; this is transport batching.
 * @param backend - Local or sandbox execution backend.
 * @param sourceRoots - App source directories, absolute.
 * @param suiteFiles - Supplied spec/helper paths, absolute.
 * @returns Existing, bounded text sources. Missing/unsupported files are ignored.
 */
export async function readFeedbackSources(
  backend: ExecutionBackend,
  sourceRoots: readonly string[],
  suiteFiles: readonly string[],
): Promise<FeedbackSource[]> {
  if (sourceRoots.length === 0 && suiteFiles.length === 0) return []
  const program = `const fs=require('node:fs'),p=require('node:path');const seen=new Set(),out=[];let bytes=0;
const read=f=>{if(seen.has(f)||out.length>=1000||bytes>=4000000)return;seen.add(f);try{const s=fs.lstatSync(f);if(s.isSymbolicLink())return;if(s.isDirectory()){for(const n of fs.readdirSync(f))if(!['node_modules','.git','dist','build'].includes(n))read(p.join(f,n));}else if(/\\.[cm]?[jt]sx?$/.test(f)&&s.size<=250000){const content=fs.readFileSync(f,'utf8');bytes+=content.length;out.push({path:f,content});}}catch{}};
for(const f of ${JSON.stringify([...sourceRoots, ...suiteFiles])})read(f);process.stdout.write(JSON.stringify(out));`
  const result = await backend.run(`node -e ${shellQuote(program)}`, { timeout: 10_000 })
  if (result.exitCode !== 0) return []
  try {
    const value: unknown = JSON.parse(result.stdout)
    return Array.isArray(value)
      ? value.filter(
          (f): f is FeedbackSource =>
            f && typeof f.path === 'string' && typeof f.content === 'string',
        )
      : []
  } catch (_error) {
    return []
  }
}

/**
 * Run ONE spec's native command. Callers supply the correctly configured local command and
 * append these runner flags at composition time (rather than modifying shell text here).
 * Native failures are diagnosis, never proof that a complete supplied suite passed.
 * @param backend - Existing execution backend.
 * @param spec - The project spec and its normal per-file command.
 * @param sourceFiles - Triggering component files, known to the write/index.
 * @param revision - Source revision the scheduler will validate before delivery.
 * @param options - Output location, command composition and a bounded backend budget.
 * @returns The actual native outcome and actionable failures only.
 */
export async function runPlaywrightFeedback(
  backend: ExecutionBackend,
  spec: FeedbackSpec,
  sourceFiles: string[],
  revision: number,
  options: {
    command: (flags: string[]) => string
    scratchRoot?: string
    timeoutMs?: number
    emit?: (result: PlaywrightFeedbackResult) => void
    pollMs?: number
    signal?: AbortSignal
    /** Explicit verification keeps the process slot instead of yielding to its own caller. */
    foreground?: boolean
    /**
     * An earlier failed run's record ({@link PlaywrightFeedbackResult.lastRun}): run only the
     * tests it names, with Playwright's own `--last-failed`.
     */
    lastFailed?: string
  },
): Promise<PlaywrightFeedbackResult> {
  const started = Date.now()
  const dir = posix.join(
    options.scratchRoot ??
      posix.join(backend.hostFs ? tmpdir() : '/tmp', 'molecule-playwright-feedback'),
    randomUUID(),
  )
  const reportPath = posix.join(dir, 'report.json')
  const reporterPath = posix.join(dir, 'feedback-reporter.cjs')
  const eventsPath = posix.join(dir, 'failures.jsonl')
  // Playwright reads and rewrites this record itself (PLAYWRIGHT_LAST_RUN_OUTPUT_FILE, 1.62+).
  const lastRunPath = posix.join(dir, 'last-run.json')
  const known = options.lastFailed === undefined ? undefined : lastRunRecord(options.lastFailed)
  const timeout = options.timeoutMs ?? 120_000
  const base = {
    spec: spec.path,
    revision,
    failures: [] as PlaywrightFeedbackFailure[],
    ...(known ? { selection: 'last-failed' as const } : {}),
  }
  const unavailable = (reason: string): PlaywrightFeedbackResult => ({
    ...base,
    status: 'unavailable',
    durationMs: Date.now() - started,
    reason,
  })
  const native = options.command([
    `--reporter=${shellQuote(reporterPath + ',json')}`,
    '--workers=1',
    '--retries=0',
    `--global-timeout=${timeout}`,
    `--output=${shellQuote(posix.join(dir, 'results'))}`,
    // An explicit whole-file run answers at its first failure. A re-run of recorded failures is
    // already bounded by its record, so every recorded test answers in one run.
    ...(options.foreground && !known ? ['--max-failures=1'] : []),
    ...(known ? ['--last-failed'] : []),
  ])
  // The standard OS priority keeps background diagnosis behind the dev server
  // and builds when they share one CPU. Playwright owns its global deadline.
  const command = `export MOL_TEST_INTERNAL=1 PLAYWRIGHT_JSON_OUTPUT_FILE=${shellQuote(reportPath)} PLAYWRIGHT_LAST_RUN_OUTPUT_FILE=${shellQuote(lastRunPath)} MOL_TEST_FEEDBACK_EVENTS=${shellQuote(eventsPath)}; node ${shellQuote(posix.join(dir, 'run.cjs'))}`
  let cancelling: Promise<void> | undefined
  const cancel = (): void => {
    // Best-effort stop signal: if it cannot be written there is no other
    // lever — the run's own global timeout bounds it.
    cancelling ??= backend.writeFile(posix.join(dir, 'stop'), '').catch((_error) => undefined)
  }
  let yieldReason: string | undefined
  const cancelled = (): PlaywrightFeedbackResult => ({
    ...base,
    status: 'cancelled',
    durationMs: Date.now() - started,
    ...(options.signal?.aborted
      ? { reason: 'cancelled by host' }
      : yieldReason
        ? { reason: yieldReason }
        : {}),
  })
  let poll: ReturnType<typeof setTimeout> | undefined,
    reading: Promise<void> | undefined,
    done = false
  const emitted = new Set<string>()
  const nativeFailures = new Map<string, PlaywrightFeedbackFailure>()
  const failedIds = new Set<string>()
  const passedIds = new Set<string>()
  let selectedIds: string[] | undefined
  let dispatchedAt = 0
  const testResults = new Map<string, NonNullable<PlaywrightFeedbackResult['tests']>[number]>()
  let serial: string[][] = []
  const readEvents = async (): Promise<void> => {
    try {
      const text = await backend.readFile(eventsPath)
      const ended = nativeTestOutcomes(text)
      const freshTests: NonNullable<PlaywrightFeedbackResult['tests']> = []
      for (const test of ended.tests) {
        const outcome = {
          id: test.id,
          status: test.status,
          startedAfter: dispatchedAt + test.startedAfterMs,
        }
        if (!testResults.has(test.id)) freshTests.push(outcome)
        testResults.set(test.id, outcome)
      }
      for (const id of ended.failed) failedIds.add(id)
      for (const id of ended.passed) passedIds.add(id)
      if (ended.selected) {
        selectedIds = ended.selected
        serial = ended.serial
      }
      for (const failure of nativeFeedbackFailures(text, sourceFiles)) {
        const identity = JSON.stringify(failure)
        nativeFailures.set(identity, failure)
        if (emitted.has(identity)) continue
        emitted.add(identity)
        if (options.signal?.aborted) continue
        options.emit?.({
          ...base,
          failures: [failure],
          tests: freshTests,
          ...(selectedIds ? { selectedTests: selectedIds } : {}),
          status: 'failed',
          durationMs: Date.now() - started,
        })
      }
    } catch (_error) {
      /* the first failure has not arrived yet */
    }
  }
  // Serial groups this run selected, and a record naming whole groups (see playwright-feedback-records).
  const groups = (): Partial<PlaywrightFeedbackResult> => ({
    ...(serial.length ? { serialGroups: serial.map((group) => [...group]) } : {}),
    tests: [...testResults.values()],
    ...(selectedIds ? { selectedTests: selectedIds } : {}),
  })
  const grouped = (ids: readonly string[]): string | undefined =>
    failedTestsRecord(withSerialGroups(ids, serial))
  // A run stopped before it finished (cancelled, or yielded to the sandbox's own foreground
  // work) writes no last-run record. Its reporter already named each failed test, so the result
  // carries a record of exactly those, in the runner's own shape, and the ids of the tests it saw
  // pass.
  const stoppedEarly = async (): Promise<PlaywrightFeedbackResult> => {
    done = true
    if (poll) clearTimeout(poll)
    if (reading) await reading
    await readEvents()
    const record = grouped([...failedIds])
    return {
      ...cancelled(),
      ...(record ? { lastRun: record } : {}),
      ...(passedIds.size ? { passedTests: [...passedIds] } : {}),
      ...groups(),
    }
  }
  const tick = (): void => {
    if (done) return
    reading = readEvents().finally(() => {
      if (!done) {
        poll = setTimeout(tick, options.pollMs ?? 1000)
        poll.unref?.()
      }
    })
  }
  try {
    if (options.signal?.aborted) return cancelled()
    await backend.run(
      `node -e ${shellQuote(`require('node:fs').mkdirSync(${JSON.stringify(dir)},{recursive:true,mode:0o700})`)}`,
      { timeout: 5_000 },
    )
    await backend.writeFile(reporterPath, feedbackReporterSource())
    if (known) await backend.writeFile(lastRunPath, known)
    await backend.writeFile(
      posix.join(dir, 'run.cjs'),
      feedbackProcessSource({
        command: native,
        cwd: spec.cwd,
        root: backend.projectRoot,
        directory: dir,
        foreground: options.foreground,
      }),
    )
    options.signal?.addEventListener('abort', cancel, { once: true })
    if (options.signal?.aborted) cancel()
    if (cancelling) {
      await cancelling
      return cancelled()
    }
    if (options.emit) tick()
    dispatchedAt = performance.now()
    const result = await backend.run(command, {
      cwd: spec.cwd,
      timeout: timeout + 10_000,
      budgetMs: timeout + 5_000,
    })
    if (options.signal?.aborted) return await stoppedEarly()
    let preempted = false
    try {
      preempted = (await backend.readFile(posix.join(dir, 'yielded'))) === 'foreground'
    } catch (_error1) {
      /* the native run was not preempted */
    }
    if (preempted) {
      try {
        const reason = JSON.parse(await backend.readFile(posix.join(dir, 'yield-reason.json'))) as {
          pid?: unknown
          kind?: unknown
        }
        if (typeof reason.pid === 'number' && typeof reason.kind === 'string')
          yieldReason = `yielded to ${reason.kind} (pid ${reason.pid})`
      } catch (_error) {
        // Older supervisors wrote only the yield marker; the reason remains unknown.
      }
      return await stoppedEarly()
    }
    done = true
    if (poll) clearTimeout(poll)
    if (reading) await reading
    await readEvents()
    let lastRun: string | undefined
    try {
      lastRun = grouped(recordedTestIds(await backend.readFile(lastRunPath)))
    } catch (_error) {
      // An older runner writes no record here; the next checkpoint runs the whole file.
      lastRun = undefined
    }
    // A selective run also names what it passed, so a known failure stays each test's latest outcome.
    const record = {
      ...(lastRun ? { lastRun } : {}),
      ...(known && passedIds.size ? { passedTests: [...passedIds] } : {}),
      ...groups(),
    }
    let reportText: string
    try {
      reportText = await backend.readFile(reportPath)
    } catch (_error) {
      if (nativeFailures.size)
        return {
          ...base,
          ...record,
          failures: [...nativeFailures.values()],
          status: 'failed',
          durationMs: Date.now() - started,
        }
      return unavailable(
        `the native runner produced no JSON report: ${redactSecrets((result.stderr || result.stdout).trim().slice(0, 2000))}`,
      )
    }
    const report = summarizePlaywrightReport(reportText, {
      path: reportPath,
      sanitize: redactSecrets,
    })
    // Native failures remain actionable when fail-fast leaves later tests unrun,
    // or the suite intentionally skips tests. Neither case erases a real failure.
    base.failures = [...nativeFailures.values()]
    if (base.failures.length)
      return {
        ...base,
        ...record,
        ...(report.stats ? { nativeStats: report.stats } : {}),
        status: 'failed',
        durationMs: Date.now() - started,
      }
    const stats = report.stats
    // Every selected test skipped itself (a spec's own `test.skip(condition)`, e.g. tests for
    // another mode) and the runner exited cleanly: nothing to verify here, and no outage either.
    if (
      report.status === 'complete' &&
      stats &&
      result.exitCode === 0 &&
      stats.expected + stats.unexpected + stats.flaky === 0 &&
      stats.skipped > 0
    )
      return {
        ...base,
        ...record,
        nativeStats: stats,
        status: 'skipped',
        durationMs: Date.now() - started,
        reason: `every selected test skipped itself (${stats.skipped} skipped)`,
      }
    if (
      report.status !== 'complete' ||
      !stats ||
      stats.expected + stats.unexpected + stats.flaky === 0
    ) {
      let errors: Array<{ message?: string }> = []
      try {
        errors = (JSON.parse(reportText) as { errors?: typeof errors }).errors ?? []
      } catch (_error) {
        /* the native summary already records malformed JSON */
      }
      const detail =
        errors.map((e) => e.message ?? '').join('\n') ||
        report.reason ||
        runnerOutput(result.stderr) ||
        (stats
          ? `the runner executed no test (${stats.skipped} skipped, exit code ${result.exitCode})`
          : 'zero executed tests')
      return {
        ...unavailable(
          `the native runner did not complete every selected test: ${redactSecrets(detail.slice(0, 2000))}`,
        ),
        ...(stats ? { nativeStats: stats } : {}),
      }
    }
    if (result.exitCode !== 0 || stats.unexpected || stats.flaky)
      return unavailable('the native run failed outside a locator assertion')
    return {
      ...base,
      ...record,
      nativeStats: stats,
      status: 'passed',
      durationMs: Date.now() - started,
    }
  } finally {
    done = true
    options.signal?.removeEventListener('abort', cancel)
    if (cancelling) await cancelling
    if (poll) clearTimeout(poll)
    if (reading) await reading
    // Only this run's private generated files; the supplied suite and its outputs stay untouched.
    // Cleanup is best-effort: a failed rm leaves scratch behind but nothing
    // else in this run depends on its outcome.
    await backend
      .run(
        `node -e ${shellQuote(`require('node:fs').rmSync(${JSON.stringify(dir)},{recursive:true,force:true})`)}`,
        { timeout: 5_000 },
      )
      .catch((_error) => undefined)
  }
}
