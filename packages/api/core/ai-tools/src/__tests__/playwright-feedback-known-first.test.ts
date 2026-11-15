/**
 * A checkpoint re-runs the tests known to fail first, by themselves.
 *
 * The deploy's known-failure check runs exactly that selection before it lets a build publish, and
 * it blocked the deploy call for 50–140 s on a first deploy (cohorts P351–P353). Before that, a
 * known failure could sit unverified through the whole window before a deploy; now the checkpoint
 * in that window re-runs it by its record, so a pass clears the known failure and the deploy's
 * check has nothing left to run; a failure answers the write at once.
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
 * inventory order alone would run B before A.
 */
function fixture(recheck: PlaywrightFeedbackResult['status']) {
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(
    async (spec, _files, revision, _emit, _signal, lastRun) => {
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
  })
  watcher.record([outcome(A, 0, 'failed')], 0)
  watchers.push(watcher)
  return { watcher, run }
}

const calls = (run: ReturnType<typeof fixture>['run']) =>
  run.mock.calls.map(([spec, , revision, , , lastRun]) => ({
    spec: spec.path,
    revision,
    record: ids(lastRun),
  }))

it('a full checkpoint puts the file known to fail ahead of the unvisited one', async () => {
  const f = fixture('passed')
  f.watcher.changed(['/shop/src/Cart.tsx'])
  // A fails whole and stays known-failing; B has never run.
  expect((await f.watcher.check({ failedOnly: true })).map((r) => r.spec)).toEqual([A])
  const before = f.run.mock.calls.length
  f.watcher.changed(['/shop/src/Cart.tsx'])
  expect((await f.watcher.check()).map((r) => r.spec)).toEqual([A, B])
  expect(
    calls(f.run)
      .slice(before)
      .map((call) => call.spec),
  ).toEqual([A, B])
})

it('re-runs a known failure by its record, and a pass leaves the deploy check nothing to run', async () => {
  const f = fixture('passed')
  f.watcher.changed(['/shop/src/Cart.tsx'])
  expect((await f.watcher.check({ failedOnly: true })).map((r) => r.spec)).toEqual([A])
  expect(f.watcher.failingSpecs()).toEqual([A])
  const before = f.run.mock.calls.length
  f.watcher.changed(['/shop/src/Cart.tsx'])
  expect((await f.watcher.check({ failedOnly: true })).map((r) => [r.spec, r.status])).toEqual([
    [A, 'passed'],
  ])
  // Only the known failure ran, with only the recorded test — never the whole file, never B.
  expect(calls(f.run).slice(before)).toEqual([{ spec: A, revision: 2, record: ['t1'] }])
  expect(f.watcher.failingSpecs()).toEqual([])
  // The deploy's known-failure check finds nothing to re-run.
  const ran = f.run.mock.calls.length
  expect(await f.watcher.check({ failedOnly: true })).toEqual([])
  expect(f.run.mock.calls.length).toBe(ran)
})

it('answers a still-failing known failure with its record alone, and the deploy check re-runs it', async () => {
  const f = fixture('failed')
  f.watcher.changed(['/shop/src/Cart.tsx'])
  await f.watcher.check({ failedOnly: true })
  const before = f.run.mock.calls.length
  f.watcher.changed(['/shop/src/Cart.tsx'])
  const held = await f.watcher.check({ failedOnly: true })
  const after = calls(f.run).slice(before)
  expect(after).toEqual([{ spec: A, revision: 2, record: ['t1'] }])
  expect(held[0]).toMatchObject({ spec: A, status: 'failed' })
  expect(f.watcher.failingSpecs()).toEqual([A])
  // The deploy check still re-runs it by its record: a failed outcome is never reused.
  const [again] = await f.watcher.check({ failedOnly: true })
  expect(again).toMatchObject({ spec: A, status: 'failed' })
  expect(calls(f.run).at(-1)).toEqual({ spec: A, revision: 2, record: ['t1'] })
})

it('keeps an unavailable repair for the explicit checkpoint to verify', async () => {
  const f = fixture('unavailable')
  f.watcher.changed(['/shop/src/Cart.tsx'])
  await f.watcher.check({ failedOnly: true })
  const before = f.run.mock.calls.length
  f.watcher.changed(['/shop/src/Cart.tsx'])
  const checked = await f.watcher.check({ failedOnly: true })
  // The record run answered unavailable, so the record is dropped and the whole file verifies.
  expect(
    calls(f.run)
      .slice(before)
      .map((call) => call.record),
  ).toEqual([['t1'], undefined])
  expect(checked.map((r) => r.status)).toEqual(['failed'])
  // The whole-file run failed again with its own record: known, and the record is current.
  expect(f.watcher.failingSpecs()).toEqual([A])
})
