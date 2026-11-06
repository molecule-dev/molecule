import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((c) => c.close())))

it('resumes an interrupted revision after completed files instead of starving later specs', async () => {
  const visits: string[] = []
  const results: PlaywrightFeedbackResult[] = []
  let interrupted = false
  const watcher = createPlaywrightFeedback({
    debounceMs: 1,
    load: async () => ({
      sources: [],
      specs: ['account', 'preferences', 'navigation'].map((name) => ({
        path: `/app/e2e/${name}.spec.ts`,
        content: '',
        command: '',
        cwd: '/app',
      })),
    }),
    run: async (spec, _files, revision, _emit, signal) => {
      visits.push(spec.path)
      if (spec.path.includes('preferences') && !interrupted) {
        interrupted = true
        await new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true }),
        )
      }
      return {
        spec: spec.path,
        revision,
        status: signal.aborted ? 'cancelled' : 'passed',
        durationMs: 0,
        failures: [],
      }
    },
    onResult: (result) => results.push(result),
  })
  controllers.push(watcher)
  watcher.changed(['/app/src/Preferences.tsx'])
  await vi.waitFor(() => expect(visits).toHaveLength(2))
  const release = await watcher.pause()
  expect(results.map((r) => r.status)).toEqual(['passed', 'cancelled'])
  release()
  await watcher.settled()
  expect(visits).toEqual([
    '/app/e2e/account.spec.ts',
    '/app/e2e/preferences.spec.ts',
    '/app/e2e/preferences.spec.ts',
    '/app/e2e/navigation.spec.ts',
  ])
  expect(watcher.takeFailures()).toEqual([])
})

it('invalidates completed coverage on a source write, including while foreground work holds it', async () => {
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (spec, _files, revision) => ({
    spec: spec.path,
    revision,
    status: 'passed' as const,
    durationMs: 0,
    failures: [],
  }))
  const watcher = createPlaywrightFeedback({
    debounceMs: 1,
    load: async () => ({
      sources: [],
      specs: [{ path: '/app/catalog.spec.ts', content: '', command: '', cwd: '/app' }],
    }),
    run,
  })
  controllers.push(watcher)
  watcher.changed(['/app/src/Catalog.tsx'])
  await watcher.settled()
  const release = await watcher.pause()
  watcher.changed(['/app/src/Catalog.tsx'])
  release()
  await watcher.settled()
  expect(run.mock.calls.map((args) => args[2])).toEqual([1, 2])
})
