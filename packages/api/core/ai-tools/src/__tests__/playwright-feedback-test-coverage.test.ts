/** Source freshness belongs to completed runs; a checkpoint never fills an unseen inventory. */
import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((c) => c.close())))
const spec = {
  path: '/inventory/e2e/stock.spec.ts',
  command: 'playwright test',
  content: '',
  cwd: '/inventory',
}
const source = '/inventory/src/Stock.tsx'
const record = (...failedTests: string[]) => JSON.stringify({ status: 'failed', failedTests })
const result = (
  revision: number,
  status: PlaywrightFeedbackResult['status'],
  extra: Partial<PlaywrightFeedbackResult> = {},
): PlaywrightFeedbackResult => ({
  spec: spec.path,
  revision,
  status,
  durationMs: 1,
  failures: [],
  ...extra,
})
function fixture(run: PlaywrightFeedbackOptions['run']) {
  const spy = vi.fn(run)
  let command = spec.command
  const controller = createPlaywrightFeedback({
    load: async () => ({
      root: '/inventory',
      sources: [],
      specs: [{ ...spec, command }],
      testRoots: ['/inventory/e2e', '/inventory/playwright.config.ts'],
    }),
    run: spy,
  })
  controller.record([result(0, 'failed', { lastRun: record('known') })], 0)
  controllers.push(controller)
  return {
    controller,
    run: spy,
    command: (value: string) => {
      command = value
    },
  }
}

it('a passing repair that spans a later write is rechecked before clearing the known failure', async () => {
  let release!: () => void
  const f = fixture(async (_spec, _, revision) => {
    if (revision === 1)
      await new Promise<void>((resolve) => {
        release = resolve
      })
    return result(revision, 'passed', { selection: 'last-failed' })
  })
  f.controller.changed([source])
  const stale = f.controller.check({ failedOnly: true })
  await vi.waitFor(() => expect(f.run).toHaveBeenCalledTimes(1))
  f.controller.changed([source])
  release()
  expect(await stale).toEqual([])
  expect((await f.controller.check({ failedOnly: true })).map((r) => r.status)).toEqual(['passed'])
  expect(f.run.mock.calls.map((call) => call[2])).toEqual([1, 2])
  expect(f.controller.failingSpecs()).toEqual([])
})

it.each([spec.path, '/inventory/e2e/helper.ts', '/inventory/playwright.config.ts'])(
  'a selection input edit drops the old failed-test ids: %s',
  async (path) => {
    const f = fixture(async (_spec, _, revision) =>
      result(revision, 'failed', { lastRun: record('new') }),
    )
    f.controller.changed([source])
    await f.controller.check({ failedOnly: true })
    f.controller.changed([path])
    await f.controller.check({ failedOnly: true })
    expect(f.run.mock.calls[1][5]).toBeUndefined()
  },
)

it('a changed command invalidates its prior failure record and cached checkpoint outcome', async () => {
  const f = fixture(async (_spec, _, revision) =>
    result(revision, 'failed', { lastRun: record('old') }),
  )
  f.controller.changed([source])
  await f.controller.check({ failedOnly: true })
  f.command('playwright test --project second')
  f.controller.changed([source])
  await f.controller.check({ failedOnly: true })
  expect(f.run.mock.calls[1][5]).toBeUndefined()
})

it('a partial host repair keeps other failures until their own tests pass', async () => {
  const f = fixture(async (_spec, _, revision) => result(revision, 'passed'))
  f.controller.record([result(0, 'failed', { lastRun: record('first', 'second') })], 0)
  f.controller.record(
    [result(0, 'passed', { selection: 'last-failed', passedTests: ['first'] })],
    0,
  )
  expect(f.controller.failingSpecs()).toEqual([spec.path])
  f.controller.changed([source])
  await f.controller.check({ failedOnly: true })
  expect(JSON.parse(f.run.mock.calls[0][5]!)).toEqual({
    status: 'failed',
    failedTests: ['second'],
  })
})
