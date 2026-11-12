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

it('checks the known inventory on an explicit request even without a preceding source write', async () => {
  const f = fixture()
  expect((await f.watcher.check()).map((result) => result.status)).toEqual(['failed'])
  expect(f.load).toHaveBeenCalledOnce()
  expect(f.run).toHaveBeenCalledWith(
    expect.objectContaining({ path: '/shop/e2e/cart.spec.ts' }),
    [],
    0,
    expect.any(Function),
    expect.any(AbortSignal),
    'foreground',
  )
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

it('discards a completed prefix when source changes during a later checkpoint spec', async () => {
  const f = fixture()
  let entered!: () => void
  const second = new Promise<void>((resolve) => {
    entered = resolve
  })
  f.run.mockImplementation(async (spec, _files, revision, _emit, signal) => {
    if (spec.path.includes('shipping')) {
      entered()
      await new Promise<void>((done) =>
        signal.addEventListener('abort', () => done(), { once: true }),
      )
    }
    return {
      spec: spec.path,
      revision,
      durationMs: 1,
      status: signal.aborted ? 'cancelled' : 'passed',
      failures: [],
    }
  })
  f.watcher.changed(['/shop/src/Shipping.vue'])
  const checking = f.watcher.check()
  await second
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect(await checking).toEqual([])
})

it('re-runs only known native failures when asked, and runs nothing when none is known', async () => {
  const f = fixture()
  f.status('passed')
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect(f.watcher.failingSpecs()).toEqual([])
  expect(await f.watcher.check({ failedOnly: true })).toEqual([])
  expect(f.load).not.toHaveBeenCalled()
  expect(f.run).not.toHaveBeenCalled()
  // A failure the background runner found is the one spec a failed-only checkpoint re-runs.
  f.run.mockImplementationOnce(async (spec, sourceFiles, revision) => ({
    spec: spec.path,
    revision,
    durationMs: 1,
    status: 'failed',
    failures: [{ spec: spec.path, line: 3, locator: 'button', error: 'x', sourceFiles }],
  }))
  await f.watcher.settled()
  expect(f.watcher.failingSpecs()).toEqual(['/shop/e2e/cart.spec.ts'])
  f.run.mockClear()
  f.watcher.changed(['/shop/src/Cart.vue'])
  const results = await f.watcher.check({ failedOnly: true })
  expect(results.map((r) => [r.spec, r.status])).toEqual([['/shop/e2e/cart.spec.ts', 'passed']])
  expect(f.run.mock.calls.map(([spec]) => spec.path)).toEqual(['/shop/e2e/cart.spec.ts'])
  expect(f.watcher.failingSpecs()).toEqual([])
})

it('walks past a spec whose every test skipped itself instead of stopping the checkpoint', async () => {
  const f = fixture()
  f.run.mockImplementation(async (spec, _files, revision) => ({
    spec: spec.path,
    revision,
    durationMs: 1,
    status: spec.path.includes('cart') ? 'skipped' : 'failed',
    failures: spec.path.includes('cart')
      ? []
      : [{ spec: spec.path, line: 9, locator: 'status', error: 'Queued', sourceFiles: [] }],
  }))
  f.watcher.changed(['/shop/src/Shipping.vue'])
  expect((await f.watcher.check()).map((r) => r.status)).toEqual(['skipped', 'failed'])
  expect(f.watcher.failingSpecs()).toEqual(['/shop/e2e/shipping.spec.ts'])
})

function reportBackend(stats: Record<string, number>, stderr: string, exitCode: number) {
  return {
    projectRoot: '/shop',
    readFile: async (path: string) => {
      if (!path.endsWith('report.json')) throw new Error('ENOENT')
      return JSON.stringify({ suites: [], errors: [], stats: { ...stats, duration: 5 } })
    },
    writeFile: async () => {},
    deleteFile: async () => {},
    readDir: async () => [],
    run: async () => ({ stdout: '', stderr, exitCode }),
  }
}
const cart = { path: '/shop/e2e/cart.spec.ts', content: '', command: '', cwd: '/shop' }
const npmNotice = 'npm warn config ignoring workspace config at /shop/app/.npmrc\n'

it('reports a cleanly completed spec whose every test skipped itself as skipped, not unavailable', async () => {
  const result = await runPlaywrightFeedback(
    reportBackend({ expected: 0, unexpected: 0, flaky: 0, skipped: 31 }, npmNotice, 0),
    cart,
    [],
    1,
    { command: () => 'playwright test cart.spec.ts', foreground: true },
  )
  expect(result).toMatchObject({
    status: 'skipped',
    nativeStats: { expected: 0, skipped: 31 },
    reason: 'every selected test skipped itself (31 skipped)',
  })
})

it('names a run that executed no test by its counts, never by a package-manager notice', async () => {
  const result = await runPlaywrightFeedback(
    reportBackend({ expected: 0, unexpected: 0, flaky: 0, skipped: 0 }, npmNotice, 1),
    cart,
    [],
    1,
    { command: () => 'playwright test cart.spec.ts', foreground: true },
  )
  expect(result.status).toBe('unavailable')
  expect(result.reason).toContain('the runner executed no test (0 skipped, exit code 1)')
  expect(result.reason).not.toContain('npm warn')
})
