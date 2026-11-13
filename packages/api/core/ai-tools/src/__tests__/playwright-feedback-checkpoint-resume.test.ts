import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((controller) => controller.close())))

function fixture() {
  const specs = ['checkout', 'delivery'].map((name) => ({
    path: `/shop/e2e/${name}.spec.ts`,
    content: '',
    command: '',
    cwd: '/shop',
  }))
  let checkout: PlaywrightFeedbackResult['status'] = 'failed'
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (spec, sourceFiles, revision) => ({
    spec: spec.path,
    revision,
    durationMs: 1,
    status: spec.path === specs[0].path ? checkout : 'failed',
    failures:
      spec.path !== specs[0].path || checkout === 'failed'
        ? [{ spec: spec.path, line: 8, locator: 'status', error: 'Queued', sourceFiles }]
        : [],
  }))
  const load = vi.fn(async () => ({ sources: [], specs }))
  const controller = createPlaywrightFeedback({ load, run })
  controllers.push(controller)
  return {
    controller,
    load,
    run,
    specs,
    checkout: (status: typeof checkout) => {
      checkout = status
    },
  }
}

it.each(['passed', 'failed', 'unavailable'] as const)(
  'a failed-only checkpoint returning %s preserves the pending unvisited file',
  async (status) => {
    const f = fixture()
    // Only checkout has run; delivery is still unknown. The next write queues both.
    expect((await f.controller.check()).map((result) => result.status)).toEqual(['failed'])
    f.checkout(status)
    f.controller.changed(['/shop/src/Delivery.vue'])
    const release = await f.controller.pause()
    try {
      const results = await f.controller.check({ failedOnly: true })
      expect(results.map((result) => [result.spec, result.status])).toEqual([
        [f.specs[0].path, status],
      ])
      expect(f.run.mock.calls.map(([spec]) => spec.path)).toEqual([
        f.specs[0].path,
        f.specs[0].path,
      ])
    } finally {
      release()
    }
    await f.controller.settled()
    expect(f.run.mock.calls.map(([spec]) => spec.path)).toContain(f.specs[1].path)
    expect(f.controller.failingSpecs()).toContain(f.specs[1].path)
    const failures = f.controller.takeFailures()
    expect(failures).toHaveLength(status === 'failed' ? 2 : 1)
    expect(failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spec: f.specs[1].path,
          revision: 1,
          failures: [expect.objectContaining({ sourceFiles: ['/shop/src/Delivery.vue'] })],
        }),
        // A still-failing checkout may also be diagnosed by the resumed background pass.
        ...(status === 'failed'
          ? [expect.objectContaining({ spec: f.specs[0].path, revision: 1 })]
          : []),
      ]),
    )
  },
)

it('a failed-only checkpoint with no known failure adds no load or runner work and preserves queued diagnosis', async () => {
  const f = fixture()
  f.checkout('passed')
  f.controller.changed(['/shop/src/Delivery.vue'])
  expect(await f.controller.check({ failedOnly: true })).toEqual([])
  expect(f.load).not.toHaveBeenCalled()
  expect(f.run).not.toHaveBeenCalled()
  await f.controller.settled()
  expect(f.run.mock.calls.map(([spec]) => spec.path)).toEqual(f.specs.map((spec) => spec.path))
})

it('a complete explicit checkpoint consumes its pending pass without duplicating background work', async () => {
  const f = fixture()
  f.checkout('passed')
  f.run.mockImplementation(async (spec, _files, revision) => ({
    spec: spec.path,
    revision,
    durationMs: 1,
    status: 'passed',
    failures: [],
  }))
  f.controller.changed(['/shop/src/Delivery.vue'])
  expect((await f.controller.check()).map((result) => result.status)).toEqual(['passed', 'passed'])
  await f.controller.settled()
  expect(f.run).toHaveBeenCalledTimes(2)
  expect(f.controller.takeFailures()).toEqual([])
})
