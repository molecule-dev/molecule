import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((c) => c.close())))
const specs = ['booking', 'payment', 'unvisited'].map((name) => ({
  path: `/booking/e2e/${name}.spec.ts`,
  cwd: '/booking',
  command: `playwright test e2e/${name}.spec.ts`,
  content: '',
}))
const record = (...failedTests: string[]) => JSON.stringify({ status: 'failed', failedTests })
const result = (
  spec: string,
  revision: number,
  status: PlaywrightFeedbackResult['status'],
  extra: Partial<PlaywrightFeedbackResult> = {},
): PlaywrightFeedbackResult => ({
  spec,
  revision,
  status,
  durationMs: 1,
  failures:
    status === 'failed'
      ? [
          {
            spec,
            line: 8,
            locator: 'getByRole("status")',
            error: 'Expected Confirmed, received Pending',
            sourceFiles: [],
          },
        ]
      : [],
  ...extra,
})
function fixture(
  run = vi.fn<PlaywrightFeedbackOptions['run']>(async (spec, _, revision) =>
    result(spec.path, revision, 'failed', { lastRun: record(spec.path) }),
  ),
) {
  const load = vi.fn(async () => ({
    root: '/booking',
    testRoots: ['/booking/e2e'],
    sources: [],
    specs,
  }))
  const onFailures = vi.fn()
  const controller = createPlaywrightFeedback({ load, run, onFailures, debounceMs: 1 })
  controllers.push(controller)
  return { controller, run, load, onFailures }
}
function seed(controller: PlaywrightFeedback) {
  controller.record(
    specs
      .slice(0, 2)
      .map((s) => result(s.path, controller.revision(), 'failed', { lastRun: record(s.path) })),
    controller.revision(),
  )
}

it('a write never starts a spec whose tests have never run', async () => {
  const f = fixture()
  f.controller.changed(['/booking/src/Booking.vue'])
  await f.controller.settled()
  expect(f.run).not.toHaveBeenCalled()
  expect(f.load).not.toHaveBeenCalled()
  expect(f.controller.failingSpecs()).toEqual([])
  expect(await f.controller.check({ failedOnly: true })).toEqual([])
})

it('completed host failures seed exactly two failed-test selections on each later edit', async () => {
  const f = fixture()
  seed(f.controller)
  await f.controller.settled()
  expect(f.run).not.toHaveBeenCalled()
  for (const source of ['Booking.vue', 'Payment.vue']) {
    f.controller.changed([`/booking/src/${source}`])
    await f.controller.settled()
  }
  expect(f.run.mock.calls.map(([s]) => s.path)).toEqual([
    specs[0].path,
    specs[1].path,
    specs[0].path,
    specs[1].path,
  ])
  for (const [s, , , , , mode, lastRun] of f.run.mock.calls) {
    expect(mode).toBe('background')
    expect(JSON.parse(lastRun!)).toEqual({ status: 'failed', failedTests: [s.path] })
  }
  expect(f.onFailures).toHaveBeenCalledTimes(4)
})

it('a passing repair re-run clears the failure without walking passing or unvisited tests', async () => {
  const f = fixture(
    vi.fn(async (s, _, revision) =>
      result(s.path, revision, 'passed', { selection: 'last-failed' }),
    ),
  )
  seed(f.controller)
  f.controller.changed(['/booking/src/Booking.vue'])
  await f.controller.settled()
  expect(f.run).toHaveBeenCalledTimes(2)
  expect(f.controller.failingSpecs()).toEqual([])
  expect(await f.controller.check({ failedOnly: true })).toEqual([])
  f.controller.changed(['/booking/src/Payment.vue'])
  await f.controller.settled()
  expect(f.run).toHaveBeenCalledTimes(2)
})

it('cancelled and unavailable host runs seed nothing', async () => {
  const f = fixture()
  f.controller.record(
    ['cancelled', 'unavailable'].map((status, i) =>
      result(specs[i].path, 0, status as PlaywrightFeedbackResult['status'], {
        lastRun: record('unfinished'),
      }),
    ),
    0,
  )
  f.controller.changed(['/booking/src/Booking.vue'])
  await f.controller.settled()
  expect(f.run).not.toHaveBeenCalled()
})

