import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type { PlaywrightFeedback, PlaywrightFeedbackOptions } from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((c) => c.close())))

it('does not make a passing file a known failure on a later source write', async () => {
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (spec, _files, revision) => ({
    spec: spec.path,
    revision,
    status: 'passed' as const,
    durationMs: 0,
    failures: [],
  }))
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      specs: [{ path: '/app/catalog.spec.ts', content: '', command: '', cwd: '/app' }],
    }),
    run,
  })
  watcher.record(
    [{ spec: '/app/catalog.spec.ts', revision: 0, durationMs: 1, status: 'failed', failures: [] }],
    0,
  )
  controllers.push(watcher)
  watcher.changed(['/app/src/Catalog.tsx'])
  await watcher.check({ failedOnly: true })
  watcher.changed(['/app/src/Catalog.tsx'])
  expect(await watcher.check({ failedOnly: true })).toEqual([])
  expect(run.mock.calls.map((args) => args[2])).toEqual([1])
})
