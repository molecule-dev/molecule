import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type { PlaywrightFeedback, PlaywrightFeedbackOptions } from '../playwright-feedback-types.js'

const watchers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(watchers.splice(0).map((watcher) => watcher.close())))
function fixture() {
  let status: 'passed' | 'failed' | 'unavailable' = 'failed'
  const load = vi.fn(async () => ({
    sources: [],
    specs: ['cart', 'shipping'].map((name) => ({
      path: `/shop/e2e/${name}.spec.ts`,
      content: '',
      command: '',
      cwd: '/shop',
    })),
  }))
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (spec, sourceFiles, revision) => ({
    spec: spec.path,
    revision,
    durationMs: 1,
    status,
    failures:
      status === 'failed'
        ? [
            {
              spec: spec.path,
              line: 14,
              locator: "getByRole('status')",
              error: 'Expected: Delivered; received: Queued',
              sourceFiles,
            },
          ]
        : [],
  }))
  const watcher = createPlaywrightFeedback({ load, run })
  watchers.push(watcher)
  return {
    watcher,
    load,
    run,
    status: (value: typeof status) => {
      status = value
    },
  }
}

it('uses explicit native verification when there was no idle window and stops at the first failure', async () => {
  const f = fixture()
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect(f.run).not.toHaveBeenCalled()
  const result = await f.watcher.check()
  expect(result.map((r) => r.status)).toEqual(['failed'])
  expect(f.run).toHaveBeenCalledWith(
    expect.objectContaining({ path: '/shop/e2e/cart.spec.ts' }),
    ['/shop/src/Shipping.vue'],
    1,
    expect.any(Function),
    expect.any(AbortSignal),
    'foreground',
  )
  expect(f.run).toHaveBeenCalledOnce()
})

it('reuses current native results but invalidates them on the next source revision', async () => {
  const f = fixture()
  f.status('passed')
  f.watcher.changed(['/shop/src/Shipping.vue'])
  await f.watcher.settled()
  expect(f.run).toHaveBeenCalledTimes(2)
  expect((await f.watcher.check()).map((r) => r.status)).toEqual(['passed', 'passed'])
  expect(f.run).toHaveBeenCalledTimes(2)
  f.status('failed')
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect((await f.watcher.check())[0].status).toBe('failed')
  expect(f.run).toHaveBeenCalledTimes(3)
})

it('does no work without a source revision', async () => {
  const f = fixture()
  expect(await f.watcher.check()).toEqual([])
  expect(f.load).not.toHaveBeenCalled()
  expect(f.run).not.toHaveBeenCalled()
})

it('rechecks a failed test after a restart or data repair even without a source write', async () => {
  const f = fixture()
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect((await f.watcher.check())[0].status).toBe('failed')
  f.status('passed')
  expect((await f.watcher.check()).map((r) => r.status)).toEqual(['passed', 'passed'])
  expect(f.run).toHaveBeenCalledTimes(3)
})

it('retries runner unavailability rather than caching it as a passing or failing test', async () => {
  const f = fixture()
  f.status('unavailable')
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect((await f.watcher.check())[0].status).toBe('unavailable')
  f.status('passed')
  expect((await f.watcher.check()).map((r) => r.status)).toEqual(['passed', 'passed'])
  expect(f.run).toHaveBeenCalledTimes(3)
})

it('shares parallel checkpoints and discards results if source changes while the runner works', async () => {
  const f = fixture()
  let started!: () => void
  const entered = new Promise<void>((resolve) => {
    started = resolve
  })
  f.run.mockImplementation(async (spec, _files, revision, _emit, signal) => {
    started()
    await new Promise<void>((done) =>
      signal.addEventListener('abort', () => done(), { once: true }),
    )
    return { spec: spec.path, revision, durationMs: 1, status: 'cancelled', failures: [] }
  })
  f.watcher.changed(['/shop/src/Shipping.vue'])
  const a = f.watcher.check(),
    b = f.watcher.check()
  await entered
  const release = await f.watcher.pause()
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect(await a).toEqual([])
  expect(await b).toEqual([])
  expect(f.run).toHaveBeenCalledOnce()
  await f.watcher.close()
  release()
})

it('keeps an emitted native failure when a hung teardown prevents the final JSON report', async () => {
  const backend = {
    projectRoot: '/shop',
    readFile: async (path: string) => {
      if (!path.endsWith('failures.jsonl')) throw new Error('ENOENT')
      return (
        JSON.stringify({
          spec: '/shop/e2e/cart.spec.ts',
          line: 14,
          error:
            'Error: expect(locator).toHaveText(expected) failed\nExpected: Delivered\nReceived: Queued',
          rendered: '- status: Queued',
        }) + '\n'
      )
    },
    writeFile: async () => {},
    deleteFile: async () => {},
    readDir: async () => [],
    run: async () => ({ stdout: '', stderr: 'teardown exceeded deadline', exitCode: 124 }),
  }
  const result = await runPlaywrightFeedback(
    backend,
    {
      path: '/shop/e2e/cart.spec.ts',
      content: '',
      command: '',
      cwd: '/shop',
    },
    ['/shop/src/Cart.vue'],
    1,
    { command: () => 'playwright test cart.spec.ts', foreground: true },
  )
  expect(result.status).toBe('failed')
  expect(result.failures[0]).toMatchObject({
    spec: '/shop/e2e/cart.spec.ts',
    line: 14,
    rendered: '- status: Queued',
    error: expect.stringContaining('Expected: Delivered'),
  })
})
