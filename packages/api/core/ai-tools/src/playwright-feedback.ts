/**
 * Run the project's real Playwright files while an agent keeps writing.
 *
 * The native runner, JSON reporter and error-context snapshot already answer what
 * failed and what rendered. The small scheduler only coalesces writes, runs the least recently
 * attempted file first, one at a time, lets a started file finish, resumes a file stopped by
 * foreground work at the tests it never finished, keeps every failure it saw known (by test id,
 * even from a run stopped early, with whole serial groups), and reports only results with no
 * write during them.
 * Explicit checkpoints finish native verification before an action; background writes stay nonblocking.
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
 * The last run of a resumed file, as the file's outcome: with the runs before it on the same
 * revision, it ran every test of the file.
 * @param result - A finished run that selected the tests its file's stopped runs left.
 * @returns The same outcome without the partial selection.
 */
function wholeFile(result: PlaywrightFeedbackResult): PlaywrightFeedbackResult {
  const { selection: _partial, ...outcome } = result
  return outcome
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
  return distinct.length
    ? JSON.stringify({ status: 'failed', failedTests: distinct.slice(0, 1000) })
    : undefined
}

/**
 * Subscribe to writes without making them wait for browser work.
 * @param options - Source loader, native runner and delivery callbacks.
 * @returns Nonblocking writes, cancellation and an explicit current-revision native checkpoint.
 */
