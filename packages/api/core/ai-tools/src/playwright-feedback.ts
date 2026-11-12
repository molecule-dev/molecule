/**
 * Run the project's real Playwright files while an agent keeps writing.
 *
 * The native runner, JSON reporter and error-context snapshot already answer what
 * failed and what rendered. The small scheduler only coalesces writes, runs the file that ran
 * longest ago first, one at a time, lets a started file finish, keeps every finished failure
 * known, and reports only results with no write during them.
 * Explicit checkpoints finish native verification before an action; background writes stay nonblocking.
 * @module
 */
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { posix } from 'node:path'

import { feedbackProcessSource } from './playwright-feedback-process.js'
import { feedbackReporterSource, nativeFeedbackFailures } from './playwright-feedback-reporter.js'
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
  const changed = new Set<string>(),
    waiting: PlaywrightFeedbackResult[] = []
  const delivered = new Map<string, Set<string>>()
  const failing = new Set<string>()
  const completed = new Set<string>()
  const outcomes = new Map<string, PlaywrightFeedbackResult>()
  const revisionSources = new Set<string>()
  // Completion order of each spec's latest finished run, so a pass after a write starts with the
  // spec that has waited longest instead of the first file in the inventory.
  const lastRun = new Map<string, number>()
  let finishedRuns = 0
  let checking: Promise<PlaywrightFeedbackResult[]> | undefined
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
      const sourcePaths = project.root ? paths.map((p) => posix.resolve(project.root!, p)) : paths
      // The spec whose latest run finished longest ago goes first (never-run specs first, in
      // inventory order). A write mid-pass ends the pass, so under steady writes every spec still
      // gets its turn; a known failure waits its turn too, and the deploy check re-runs it anyway.
      const selected = selectFeedbackSpecs(project, sourcePaths)
        .filter(({ spec }) => !completed.has(spec.path))
        .sort((a, b) => (lastRun.get(a.spec.path) ?? -1) - (lastRun.get(b.spec.path) ?? -1))
      for (const { spec, sourceFiles } of selected) {
        if (!current()) break
        const emit = (result: PlaywrightFeedbackResult): void => {
          if (!current() || result.status !== 'failed') return
          failing.add(spec.path)
          const identities = delivered.get(spec.path) ?? new Set<string>()
          const failures = result.failures.filter((f) => {
            const identity = JSON.stringify(f)
            if (identities.has(identity)) return false
            identities.add(identity)
            return true
          })
          delivered.set(spec.path, identities)
          if (!failures.length) return
          const fresh = { ...result, failures }
          waiting.push(fresh)
          options.onFailures?.(fresh)
        }
        let result: PlaywrightFeedbackResult
        try {
          running = options.run(spec, sourceFiles, version, emit, abort.signal)
          result = await running
        } catch (_error) {
          continue
        } finally {
          running = undefined
        } // runner availability is not a markup defect
        options.onResult?.(live() ? result : { ...result, status: 'cancelled', failures: [] })
        if (!live()) break
        if (result.status === 'cancelled') {
          yielded = true
          for (const path of paths) changed.add(path)
          break
        }
        // A finished run is that spec's latest native outcome even when a write landed while it
        // ran: a failure stays known (the deploy check re-runs it on current source), a pass or
        // self-skip clears it. Only a run with no write during it is reused or reported.
        lastRun.set(spec.path, ++finishedRuns)
        if (settledClean(result)) failing.delete(spec.path)
        else if (result.status === 'failed') failing.add(spec.path)
        if (!current()) break
        completed.add(spec.path)
        outcomes.set(spec.path, result)
        if (result.status !== 'failed') delivered.delete(spec.path)
        emit(result)
      }
    })().finally(() => {
      active = undefined
      cancellation = undefined
      if (abort.signal.aborted && !stopped) for (const path of paths) changed.add(path)
      if (!stopped && !paused && changed.size && !timer) schedule(yielded ? 1000 : undefined)
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
    // Metadata loads do not delay ordinary foreground tools.
    await running?.catch(() => undefined)
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
        const paths = [...revisionSources].map((p) =>
          project.root ? posix.resolve(project.root, p) : p,
        )
        const selected = selectFeedbackSpecs(project, paths)
          .filter(({ spec }) => !checkOptions.failedOnly || failing.has(spec.path))
          .sort((a, b) => Number(failing.has(b.spec.path)) - Number(failing.has(a.spec.path)))
        for (const { spec, sourceFiles } of selected) {
          if (stopped || abort.signal.aborted || version !== revision) break
          let result = outcomes.get(spec.path)
          // Reuse passes and self-skipped specs only. A restart, fixture repair or
          // transient failure can change a failed outcome without changing application source.
          if (!result || !settledClean(result)) {
            running = options.run(spec, sourceFiles, version, () => {}, abort.signal, 'foreground')
            result = await running
            running = undefined
            if (stopped || abort.signal.aborted || version !== revision) break
            options.onResult?.(result)
            outcomes.set(spec.path, result)
          }
          results.push(result)
          if (result.status === 'failed') failing.add(spec.path)
          if (!settledClean(result)) break
          completed.add(spec.path)
          failing.delete(spec.path)
        }
        if (stopped || abort.signal.aborted || version !== revision) return []
        changed.clear()
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
  const timeout = options.timeoutMs ?? 120_000
  const base = { spec: spec.path, revision, failures: [] as PlaywrightFeedbackFailure[] }
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
    ...(options.foreground ? ['--max-failures=1'] : []),
  ])
  // The standard OS priority keeps background diagnosis behind the dev server
  // and builds when they share one CPU. Playwright owns its global deadline.
  const command = `export MOL_TEST_INTERNAL=1 PLAYWRIGHT_JSON_OUTPUT_FILE=${shellQuote(reportPath)} MOL_TEST_FEEDBACK_EVENTS=${shellQuote(eventsPath)}; node ${shellQuote(posix.join(dir, 'run.cjs'))}`
  let cancelling: Promise<void> | undefined
  const cancel = (): void => {
    cancelling ??= backend.writeFile(posix.join(dir, 'stop'), '').catch(() => undefined)
  }
  const cancelled = (): PlaywrightFeedbackResult => ({
    ...base,
    status: 'cancelled',
    durationMs: Date.now() - started,
  })
  let poll: ReturnType<typeof setTimeout> | undefined,
    reading: Promise<void> | undefined,
    done = false
  const emitted = new Set<string>()
  const nativeFailures = new Map<string, PlaywrightFeedbackFailure>()
  const readEvents = async (): Promise<void> => {
    try {
      const text = await backend.readFile(eventsPath)
      for (const failure of nativeFeedbackFailures(text, sourceFiles)) {
        const identity = JSON.stringify(failure)
        nativeFailures.set(identity, failure)
        if (emitted.has(identity)) continue
        emitted.add(identity)
        if (options.signal?.aborted) continue
        options.emit?.({
          ...base,
          failures: [failure],
          status: 'failed',
          durationMs: Date.now() - started,
        })
      }
    } catch (_error) {
      /* the first failure has not arrived yet */
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
    const result = await backend.run(command, {
      cwd: spec.cwd,
      timeout: timeout + 10_000,
      budgetMs: timeout + 5_000,
    })
    if (options.signal?.aborted) return cancelled()
    try {
      if ((await backend.readFile(posix.join(dir, 'yielded'))) === 'foreground') return cancelled()
    } catch (_error1) {
      /* the native run was not preempted */
    }
    done = true
    if (poll) clearTimeout(poll)
    if (reading) await reading
    await readEvents()
    let reportText: string
    try {
      reportText = await backend.readFile(reportPath)
    } catch (_error) {
      if (nativeFailures.size)
        return {
          ...base,
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
    await backend
      .run(
        `node -e ${shellQuote(`require('node:fs').rmSync(${JSON.stringify(dir)},{recursive:true,force:true})`)}`,
        { timeout: 5_000 },
      )
      .catch(() => undefined)
  }
}