it('a repair re-run retains its whole serial group', async () => {
  const f = fixture()
  f.controller.record(
    [
      result(specs[0].path, 0, 'failed', {
        lastRun: record('confirm'),
        serialGroups: [['create', 'confirm']],
      }),
    ],
    0,
  )
  f.controller.changed(['/booking/src/Booking.vue'])
  await f.controller.settled()
  expect(f.run.mock.calls[0][6]).toEqual(expect.any(String))
  expect(JSON.parse(f.run.mock.calls[0][6]!)).toEqual({
    status: 'failed',
    failedTests: ['create', 'confirm'],
  })
})

it('a stopped repair resumes its unfinished failures without starting an unvisited file', async () => {
  let first = true
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (s, _, revision, _emit, signal) => {
    if (!first) return result(s.path, revision, 'passed', { selection: 'last-failed' })
    first = false
    await new Promise<void>((resolve) =>
      signal.addEventListener('abort', () => resolve(), { once: true }),
    )
    return result(s.path, revision, 'cancelled', {
      passedTests: ['create'],
      unfinishedTests: ['confirm'],
    })
  })
  const f = fixture(run)
  f.controller.record(
    [result(specs[0].path, 0, 'failed', { lastRun: record('create', 'confirm') })],
    0,
  )
  f.controller.changed(['/booking/src/Booking.vue'])
  const settled = f.controller.settled()
  await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1))
  const release = await f.controller.pause()
  await settled
  release()
  await f.controller.settled()
  expect(run).toHaveBeenCalledTimes(2)
  expect(JSON.parse(run.mock.calls[1][6]!)).toEqual({ status: 'failed', failedTests: ['confirm'] })
  expect(f.controller.failingSpecs()).toEqual([])
})

it('an explicit whole-inventory checkpoint still runs tests that have never run', async () => {
  const f = fixture(vi.fn(async (s, _, revision) => result(s.path, revision, 'passed')))
  expect(await f.controller.check()).toHaveLength(3)
  expect(f.run).toHaveBeenCalledTimes(3)
  expect(f.run.mock.calls.every((call) => call[5] === 'foreground')).toBe(true)
})

it('a partial host pass clears only its diagnosis and cannot certify a whole-file checkpoint', async () => {
  const f = fixture(vi.fn(async (s, _, revision) => result(s.path, revision, 'passed')))
  f.controller.record([result(specs[0].path, 0, 'passed', { selection: 'last-failed' })], 0)
  expect(await f.controller.check()).toHaveLength(3)
  expect(f.run).toHaveBeenCalledTimes(3)
})

it('preserves every known failure when a completed native record exceeds 1000 tests', async () => {
  const f = fixture()
  const ids = Array.from({ length: 1001 }, (_, index) => `native-${index}`)
  f.controller.record([result(specs[0].path, 0, 'failed', { lastRun: record(...ids) })], 0)
  f.controller.changed(['/booking/src/Booking.vue'])
  await f.controller.settled()
  expect(f.run).toHaveBeenCalledOnce()
  expect(JSON.parse(f.run.mock.calls[0][6]!).failedTests).toEqual(ids)
})

it('an oversized native record keeps its failed file and uses whole-file diagnosis', async () => {
  const f = fixture()
  const ids = Array.from({ length: 3000 }, (_, index) => `native-${index}-${'x'.repeat(80)}`)
  f.controller.record([result(specs[0].path, 0, 'failed', { lastRun: record(...ids) })], 0)
  f.controller.changed(['/booking/src/Booking.vue'])
  await f.controller.settled()
  expect(f.run).toHaveBeenCalledOnce()
  expect(f.run.mock.calls[0][6]).toBeUndefined()
  expect(f.controller.failingSpecs()).toEqual([specs[0].path])
})
