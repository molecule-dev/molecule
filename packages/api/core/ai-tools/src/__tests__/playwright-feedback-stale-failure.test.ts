import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

const spec = { path: '/inventory/e2e/stock.spec.ts', content: '', command: '', cwd: '/inventory' }
const source = '/inventory/src/Stock.tsx'
const failure = {
  spec: spec.path,
  line: 20,
  error: 'Error: expect(locator).toHaveText(expected) failed\nExpected: "Saved"\nReceived: "Save"',
  locator: 'getByRole("button", { name: "Saved" })',
  sourceFiles: [source],
}
const result = (
  revision: number,
  status: PlaywrightFeedbackResult['status'],
): PlaywrightFeedbackResult => ({
  spec: spec.path,
  revision,
  status,
  durationMs: 1,
  failures: status === 'failed' ? [failure] : [],
})
const controllers: PlaywrightFeedback[] = []
const roots: string[] = []
afterEach(async () => {
  await Promise.all(controllers.splice(0).map((controller) => controller.close()))
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

/**
 * A checkpoint whose first run a newer write supersedes. The superseded run is cancelled and its
 * answer discarded; the known failure stays, and the next checkpoint re-verifies at the current
 * revision. How the cancelled run itself answered is `superseded` ('cancelled' by default).
 */
async function supersededRun(
  answer: 'passed' | 'failed' = 'failed',
  staleAnswer: PlaywrightFeedbackResult['status'] = 'cancelled',
) {
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(
    async (_spec, _sources, revision, _emit, signal) => {
      if (run.mock.calls.length > 1) return result(revision, answer)
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve()
        else signal.addEventListener('abort', () => resolve(), { once: true })
      })
      return result(revision, staleAnswer)
    },
  )
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
  const stale = controller.check({ failedOnly: true })
  await vi.waitFor(() => expect(run).toHaveBeenCalledOnce())
  return { controller, run, stale }
}

it('rechecks current source before deploy when a write supersedes a running revision', async () => {
  const { controller, run, stale } = await supersededRun('failed')
  controller.changed([source])
  expect(await stale).toEqual([])
  const checked = await controller.check({ failedOnly: true })
  expect(checked).toEqual([result(2, 'failed')])
  expect(run).toHaveBeenCalledTimes(2)
})

it('a repaired inventory control passes the current-source checkpoint and clears the stale failure', async () => {
  const { controller, stale } = await supersededRun('passed')
  controller.changed([source])
  expect(await stale).toEqual([])
  expect(await controller.check({ failedOnly: true })).toEqual([result(2, 'passed')])
  expect(controller.failingSpecs()).toEqual([])
})

it('counterexample: a cancelled repair cannot clear a completed failure', async () => {
  const { controller, stale } = await supersededRun('failed')
  controller.changed([source])
  await stale
  expect(controller.failingSpecs()).toEqual([spec.path])
  expect((await controller.check({ failedOnly: true })).map((r) => r.status)).toEqual(['failed'])
})

it('counterexample: a stale pass cannot clear an existing completed failure', async () => {
  const { controller, run, stale } = await supersededRun('failed', 'passed')
  controller.changed([source])
  await stale
  expect(controller.failingSpecs()).toEqual([spec.path])
  expect((await controller.check({ failedOnly: true })).map((r) => r.status)).toEqual(['failed'])
  expect(run).toHaveBeenCalledTimes(2)
})

it('a real native run cancelled by a newer write is rechecked at the fixed source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'native-stale-feedback-'))
  roots.push(root)
  const require = createRequire(import.meta.url)
  const dependencies = dirname(dirname(dirname(require.resolve('@playwright/test/package.json'))))
  await symlink(dependencies, join(root, 'node_modules'), 'dir')
  await writeFile(join(root, 'value.txt'), 'Save')
  await writeFile(
    join(root, 'playwright.config.ts'),
    `
    import {defineConfig} from '@playwright/test'
    export default defineConfig({testMatch: 'stock.pw.ts', workers: 1, timeout: 15000})
  `,
  )
  await writeFile(
    join(root, 'stock.pw.ts'),
    `
    import fs from 'node:fs'
    import {test, expect} from '@playwright/test'
    const initial = fs.readFileSync('value.txt', 'utf8')
    test('saved switch adopts loaded data', async () => {
      const rendered = initial
      fs.writeFileSync('started', '')
      while (!fs.existsSync('release')) await new Promise(done => setTimeout(done, 10))
      expect(rendered).toBe('Saved')
    })
    test('remaining tests are still running', async () => {
      // The superseded run must stay live until the write cancels it, even though source is fixed.
      if (initial === 'Save') await new Promise(done => setTimeout(done, 10000))
    })
  `,
  )
  const backend = createLocalBackend(root)
  const nativeSpec = { ...spec, path: join(root, 'stock.pw.ts'), cwd: root }
  const outcomes: PlaywrightFeedbackResult[] = []
  const controller = createPlaywrightFeedback({
    load: async () => ({ root, sources: [], specs: [nativeSpec] }),
    onResult: (result) => {
      outcomes.push(result)
    },
    run: (selected, sources, revision, _emit, signal) =>
      runPlaywrightFeedback(backend, selected, sources, revision, {
        command: (flags) =>
          [
            shellQuote(process.execPath),
            shellQuote(require.resolve('@playwright/test/cli')),
            'test',
            '--config=playwright.config.ts',
            ...flags,
          ].join(' '),
        scratchRoot: join(root, 'feedback'),
        timeoutMs: 15000,
        pollMs: 10,
        signal,
        // This fixture owns the native runner slot. OS idle scheduling and foreground
        // preemption have their own real-process tests; they must not starve this contract test.
        foreground: true,
      }),
  })
  // A completed host run established these failures before the source write.
  controller.record(
    [nativeSpec].map(({ path }) => ({
      spec: path,
      revision: 0,
      durationMs: 1,
      status: 'failed',
      failures: [],
    })),
    0,
  )

  controllers.push(controller)
  controller.changed(['Stock.tsx'])
  const stale = controller.check({ failedOnly: true })
  await vi.waitFor(
    async () => {
      expect(outcomes, JSON.stringify(outcomes)).toEqual([])
      expect(await readFile(join(root, 'started'), 'utf8')).toBe('')
    },
    { timeout: 8000 },
  )
  controller.changed(['Stock.tsx'])
  expect(await stale).toEqual([])
  await writeFile(join(root, 'value.txt'), 'Saved')
  await writeFile(join(root, 'release'), '')
  const checked = await controller.check({ failedOnly: true })
  expect(checked.map((result) => result.status)).toEqual(['passed'])
  expect(checked[0].nativeStats?.expected).toBe(2)
  expect(controller.failingSpecs()).toEqual([])
}, 25000)
