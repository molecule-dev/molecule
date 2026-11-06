/**
 * Run the project's real Playwright files while an agent keeps writing.
 *
 * The native runner, JSON reporter and error-context snapshot already answer what
 * failed and what rendered. The small scheduler only coalesces writes, prioritizes
 * route-related spec files, runs one at a time, and discards stale revisions.
 * No correctness inference, foreground barrier, extra browser or passing-run note.
 * @module
 */
import { randomUUID } from 'node:crypto'
import { posix } from 'node:path'

import { feedbackReporterSource, nativeFeedbackFailures } from './playwright-feedback-reporter.js'
import { selectFeedbackSpecs } from './playwright-feedback-selection.js'
import type {
  FeedbackProject,
  FeedbackSource,
  FeedbackSpec,
  PlaywrightFeedback,
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
 * Subscribe to writes without making them wait for browser work.
 * @param options - Source loader, native runner and delivery callbacks.
 * @returns A source-change subscription; settle/close are for tests and shutdown only.
 */
export function createPlaywrightFeedback(options: PlaywrightFeedbackOptions): PlaywrightFeedback {
  let revision = 0,
    timer: ReturnType<typeof setTimeout> | undefined,
    active: Promise<void> | undefined
  let stopped = false
  const changed = new Set<string>(),
    waiting: PlaywrightFeedbackResult[] = []
  const delivered = new Map<string, Set<string>>()
  const failing = new Set<string>()
  const start = (): void => {
    if (active || stopped || changed.size === 0) return
    const version = revision,
      paths = [...changed]
    changed.clear()
    active = (async () => {
      let project: FeedbackProject
      try {
        project = await options.load()
      } catch (_error) {
        return
      }
      if (stopped || version !== revision) return
      const sourcePaths = project.root ? paths.map((p) => posix.resolve(project.root!, p)) : paths
      // The native failures already name the files to rerun first after an edit.
      const selected = selectFeedbackSpecs(project, sourcePaths).sort(
        (a, b) => Number(failing.has(b.spec.path)) - Number(failing.has(a.spec.path)),
      )
      for (const { spec, sourceFiles } of selected) {
        if (stopped || version !== revision) break
        const emit = (result: PlaywrightFeedbackResult): void => {
          if (stopped || version !== revision || result.status !== 'failed') return
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
          result = await options.run(spec, sourceFiles, version, emit)
        } catch (_error) {
          continue
        } // runner availability is not a markup defect
        if (stopped || version !== revision) break
        options.onResult?.(result)
        if (result.status === 'passed') failing.delete(spec.path)
        if (result.status !== 'failed') delivered.delete(spec.path)
        emit(result)
      }
    })().finally(() => {
      active = undefined
      if (!stopped && changed.size && !timer) schedule()
    })
  }
  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      start()
    }, options.debounceMs ?? 250)
    timer.unref?.()
  }
  const settled = async (): Promise<void> => {
    while (timer || active || (!stopped && changed.size)) {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
        start()
      }
      if (active) await active
      else if (!stopped && changed.size) start()
    }
  }
  return {
    changed(paths) {
      if (stopped || paths.length === 0) return
      revision++
      for (const path of paths) changed.add(path)
      waiting.length = 0
      // A queued diagnosis can be invalidated before its host delivers it. A
      // new revision must be allowed to report the same still-failing locator.
      delivered.clear()
      schedule()
    },
    takeFailures() {
      return waiting.splice(0).filter((r) => r.revision === revision)
    },
    settled,
    async close() {
      stopped = true
      if (timer) clearTimeout(timer)
      timer = undefined
      changed.clear()
      waiting.length = 0
      if (active) await active
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
 * @param spec - The supplied spec and its normal per-file command.
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
  },
): Promise<PlaywrightFeedbackResult> {
  const started = Date.now()
  const dir = posix.join(
    options.scratchRoot ?? posix.join(backend.projectRoot, '.mol', 'test-feedback'),
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
  ])
  // The standard OS priority keeps background diagnosis behind the dev server
  // and builds when they share one CPU. Playwright owns its global deadline.
  const command = `export PLAYWRIGHT_JSON_OUTPUT_FILE=${shellQuote(reportPath)} MOL_TEST_FEEDBACK_EVENTS=${shellQuote(eventsPath)}; nice -n 10 sh -c ${shellQuote(native)}`
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
    await backend.writeFile(reporterPath, feedbackReporterSource())
    if (options.emit) tick()
    const result = await backend.run(command, {
      cwd: spec.cwd,
      timeout: timeout + 10_000,
      budgetMs: timeout + 5_000,
    })
    done = true
    if (poll) clearTimeout(poll)
    if (reading) await reading
    await readEvents()
    let reportText: string
    try {
      reportText = await backend.readFile(reportPath)
    } catch (_error) {
      return unavailable(
        `the native runner produced no JSON report: ${redactSecrets((result.stderr || result.stdout).trim().slice(0, 2000))}`,
      )
    }
    const report = summarizePlaywrightReport(reportText, {
      path: reportPath,
      sanitize: redactSecrets,
    })
    if (
      report.status !== 'complete' ||
      !report.stats ||
      report.stats.expected + report.stats.unexpected + report.stats.flaky === 0 ||
      report.stats.skipped > 0
    ) {
      let errors: Array<{ message?: string }> = []
      try {
        errors = (JSON.parse(reportText) as { errors?: typeof errors }).errors ?? []
      } catch (_error) {
        /* the native summary already records malformed JSON */
      }
      const detail =
        errors.map((e) => e.message ?? '').join('\n') ||
        result.stderr ||
        report.reason ||
        'zero executed tests or skipped tests'
      return {
        ...unavailable(
          `the native runner did not complete every selected test: ${redactSecrets(detail.slice(0, 2000))}`,
        ),
        ...(report.stats ? { nativeStats: report.stats } : {}),
      }
    }
    base.failures = [...nativeFailures.values()]
    if (base.failures.length)
      return {
        ...base,
        nativeStats: report.stats,
        status: 'failed',
        durationMs: Date.now() - started,
      }
    if (result.exitCode !== 0 || report.stats.unexpected || report.stats.flaky)
      return unavailable('the native run failed outside a locator assertion')
    return {
      ...base,
      nativeStats: report.stats,
      status: 'passed',
      durationMs: Date.now() - started,
    }
  } finally {
    done = true
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
