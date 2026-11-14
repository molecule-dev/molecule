/** Per-test freshness across edits; spec start time is not every test's source revision. */
import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const watchers: PlaywrightFeedback[] = []
afterEach(async () => {
  await Promise.all(watchers.splice(0).map((watcher) => watcher.close()))
  vi.useRealTimers()
})
const SPEC = '/inventory/e2e/stock.spec.ts'
const source = '/inventory/src/Stock.tsx'
const result = (revision: number, extra = {}): PlaywrightFeedbackResult => ({
  spec: SPEC,
  revision,
  durationMs: 1,
  status: 'passed',
  failures: [],
  ...extra,
})
const recordIds = (record: string | undefined) => record && JSON.parse(record).failedTests

it('delivers a test that began after the last write even when its spec began before it', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  const onFailures = vi.fn()
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision, emit) => {
    if (run.mock.calls.length !== 1) return result(revision)
    const firstTest = performance.now()
    await vi.advanceTimersByTimeAsync(10)
    watcher.changed([source])
    await vi.advanceTimersByTimeAsync(10)
    const secondTest = performance.now()
    const failure = {
      testId: 'second',
      spec: SPEC,
      line: 4,
      error: 'Save is not visible',
      locator: 'Save',
      sourceFiles: [source],
    }
    const completed = result(revision, {
      status: 'failed',
      failures: [failure],
      selectedTests: ['first', 'second'],
      tests: [
        { id: 'first', status: 'passed', startedAfter: firstTest },
        { id: 'second', status: 'failed', startedAfter: secondTest },
      ],
    })
    emit(completed)
    return completed
  })
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e', '/inventory/playwright.config.ts'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
    }),
    run,
    onFailures,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(onFailures).toHaveBeenCalledWith(
    expect.objectContaining({
      revision: 2,
      failures: [expect.objectContaining({ testId: 'second' })],
    }),
  )
})

it('reruns only obsolete tests, preserving tests completed after the edit', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(
    async (_spec, _files, revision, _emit, _signal, _mode, _record) => {
      if (run.mock.calls.length > 1)
        return result(revision, {
          selection: 'last-failed',
          nativeStats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0, durationMs: 1 },
          selectedTests: ['old'],
          tests: [{ id: 'old', status: 'passed', startedAfter: performance.now() + 1 }],
          passedTests: ['old'],
        })
      const first = performance.now()
      await vi.advanceTimersByTimeAsync(10)
      watcher.changed([source])
      await vi.advanceTimersByTimeAsync(10)
      return result(revision, {
        selectedTests: ['old', 'fresh'],
        tests: [
          { id: 'old', status: 'passed', startedAfter: first },
          { id: 'fresh', status: 'passed', startedAfter: performance.now() },
        ],
      })
    },
  )
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e', '/inventory/playwright.config.ts'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
    }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(recordIds(run.mock.calls[1]?.[6])).toEqual(['old'])
  const calls = run.mock.calls.length
  const [checked] = await watcher.check()
  expect(checked).toMatchObject({ status: 'passed', revision: 2 })
  expect(checked.selection).toBeUndefined()
  expect(checked.nativeStats).toBeUndefined()
  expect(run).toHaveBeenCalledTimes(calls)
})

it('never delivers a test spanning a write and invalidates a previously passed test after a relevant edit', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  const onFailures = vi.fn()
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision, emit) => {
    const began = performance.now()
    if (run.mock.calls.length === 1) {
      await vi.advanceTimersByTimeAsync(10)
      watcher.changed([source])
      emit(
        result(revision, {
          status: 'failed',
          failures: [
            {
              testId: 'save',
              spec: SPEC,
              line: 3,
              error: 'stale',
              locator: 'Save',
              sourceFiles: [source],
            },
          ],
          tests: [{ id: 'save', status: 'failed', startedAfter: began }],
        }),
      )
    }
    return result(revision, {
      selectedTests: ['save'],
      tests: [{ id: 'save', status: 'passed', startedAfter: began }],
    })
  })
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e', '/inventory/playwright.config.ts'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
    }),
    run,
    onFailures,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(onFailures).not.toHaveBeenCalled()
  const before = run.mock.calls.length
  watcher.changed([source])
  await watcher.settled()
  expect(run.mock.calls.length).toBeGreaterThan(before)
})

it('does nothing for a project without a suite', async () => {
  const run = vi.fn()
  const watcher = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs: [] }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(run).not.toHaveBeenCalled()
})

it('reuses a file whose tests all began after a write during its earlier startup', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision) => {
    if (run.mock.calls.length === 1) {
      await vi.advanceTimersByTimeAsync(10)
      watcher.changed([source])
      await vi.advanceTimersByTimeAsync(10)
    }
    return result(revision, {
      selectedTests: ['save'],
      tests: [{ id: 'save', status: 'passed', startedAfter: performance.now() }],
    })
  })
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e', '/inventory/playwright.config.ts'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
    }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(run).toHaveBeenCalledOnce()
  expect(await watcher.check()).toEqual([
    expect.objectContaining({ status: 'passed', revision: 2 }),
  ])
  expect(run).toHaveBeenCalledOnce()
})

