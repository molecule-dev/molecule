/**
 * After a source write, background diagnosis re-runs the tests known to fail first, by themselves.
 *
 * The deploy's known-failure check runs exactly that selection before it lets a build publish, and
 * it blocked the deploy call for 50–140 s on a first deploy (cohorts P351–P353). The writes before
 * a deploy left a median 47 s in which background diagnosis ran, but it put a known failure LAST
 * and ran it as a whole file, so the check found nothing done. Now a pass in that window clears the
 * known failure and the check has nothing left to run; a failure answers the write at once.
 */
import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const watchers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(watchers.splice(0).map((watcher) => watcher.close())))

const A = '/shop/e2e/cart.spec.ts'
const B = '/shop/e2e/browse.spec.ts'
const record = (ids: string[]) => JSON.stringify({ status: 'failed', failedTests: ids })
const ids = (text: string | undefined) =>
  text === undefined ? undefined : (JSON.parse(text) as { failedTests: string[] }).failedTests

function outcome(
  spec: string,
  revision: number,
  status: PlaywrightFeedbackResult['status'],
  extra: Partial<PlaywrightFeedbackResult> = {},
): PlaywrightFeedbackResult {
  return {
    spec,
    revision,
    durationMs: 1,
    status,
    failures:
      status === 'failed'
        ? [{ spec, line: 9, locator: "getByRole('button')", error: 'not visible', sourceFiles: [] }]
        : [],
    ...extra,
  }
}

/**
 * B passes; A fails whole with a record naming `t1`. A record run of A answers `recheck`, and when
 * that is a pass the whole file passes from then on. The inventory lists B first, so the
 * oldest-attempt order alone would run B before A.
 */
function fixture(recheck: PlaywrightFeedbackResult['status']) {
  const onFailures = vi.fn()
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(
    async (spec, _files, revision, _emit, _signal, _mode, lastRun) => {
      if (spec.path === B) return outcome(B, revision, 'passed')
      // The write fixed `t1` exactly when its record run passes: the whole file then passes too.
      if (lastRun === undefined)
        return revision > 1 && recheck === 'passed'
          ? outcome(A, revision, 'passed')
          : outcome(A, revision, 'failed', { lastRun: record(['t1']) })
      return outcome(A, revision, recheck, {
        selection: 'last-failed',
        ...(recheck === 'failed' ? { lastRun: record(['t1']) } : {}),
      })
    },
  )
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/shop/e2e'],
      specs: [B, A].map((path) => ({ path, content: '', command: '', cwd: '/shop' })),
    }),
    run,
    onFailures,
    debounceMs: 1,
  })
  watchers.push(watcher)
  const write = async () => {
    watcher.changed(['/shop/src/Cart.tsx'])
    await watcher.settled()
  }
  return { watcher, run, onFailures, write }
}

const calls = (run: ReturnType<typeof fixture>['run']) =>
  run.mock.calls.map(([spec, , revision, , , mode, lastRun]) => ({
    spec: spec.path,
    revision,
    mode: mode ?? 'background',
    record: ids(lastRun),
  }))

it('re-runs a known failure first, by its record, and a pass leaves the deploy check nothing to run', async () => {
  const f = fixture('passed')
  await f.write()
  expect(f.watcher.failingSpecs()).toEqual([A])
  const before = f.run.mock.calls.length
  await f.write()
  const after = calls(f.run).slice(before)
  // First in the pass, ahead of B's older attempt, with only the recorded test.
  expect(after[0]).toEqual({ spec: A, revision: 2, mode: 'background', record: ['t1'] })
  expect(f.watcher.failingSpecs()).toEqual([])
  // The file's other tests still run on this source: A goes back to the inventory whole.
  expect(after.slice(1)).toContainEqual({
    spec: A,
    revision: 2,
    mode: 'background',
    record: undefined,
  })
  // The deploy's known-failure check finds nothing to re-run.
  const ran = f.run.mock.calls.length
  expect(await f.watcher.check({ failedOnly: true })).toEqual([])
  expect(f.run.mock.calls.length).toBe(ran)
})

it('delivers a still-failing known failure at once, and does not run its file whole again on that source', async () => {
  const f = fixture('failed')
  await f.write()
  f.onFailures.mockClear()
  const before = f.run.mock.calls.length
  await f.write()
  const after = calls(f.run).slice(before)
  expect(after[0]).toEqual({ spec: A, revision: 2, mode: 'background', record: ['t1'] })
  expect(after.filter((call) => call.spec === A)).toHaveLength(1)
  expect(after).toContainEqual({ spec: B, revision: 2, mode: 'background', record: undefined })
  expect(f.onFailures).toHaveBeenCalledWith(expect.objectContaining({ spec: A, revision: 2 }))
  expect(f.watcher.failingSpecs()).toEqual([A])
  // The deploy check still re-runs it: a failed outcome is never reused.
  const [held] = await f.watcher.check({ failedOnly: true })
  expect(held).toMatchObject({ spec: A, status: 'failed' })
  expect(calls(f.run).at(-1)).toEqual({ spec: A, revision: 2, mode: 'foreground', record: ['t1'] })
})

it('drops a record that selects no current test and runs the file whole', async () => {
  const f = fixture('unavailable')
  await f.write()
  const before = f.run.mock.calls.length
  await f.write()
  const after = calls(f.run).slice(before)
  expect(after[0]).toMatchObject({ spec: A, record: ['t1'] })
  expect(after.slice(1)).toContainEqual({
    spec: A,
    revision: 2,
    mode: 'background',
    record: undefined,
  })
  // The whole-file run failed again with its own record: known, and the record is current.
  expect(f.watcher.failingSpecs()).toEqual([A])
})
