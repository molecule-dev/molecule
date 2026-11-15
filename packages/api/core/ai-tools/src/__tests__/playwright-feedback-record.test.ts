import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

// A stock-inventory app, not the benchmark: one spec, one source file.
const spec = { path: '/inventory/e2e/stock.spec.ts', content: '', command: '', cwd: '/inventory' }
const source = '/inventory/src/Stock.tsx'
const result = (
  revision: number,
  status: PlaywrightFeedbackResult['status'],
): PlaywrightFeedbackResult => ({
  spec: spec.path,
  revision,
  status,
  durationMs: 1,
  failures:
    status === 'failed'
      ? [
          {
            spec: spec.path,
            line: 20,
            error: 'Error: expect(locator).toHaveText(expected) failed',
            locator: 'getByRole("button", { name: "Saved" })',
            sourceFiles: [source],
          },
        ]
      : [],
})
const controllers: PlaywrightFeedback[] = []
afterEach(async () => {
  await Promise.all(controllers.splice(0).map((controller) => controller.close()))
})

/** A controller whose first checkpoint fails the spec once, and whose later runs pass. */
async function knownFailure() {
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _sources, revision, emit) => {
    if (run.mock.calls.length === 1) {
      const failed = result(revision, 'failed')
      emit(failed)
      return failed
    }
    return result(revision, 'passed')
  })
  const controller = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs: [spec] }),
    run,
  })
  // A completed host run established these failures before the source write.
  controller.record(
    [spec].map(({ path }) => ({
      spec: path,
      revision: 0,
      durationMs: 1,
      status: 'failed',
      failures: [],
    })),
    0,
  )

  controllers.push(controller)
  controller.changed([source])
  // The known-failures checkpoint re-verifies and fails once more at the written revision.
  await controller.check({ failedOnly: true })
  return { controller, run }
}

it('a host’s own pass at the current revision clears the known failure, so the checkpoint runs nothing', async () => {
  const { controller, run } = await knownFailure()
  controller.changed([source]) // the fix
  const at = controller.revision()
  controller.record([result(at, 'passed')], at)
  expect(controller.failingSpecs()).toEqual([])
  expect(await controller.check({ failedOnly: true })).toEqual([])
  expect(run).toHaveBeenCalledTimes(1)
})

it('a whole-suite checkpoint reuses the recorded pass instead of running the spec', async () => {
  const { controller, run } = await knownFailure()
  controller.changed([source])
  const at = controller.revision()
  controller.record([result(at, 'passed')], at)
  expect(await controller.check()).toEqual([result(at, 'passed')])
  expect(run).toHaveBeenCalledTimes(1)
})

it('counterexample: a pass recorded for a revision a write has since replaced is ignored', async () => {
  const { controller, run } = await knownFailure()
  controller.changed([source]) // the fix
  const at = controller.revision()
  controller.changed([source]) // a write landed while the host's run was going
  controller.record([result(at, 'passed')], at)
  expect(controller.failingSpecs()).toEqual([spec.path])
  expect(await controller.check({ failedOnly: true })).toEqual([result(at + 1, 'passed')])
  expect(run).toHaveBeenCalledTimes(2)
})

it('counterexample: a host failure or outage is not recorded and the checkpoint still verifies', async () => {
  const { controller, run } = await knownFailure()
  controller.changed([source])
  const at = controller.revision()
  controller.record([result(at, 'failed'), result(at, 'unavailable')], at)
  expect(controller.failingSpecs()).toEqual([spec.path])
  expect(await controller.check({ failedOnly: true })).toEqual([result(at, 'passed')])
  expect(run).toHaveBeenCalledTimes(2)
})
