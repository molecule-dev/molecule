import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type { PlaywrightFeedback, PlaywrightFeedbackOptions } from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((c) => c.close())))

it('a stopped repair re-run stays with the known failure instead of rotating into unvisited files', async () => {
  const specs = ['checkout', 'preferences', 'directory'].map((name) => ({
    path: `/shop/e2e/${name}.spec.ts`,
    content: '',
    command: '',
    cwd: '/shop',
  }))
  const visits: string[] = []
  const run: PlaywrightFeedbackOptions['run'] = async (spec, _, revision, _emit, signal) => {
    visits.push(spec.path)
    await new Promise<void>((resolve) =>
      signal.addEventListener('abort', () => resolve(), { once: true }),
    )
    return { spec: spec.path, revision, durationMs: 1, status: 'cancelled', failures: [] }
  }
  const controller = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs }),
    run,
    debounceMs: 1,
  })
  controllers.push(controller)
  controller.record(
    [{ spec: specs[0].path, revision: 0, durationMs: 1, status: 'failed', failures: [] }],
    0,
  )
  controller.changed(['/shop/src/Checkout.svelte'])
  for (let n = 1; n <= 3; n++) {
    await vi.waitFor(() => expect(visits).toHaveLength(n))
    const release = await controller.pause()
    if (n < 3) release()
  }
  expect(visits).toEqual(Array(3).fill(specs[0].path))
  expect(controller.failingSpecs()).toEqual([specs[0].path])
  expect(controller.takeFailures()).toEqual([])
})