it.each(['/inventory/e2e/helpers/data.ts', '/inventory/playwright.config.ts'])(
  'refreshes the native selection when %s changes while the old file is running',
  async (path) => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
    const onResult = vi.fn()
    const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision) => {
      if (run.mock.calls.length === 1) {
        await vi.advanceTimersByTimeAsync(10)
        watcher.changed([path])
        await vi.advanceTimersByTimeAsync(10)
      }
      const ids = run.mock.calls.length === 1 ? ['old'] : ['old', 'added']
      return result(revision, {
        selectedTests: ids,
        tests: ids.map((id) => ({ id, status: 'passed', startedAfter: performance.now() })),
      })
    })
    const watcher = createPlaywrightFeedback({
      load: async () => ({
        sources: [],
        testRoots: ['/inventory/e2e', '/inventory/playwright.config.ts'],
        specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
      }),
      run,
      onResult,
      debounceMs: 1,
    })
    watchers.push(watcher)
    watcher.changed([source])
    await watcher.settled()
    expect(run).toHaveBeenCalledTimes(2)
    expect(run.mock.calls[1][6]).toBeUndefined()
    expect(onResult.mock.calls[0][0].tests[0].revision).toBeUndefined()
  },
)

it('does not reuse cross-write test identities when the host has not declared all selection inputs', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision) => {
    if (run.mock.calls.length === 1) {
      await vi.advanceTimersByTimeAsync(10)
      watcher.changed([source])
      await vi.advanceTimersByTimeAsync(10)
    }
    return result(revision, {
      selectedTests: ['save'],
      tests: [{ id: 'save', status: 'passed', startedAfter: performance.now() }],
    })
  })
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
    }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(run).toHaveBeenCalledTimes(2)
})

it('does not certify a test spanning a source edit when the host wall clock steps backward', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  const onFailures = vi.fn()
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision, emit) => {
    if (run.mock.calls.length === 1) {
      const startedAfter = performance.now()
      await vi.advanceTimersByTimeAsync(10)
      vi.setSystemTime(new Date(Date.now() - 60000))
      watcher.changed([source])
      emit(
        result(revision, {
          status: 'failed',
          failures: [
            {
              testId: 'save',
              spec: SPEC,
              line: 3,
              error: 'obsolete',
              locator: 'Save',
              sourceFiles: [source],
            },
          ],
          tests: [{ id: 'save', status: 'failed', startedAfter }],
        }),
      )
    }
    return result(revision)
  })
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
    }),
    run,
    onFailures,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  expect(onFailures).not.toHaveBeenCalled()
})

it('refreshes selection when the caller changes the command or its working directory', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
  let updated = false
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision) =>
    result(revision, {
      selectedTests: updated ? ['first', 'new-project'] : ['first'],
      tests: (updated ? ['first', 'new-project'] : ['first']).map((id) => ({
        id,
        status: 'passed',
        startedAfter: performance.now(),
      })),
    }),
  )
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e'],
      specs: [
        {
          path: SPEC,
          content: '',
          command: updated ? 'playwright test --project second' : 'playwright test',
          cwd: updated ? '/inventory/other' : '/inventory',
        },
      ],
    }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  updated = true
  watcher.changed([source])
  await watcher.settled()
  expect(run.mock.calls[1][6]).toBeUndefined()
})

it('validates cached checkpoint outcomes against the newly loaded command without a source write', async () => {
  let second = false
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision) =>
    result(revision, { status: second ? 'failed' : 'passed' }),
  )
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/inventory/e2e'],
      specs: [
        {
          path: SPEC,
          content: '',
          command: second ? 'playwright test --project second' : 'playwright test',
          cwd: '/inventory',
        },
      ],
    }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  watcher.changed([source])
  await watcher.settled()
  second = true
  expect((await watcher.check())[0].status).toBe('failed')
  expect(run).toHaveBeenCalledTimes(2)
})

it.each(['/inventory/e2e/', '/inventory/e2e/.', '/'])(
  'invalidates selection under an absolute test root written as %s',
  async (testRoot) => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] })
    const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (_spec, _files, revision) => {
      if (run.mock.calls.length === 1) {
        await vi.advanceTimersByTimeAsync(10)
        watcher.changed(['/inventory/e2e/helpers/data.ts'])
        await vi.advanceTimersByTimeAsync(10)
      }
      return result(revision, {
        selectedTests: ['save'],
        tests: [{ id: 'save', status: 'passed', startedAfter: performance.now() }],
      })
    })
    const watcher = createPlaywrightFeedback({
      load: async () => ({
        sources: [],
        testRoots: [testRoot],
        specs: [{ path: SPEC, content: '', command: '', cwd: '/inventory' }],
      }),
      run,
      debounceMs: 1,
    })
    watchers.push(watcher)
    watcher.changed([source])
    await watcher.settled()
    expect(run).toHaveBeenCalledTimes(2)
    expect(run.mock.calls[1][6]).toBeUndefined()
  },
)
