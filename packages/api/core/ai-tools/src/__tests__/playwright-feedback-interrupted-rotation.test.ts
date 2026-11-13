import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type { PlaywrightFeedback, PlaywrightFeedbackOptions } from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((controller) => controller.close())))

function fixture(run: PlaywrightFeedbackOptions['run'], count = 3) {
  const specs = ['checkout', 'preferences', 'directory'].slice(0, count).map((name) => ({
    path: `/shop/e2e/${name}.spec.ts`,
    content: '',
    command: '',
    cwd: '/shop',
  }))
  const controller = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs }),
    run,
    debounceMs: 1,
  })
  controllers.push(controller)
  return { controller, specs }
}

it('rotates interrupted files so short foreground tools cannot starve the remaining inventory', async () => {
  const visits: string[] = []
  const f = fixture(async (spec, _files, revision, _emit, signal) => {
    visits.push(spec.path)
    await new Promise<void>((done) =>
      signal.addEventListener('abort', () => done(), { once: true }),
    )
    return { spec: spec.path, revision, status: 'cancelled', durationMs: 1, failures: [] }
  })
  f.controller.changed(['/shop/src/Preferences.tsx'])
  for (let turn = 1; turn <= 3; turn++) {
    await vi.waitFor(() => expect(visits).toHaveLength(turn))
    const release = await f.controller.pause()
    if (turn < 3) release()
  }
  expect(visits).toEqual(f.specs.map((spec) => spec.path))
  // Giving another file a turn is never a pass or a failure for the cancelled file.
  expect(f.controller.failingSpecs()).toEqual([])
  expect(f.controller.takeFailures()).toEqual([])
})

it('reaches a later failure while an earlier file repeatedly yields to foreground work', async () => {
  const visits: string[] = []
  const f = fixture(async (spec, sourceFiles, revision, _emit, signal) => {
    visits.push(spec.path)
    if (spec.path.endsWith('/checkout.spec.ts')) {
      await new Promise<void>((done) =>
        signal.addEventListener('abort', () => done(), { once: true }),
      )
      return { spec: spec.path, revision, status: 'cancelled', durationMs: 1, failures: [] }
    }
    return {
      spec: spec.path,
      revision,
      status: 'failed',
      durationMs: 1,
      failures: [
        {
          spec: spec.path,
          line: 12,
          error: 'Unexpected destination',
          locator: 'page',
          sourceFiles,
        },
      ],
    }
  })
  f.controller.changed(['/shop/src/Preferences.tsx'])
  await vi.waitFor(() => expect(visits).toHaveLength(1))
  const release = await f.controller.pause()
  release()
  // Stop the second attempt if the old scheduler repeats checkout indefinitely.
  await vi.waitFor(() => expect(visits.length).toBeGreaterThanOrEqual(2))
  const releaseAgain = await f.controller.pause()
  expect(f.controller.failingSpecs()).toContain(f.specs[1].path)
  expect(f.controller.takeFailures()).toEqual(
    expect.arrayContaining([expect.objectContaining({ spec: f.specs[1].path, revision: 1 })]),
  )
  await f.controller.close()
  releaseAgain()
})

it('counterexample: a one-file inventory retries its interrupted file without inventing coverage', async () => {
  let attempts = 0
  const f = fixture(async (spec, _files, revision, _emit, signal) => {
    attempts++
    if (attempts === 1) {
      await new Promise<void>((done) =>
        signal.addEventListener('abort', () => done(), { once: true }),
      )
      return { spec: spec.path, revision, status: 'cancelled', durationMs: 1, failures: [] }
    }
    return { spec: spec.path, revision, status: 'passed', durationMs: 1, failures: [] }
  }, 1)
  f.controller.changed(['/shop/src/Checkout.tsx'])
  await vi.waitFor(() => expect(attempts).toBe(1))
  const release = await f.controller.pause()
  expect(f.controller.takeFailures()).toEqual([])
  release()
  await f.controller.settled()
  expect(attempts).toBe(2)
  expect(await f.controller.check({ failedOnly: true })).toEqual([])
  expect(attempts).toBe(2)
  expect(f.controller.takeFailures()).toEqual([])
})