export function createPlaywrightFeedback(options: PlaywrightFeedbackOptions): PlaywrightFeedback {
  let revision = 0,
    timer: ReturnType<typeof setTimeout> | undefined,
    active: Promise<void> | undefined
  let running: Promise<PlaywrightFeedbackResult> | undefined
  let cancellation: AbortController | undefined
  let paused = 0
  let stopped = false
  let lastWriteAt = -Infinity
  let selectionRevision = 0
  let root: string | undefined
  let testRoots: string[] | undefined
  const testIsCurrent = (result: PlaywrightFeedbackResult, startedAfter: number): boolean =>
    result.revision >= selectionRevision &&
    (result.revision === revision || startedAfter > lastWriteAt)
  const coverage = new Map<string, Map<string, { revision: number; status: string }>>()
  const inventories = new Map<string, string[]>()
  const commands = new Map<string, string>()
  const changed = new Set<string>(),
    waiting: PlaywrightFeedbackResult[] = []
  const delivered = new Map<string, Set<string>>()
  const failing = new Set<string>()
  const completed = new Set<string>()
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
  // A stopped background file resumes where it stopped: the next run of it selects only the tests
  // it never finished, until one run of it finishes. `version` is the revision the first of those
  // runs started on; only runs that all started on one revision stand for the whole file.
  const resumes = new Map<string, { record: string; version: number }>()
  const remember = (path: string, result: PlaywrightFeedbackResult): void => {
    const record = result.lastRun ? grouped(path, recordedTestIds(result.lastRun)) : undefined
    if (record) failedRecords.set(path, record)
    else failedRecords.delete(path)
  }
  // A run stopped before it finished reports only the tests it reached. A known failure is a test
  // whose latest run failed: the tests it saw fail join the record, the ones it saw pass leave it,
  // and the tests it never reached keep whatever the older record said about them.
  const rememberStopped = (path: string, result: PlaywrightFeedbackResult): void => {
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
  // The record a background pass re-runs a known failure with: only the tests its latest failed run
  // named. Undefined for a file not known to fail, known to fail with no record of which test, or
  // stopped part-way: that file resumes at the tests it never finished, and its stopped runs
  // already keep the failures they saw.
  const recheckRecord = (path: string): string | undefined =>
    failing.has(path) && !resumes.has(path) ? failedRecords.get(path) : undefined
  // A file may span many source writes. Only a test that began after the latest write can
  // answer for that source. Earlier tests are re-run by id, without repeating the later ones.
  const learnTests = (path: string, result: PlaywrightFeedbackResult): void => {
    if (result.revision < selectionRevision) return
    if (result.selectedTests && !result.selection) inventories.set(path, result.selectedTests)
    const tests = coverage.get(path) ?? new Map<string, { revision: number; status: string }>()
    for (const test of result.tests ?? [])
      if (testIsCurrent(result, test.startedAfter))
        tests.set(test.id, { revision, status: test.status })
    coverage.set(path, tests)
  }
  const pendingTests = (path: string): string[] | undefined =>
    inventories.get(path)?.filter((id) => coverage.get(path)?.get(id)?.revision !== revision)
  const revisionSources = new Set<string>()
  // Attempts determine fairness, not coverage. A foreground tool may interrupt a long file
  // every time; repeating it first on every release would starve every later file forever.
  const lastAttempt = new Map<string, number>()
  let attemptedRuns = 0
  // Runs in a row that yielded to the sandbox's own foreground work. A walk or build the host did
  // not start holds the sandbox for minutes, and each attempt costs a native start and a process
  // scan beside it; the wait before the next attempt doubles instead of repeating every second.
  let yieldsInARow = 0
  const yieldRetryMs = options.yieldRetryMs ?? 1000
  const yieldRetryDelay = (): number =>
    yieldRetryMs * 2 ** Math.min(Math.max(yieldsInARow - 1, 0), 4)
  let checking: Promise<PlaywrightFeedbackResult[]> | undefined
  const learnProject = (project: FeedbackProject): void => {
    root = project.root
    testRoots = project.testRoots?.map((input) => posix.resolve(input))
    for (const spec of project.specs) {
      const identity = JSON.stringify([spec.cwd, spec.command])
      const previous = commands.get(spec.path)
      commands.set(spec.path, identity)
      if (previous === undefined || previous === identity) continue
      inventories.delete(spec.path)
      coverage.delete(spec.path)
      resumes.delete(spec.path)
      failedRecords.delete(spec.path)
      serialGroups.delete(spec.path)
      completed.delete(spec.path)
      outcomes.delete(spec.path)
      delivered.delete(spec.path)
      for (let i = waiting.length - 1; i >= 0; i--)
        if (waiting[i].spec === spec.path) waiting.splice(i, 1)
    }
  }
  const start = (): void => {
    if (active || stopped || paused || changed.size === 0) return
    const version = revision,
      paths = [...changed]
    changed.clear()
    const abort = new AbortController()
    cancellation = abort
    let yielded = false
    // Live: not stopped by foreground work or close. Current: also no write since this pass began.
    const live = (): boolean => !stopped && !abort.signal.aborted
    const current = (): boolean => live() && version === revision
    active = (async () => {
      let project: FeedbackProject
      try {
        project = await options.load()
      } catch (_error) {
        return
      }
      if (!current()) return
      learnProject(project)
      const sourcePaths = project.root ? paths.map((p) => posix.resolve(project.root!, p)) : paths
      // An edited spec file may have other tests now: its next run is the whole file.
      for (const path of sourcePaths) {
        resumes.delete(path)
        inventories.delete(path)
        coverage.delete(path)
      }
      // A file with a known failure goes first, and runs only the tests its latest failed run
      // named: the same selection the deploy's known-failure check runs. Its pass clears the known
      // failure before a deploy asks for it, and its failure answers whether the write fixed it.
      // The rest go never-attempted first in inventory order, then the oldest attempt, so source
      // writes and foreground interruptions leave the other files their turn.
      const selected = selectFeedbackSpecs(project, sourcePaths)
        .filter(({ spec }) => !completed.has(spec.path))
        .sort(
          (a, b) =>
            Number(recheckRecord(b.spec.path) !== undefined) -
              Number(recheckRecord(a.spec.path) !== undefined) ||
            (lastAttempt.get(a.spec.path) ?? -1) - (lastAttempt.get(b.spec.path) ?? -1),
        )
      for (const { spec, sourceFiles } of selected) {
        if (!current()) break
        const emit = (result: PlaywrightFeedbackResult): void => {
          if (!live()) return
          learnTests(spec.path, result)
          if (result.status !== 'failed') return
          failing.add(spec.path)
          // A native failure stays known even after a write. Deploy may cancel this run before
          // it finishes, so remember the event now and recheck current source at its checkpoint.
          // Only a current revision may deliver the diagnostic itself.
          const freshIds = new Set(
            (result.tests ?? [])
              .filter((test) => testIsCurrent(result, test.startedAfter))
              .map((test) => test.id),
          )
          const native = current()
            ? result
            : {
                ...result,
                revision,
                failures: result.failures.filter(
                  (failure) => failure.testId && freshIds.has(failure.testId),
                ),
              }
          if (!native.failures.length) return
          const identities = delivered.get(spec.path) ?? new Set<string>()
          const failures = native.failures.filter((f) => {
            const identity = JSON.stringify(f)
            if (identities.has(identity)) return false
            identities.add(identity)
            return true
          })
          delivered.set(spec.path, identities)
          if (!failures.length) return
          const fresh = { ...native, failures }
          waiting.push(fresh)
          options.onFailures?.(fresh)
        }
        let result: PlaywrightFeedbackResult
        let combinedTests = false
        lastAttempt.set(spec.path, ++attemptedRuns)
        const known = recheckRecord(spec.path)
        const resume = known === undefined ? resumes.get(spec.path) : undefined
        try {
          // A whole-file run calls the host exactly as before; only a known failure's re-run and a
          // resumed file add a record.
          const pending = pendingTests(spec.path)
          const record =
            known ?? (pending?.length ? grouped(spec.path, pending) : undefined) ?? resume?.record
          running =
            record !== undefined
              ? options.run(
                  spec,
                  sourceFiles,
                  version,
                  emit,
                  abort.signal,
                  'background',
                  grouped(spec.path, recordedTestIds(record)),
                )
              : options.run(spec, sourceFiles, version, emit, abort.signal)
          result = await running
        } catch (_error) {
          continue
        } finally {
          running = undefined
        } // runner availability is not a markup defect
        learnGroups(spec.path, result)
        learnTests(spec.path, result)
        if (live() && result.status !== 'cancelled' && result.tests?.length) {
          emit(result)
          const pending = pendingTests(spec.path)
          if (pending === undefined && result.selection) for (const path of paths) changed.add(path)
          if (pending?.length) {
            resumes.set(spec.path, { record: grouped(spec.path, pending)!, version: revision })
            for (const path of paths) changed.add(path)
          } else if (
            pending &&
            settledClean(result) &&
            inventories.get(spec.path)?.length &&
            inventories
              .get(spec.path)!
              .every((id) => coverage.get(spec.path)?.get(id)?.status !== 'failed')
          ) {
            // Every test has a current clean outcome. Earlier failures are superseded, even if
            // this file began before the last write. Do not attach one partial run's native count
            // to the combined file outcome.
            failing.delete(spec.path)
            failedRecords.delete(spec.path)
            combinedTests = true
            const whole = { ...wholeFile(result), revision, nativeStats: undefined }
            completed.add(spec.path)
            outcomes.set(spec.path, whole)
            resumes.delete(spec.path)
          }
        }
        // A pause (a checkpoint, a deploy, the sandbox's own build) stops a started file. The
        // tests it already saw fail stay known by id, so the checkpoint re-runs those, not the file,
        // and its next background run starts at the tests it never finished.
        if (result.status === 'cancelled' && !stopped) {
          rememberStopped(spec.path, result)
          // A stopped re-run of known failures is not the file's resume point: the record it ran
          // still names what is left of them, and the file's other tests never started.
          const unfinished =
            known === undefined && result.unfinishedTests
              ? grouped(spec.path, result.unfinishedTests)
              : undefined
          if (unfinished)
            resumes.set(spec.path, { record: unfinished, version: resume?.version ?? version })
          else if (known === undefined && result.unfinishedTests) resumes.delete(spec.path)
        }
        const measured = {
          ...result,
          ...(result.tests
            ? {
                tests: result.tests.map((test) => ({
                  ...test,
                  ...(testIsCurrent(result, test.startedAfter) ? { revision } : {}),
                })),
              }
            : {}),
        }
        options.onResult?.(live() ? measured : { ...measured, status: 'cancelled', failures: [] })
        if (!live()) break
        if (result.status === 'cancelled') {
          yielded = true
          yieldsInARow++
          for (const path of paths) changed.add(path)
          break
        }
        yieldsInARow = 0
        if (known !== undefined && result.selection === 'last-failed') {
          if (result.status === 'failed') {
            // Still failing: the known failure, with this run's record, is its latest outcome.
            failing.add(spec.path)
            remember(spec.path, result)
            if (!current()) break
            completed.add(spec.path)
            emit(result)
            continue
          }
          // A pass clears the known failure as the deploy check's pass does. A record that selected
          // nothing the runner could run (a renamed or removed test) is dropped. Either way the
          // file's other tests have not run on this source: it goes back to the inventory whole.
          if (settledClean(result)) failing.delete(spec.path)
          failedRecords.delete(spec.path)
          delivered.delete(spec.path)
          for (const path of paths) changed.add(path)
          continue
        }
        // The rest of a resumed file. Its record selected nothing the runner could run (the file's
        // tests changed since it stopped): the whole file runs on the next pass.
        const resumed = resume !== undefined && result.selection === 'last-failed'
        if (resume) resumes.delete(spec.path)
        if (resumed && result.status !== 'failed' && !settledClean(result)) {
          for (const path of paths) changed.add(path)
          continue
        }
        // A finished run is that spec's latest native outcome even when a write landed while it
        // ran: a failure stays known (the deploy check re-runs it on current source), a pass or
        // self-skip clears it. Only a run with no write during it is reused or reported. A resumed
        // file's runs together are one run of it: each test's latest outcome is what they saw, and
        // they stand for the whole file only when they all started on this revision.
        if (resumed) {
          if (result.status === 'failed' && !result.lastRun) {
            failing.add(spec.path)
            failedRecords.delete(spec.path)
          } else rememberStopped(spec.path, result)
        } else if (settledClean(result)) {
          failing.delete(spec.path)
          failedRecords.delete(spec.path)
        } else if (result.status === 'failed') {
          failing.add(spec.path)
          remember(spec.path, result)
        }
        if (!current()) break
        const whole =
          !resumed ||
          result.status === 'failed' ||
          (resume.version === version && !failing.has(spec.path))
        if (whole && !combinedTests) {
          completed.add(spec.path)
          outcomes.set(spec.path, resumed && settledClean(result) ? wholeFile(result) : result)
        }
        if (result.status !== 'failed' && current()) delivered.delete(spec.path)
        emit(result)
      }
    })().finally(() => {
      active = undefined
      cancellation = undefined
      if (abort.signal.aborted && !stopped) for (const path of paths) changed.add(path)
      if (!stopped && !paused && changed.size && !timer)
        schedule(yielded ? yieldRetryDelay() : undefined)
    })
  }
  const schedule = (delay = options.debounceMs ?? 250): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      start()
    }, delay)
    timer.unref?.()
  }
  const settled = async (): Promise<void> => {
    while (timer || active || (!stopped && !paused && changed.size)) {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
        start()
      }
      if (active) await active
      else if (!stopped && !paused && changed.size) start()
    }
  }
  const pause = async (): Promise<() => void> => {
    paused++
    if (timer) clearTimeout(timer)
    timer = undefined
    cancellation?.abort()
    // Metadata loads do not delay ordinary foreground tools, and one that is
    // failing has nothing to add to the pause — its result is optional.
    await running?.catch((_error) => undefined)
    let released = false
    return () => {
      if (released) return
      released = true
      paused--
      if (!paused && !stopped && changed.size) schedule()
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
      const release = await pause()
      const version = revision
      const abort = new AbortController()
      const results: PlaywrightFeedbackResult[] = []
      try {
        // Checkpoints are explicit runner work. Finish cancelling the speculative
        // owner before taking its process slot, including an in-flight load.
        await active
        cancellation = abort
        if (stopped || version !== revision) return results
        const project = await options.load()
        learnProject(project)
        const paths = [...revisionSources].map((p) =>
          project.root ? posix.resolve(project.root, p) : p,
        )
        const selected = selectFeedbackSpecs(project, paths)
          .filter(({ spec }) => !checkOptions.failedOnly || failing.has(spec.path))
          .sort((a, b) => Number(failing.has(b.spec.path)) - Number(failing.has(a.spec.path)))
        const foreground = async (
          spec: FeedbackSpec,
          sourceFiles: string[],
          record?: string,
        ): Promise<PlaywrightFeedbackResult> => {
          // A whole-file run calls the host exactly as before; only a record adds the argument.
          running =
            record === undefined
              ? options.run(spec, sourceFiles, version, () => {}, abort.signal, 'foreground')
              : options.run(
                  spec,
                  sourceFiles,
                  version,
                  () => {},
                  abort.signal,
                  'foreground',
                  record,
                )
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
            // file's other tests stay with background diagnosis, so it is never a whole-file pass.
            const known = await foreground(spec, sourceFiles, record)
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
            lastAttempt.set(spec.path, ++attemptedRuns)
            result = await foreground(spec, sourceFiles)
            learnGroups(spec.path, result)
            // A whole-file answer: no stopped background run of the file is left to resume.
            resumes.delete(spec.path)
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
          completed.add(spec.path)
          failing.delete(spec.path)
          failedRecords.delete(spec.path)
        }
        if (stopped || abort.signal.aborted || version !== revision) return []
        // A partial checkpoint verified only known failures. Keep the pending source paths
        // so release resumes the remaining background inventory instead of losing it.
        if (!checkOptions.failedOnly) changed.clear()
        return results
      } finally {
        running = undefined
        if (cancellation === abort) cancellation = undefined
        release()
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
      lastWriteAt = performance.now()
      if (
        !testRoots ||
        paths.some((path) => {
          const absolute = root ? posix.resolve(root, path) : path
          return (
            commands.has(absolute) ||
            testRoots!.some(
              (input) => input === '/' || absolute === input || absolute.startsWith(input + '/'),
            )
          )
        })
      ) {
        selectionRevision = revision
        inventories.clear()
        coverage.clear()
        failedRecords.clear()
        serialGroups.clear()
        if (testRoots) resumes.clear()
      }
      for (const path of paths) changed.add(path)
      for (const path of paths) revisionSources.add(path)
      waiting.length = 0
      // A queued diagnosis can be invalidated before its host delivers it. A
      // new revision must be allowed to report the same still-failing locator.
      delivered.clear()
      completed.clear()
      outcomes.clear()
      // A started background spec finishes (bounded by its native deadline): writes arrive every
      // few seconds while a spec takes tens of seconds, so cancelling here meant none ever finished.
      // Its outcome updates the known failures; the next pass runs on this revision. An explicit
      // checkpoint is different: it answers for the current source, so a write still interrupts it.
      if (checking) cancellation?.abort()
      if (!paused) schedule()
    },
    takeFailures() {
      return waiting.splice(0).filter((r) => r.revision === revision)
    },
    pause,
    check,
    failingSpecs: () => [...failing],
    revision: () => revision,
    record(results, at) {
      // A host's own run is evidence for the revision it started on, never a later one.
      if (stopped || at !== revision) return
      for (const result of results) {
        if (!settledClean(result)) continue
        lastAttempt.set(result.spec, ++attemptedRuns)
        failing.delete(result.spec)
        failedRecords.delete(result.spec)
        resumes.delete(result.spec)
        completed.add(result.spec)
        outcomes.set(result.spec, { ...result, revision })
        delivered.delete(result.spec)
        // A queued diagnosis of this spec at this revision is now superseded by the pass.
        for (let i = waiting.length - 1; i >= 0; i--)
          if (waiting[i].spec === result.spec) waiting.splice(i, 1)
      }
    },
    settled,
    async close() {
      stopped = true
      cancellation?.abort()
      if (timer) clearTimeout(timer)
      timer = undefined
      changed.clear()
      waiting.length = 0
      if (active) await active
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
  const skippedIds = new Set<string>()
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
      for (const id of ended.skipped) skippedIds.add(id)
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
  // carries a record of exactly those, in the runner's own shape, the ids of the tests it saw
  // pass, and the selected tests it never finished, for the background to resume with.
  const stoppedEarly = async (): Promise<PlaywrightFeedbackResult> => {
    done = true
    if (poll) clearTimeout(poll)
    if (reading) await reading
    await readEvents()
    const record = grouped([...failedIds])
    const unfinished = selectedIds?.filter(
      (id) => !failedIds.has(id) && !passedIds.has(id) && !skippedIds.has(id),
    )
    return {
      ...cancelled(),
      ...(record ? { lastRun: record } : {}),
      ...(passedIds.size ? { passedTests: [...passedIds] } : {}),
      ...(unfinished ? { unfinishedTests: withSerialGroups(unfinished, serial) } : {}),
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
