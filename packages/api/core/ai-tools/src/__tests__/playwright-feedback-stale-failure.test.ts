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

async function running(foreground: 'passed' | 'failed' = 'failed') {
  let emit!: Parameters<PlaywrightFeedbackOptions['run']>[3]
  let started = false
  const onFailures = vi.fn()
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(
    async (_spec, _sources, revision, publish, signal, mode) => {
      if (mode === 'foreground') return result(revision, foreground)
      emit = publish
      started = true
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve()
        else signal.addEventListener('abort', () => resolve(), { once: true })
      })
      return result(revision, 'cancelled')
    },
  )
  const controller = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs: [spec] }),
    run,
    onFailures,
    debounceMs: 1,
  })
  controllers.push(controller)
  controller.changed([source])
  await vi.waitFor(() => expect(started).toBe(true))
  return { controller, run, onFailures, emit }
}

it('remembers an old revision’s live native failure before the run finishes, without delivering it', async () => {
  const { controller, onFailures, emit } = await running()
  controller.changed([source])
  emit(result(1, 'failed'))
  expect(controller.failingSpecs()).toEqual([spec.path])
  expect(controller.takeFailures()).toEqual([])
  expect(onFailures).not.toHaveBeenCalled()
})

it('rechecks current source before deploy when an old running revision emitted a native failure', async () => {
  const { controller, run, emit } = await running()
  controller.changed([source])
  emit(result(1, 'failed'))
  const checked = await controller.check({ failedOnly: true })
  expect(checked).toEqual([result(2, 'failed')])
  expect(run).toHaveBeenCalledTimes(2)
  expect(run.mock.calls[1][5]).toBe('foreground')
})

it('a repaired inventory control passes the current-source checkpoint and clears the stale failure', async () => {
  const { controller, emit, onFailures } = await running('passed')
  controller.changed([source])
  emit(result(1, 'failed'))
  expect(await controller.check({ failedOnly: true })).toEqual([result(2, 'passed')])
  expect(controller.failingSpecs()).toEqual([])
  expect(onFailures).not.toHaveBeenCalled()
})

it('counterexample: a current native failure is still delivered immediately', async () => {
  const { controller, emit, onFailures } = await running()
  emit(result(1, 'failed'))
  expect(controller.failingSpecs()).toEqual([spec.path])
  expect(controller.takeFailures()).toEqual([result(1, 'failed')])
  expect(onFailures).toHaveBeenCalledOnce()
})

it('counterexample: a cancelled run cannot seed a failure after another tool takes the runner', async () => {
  const { controller, emit } = await running()
  controller.changed([source])
  const release = await controller.pause()
  emit(result(1, 'failed'))
  expect(controller.failingSpecs()).toEqual([])
  expect(await controller.check({ failedOnly: true })).toEqual([])
  release()
})

it('counterexample: a stale pass creates no failure or checkpoint work', async () => {
  const { controller, emit, run } = await running()
  controller.changed([source])
  emit(result(1, 'passed'))
  expect(controller.failingSpecs()).toEqual([])
  expect(await controller.check({ failedOnly: true })).toEqual([])
  expect(run).toHaveBeenCalledOnce()
})

it('counterexample: closing a subscription invalidates even an old runner’s delayed native event', async () => {
  const { controller, emit } = await running()
  controller.changed([source])
  await controller.close()
  emit(result(1, 'failed'))
  expect(controller.failingSpecs()).toEqual([])
  expect(controller.takeFailures()).toEqual([])
})

it('a real native assertion after a source write is rechecked before its old run completes', async () => {
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
      // The old run must stay live until the checkpoint cancels it, even though source is fixed.
      if (initial === 'Save') await new Promise(done => setTimeout(done, 10000))
    })
  `,
  )
  const backend = createLocalBackend(root)
  const nativeSpec = { ...spec, path: join(root, 'stock.pw.ts'), cwd: root }
  let emitted: PlaywrightFeedbackResult | undefined
  const outcomes: PlaywrightFeedbackResult[] = []
  const controller = createPlaywrightFeedback({
    load: async () => ({ root, sources: [], specs: [nativeSpec] }),
    onResult: (result) => {
      outcomes.push(result)
    },
    run: (selected, sources, revision, emit, signal) =>
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
        emit: (result) => {
          emitted = result
          emit(result)
        },
      }),
    debounceMs: 1,
  })
  controllers.push(controller)
  controller.changed(['Stock.tsx'])
  await vi.waitFor(
    async () => {
      expect(outcomes, JSON.stringify(outcomes)).toEqual([])
      expect(await readFile(join(root, 'started'), 'utf8')).toBe('')
    },
    { timeout: 8000 },
  )
  controller.changed(['Stock.tsx'])
  await writeFile(join(root, 'value.txt'), 'Saved')
  await writeFile(join(root, 'release'), '')
  await vi.waitFor(() => expect(emitted?.status).toBe('failed'), { timeout: 8000 })
  expect(emitted?.failures[0].line).toBeGreaterThan(0)
  expect(emitted?.failures[0].error).toContain('Saved')
  expect(controller.failingSpecs()).toEqual([nativeSpec.path])
  expect(controller.takeFailures()).toEqual([])
  const checked = await controller.check({ failedOnly: true })
  expect(checked.map((result) => result.status)).toEqual(['passed'])
  expect(checked[0].nativeStats?.expected).toBe(2)
  expect(controller.failingSpecs()).toEqual([])
}, 25000)
