/**
 * A background file stopped by foreground work resumes with only the tests it never finished,
 * instead of starting again at its first test. Every record handed to `--last-failed` names
 * whole serial groups, so a group's later test never runs without the earlier ones.
 */
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createPlaywrightFeedback, runPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  FeedbackSpec,
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

const watchers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(watchers.splice(0).map((watcher) => watcher.close())))

const SPEC = '/pantry/e2e/stock.spec.ts'
const record = (ids: string[]) => JSON.stringify({ status: 'failed', failedTests: ids })
const ids = (text: string | undefined) =>
  (JSON.parse(text!) as { failedTests: string[] }).failedTests

function result(
  revision: number,
  status: PlaywrightFeedbackResult['status'],
  extra: Partial<PlaywrightFeedbackResult> = {},
): PlaywrightFeedbackResult {
  return {
    spec: SPEC,
    revision,
    durationMs: 1,
    status,
    failures:
      status === 'failed'
        ? [{ spec: SPEC, line: 12, locator: 'row', error: 'not visible', sourceFiles: [] }]
        : [],
    ...extra,
  }
}

/** A host whose first run stops when paused, with `stopped` as its stopped result. */
function fixture(
  stopped: Partial<PlaywrightFeedbackResult>,
  next: PlaywrightFeedbackOptions['run'],
) {
  let started!: () => void
  const first = new Promise<void>((resolve) => (started = resolve))
  let calls = 0
  const run = vi.fn<PlaywrightFeedbackOptions['run']>(async (...args) => {
    const [, , revision, , signal] = args
    if (++calls > 1) return next(...args)
    started()
    await new Promise<void>((resolve) =>
      signal.addEventListener('abort', () => resolve(), { once: true }),
    )
    return result(revision, 'cancelled', stopped)
  })
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/pantry' }],
    }),
    run,
    debounceMs: 1,
  })
  watchers.push(watcher)
  /** Write, let the first run start, stop it with foreground work, and release that work. */
  const stopFirstRun = async (during?: () => void) => {
    watcher.changed(['/pantry/src/Shelf.tsx'])
    await first
    const release = await watcher.pause()
    during?.()
    release()
    await watcher.settled()
  }
  return { watcher, run, stopFirstRun }
}

describe('a stopped background file', () => {
  it('resumes with only the tests it never finished (P348, 2026-11-13)', async () => {
    const { run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['t2', 't3'] },
      async (_spec, _files, revision) =>
        result(revision, 'passed', { selection: 'last-failed', passedTests: ['t2', 't3'] }),
    )
    await stopFirstRun()
    expect(run).toHaveBeenCalledTimes(2)
    expect(run.mock.calls[1][5]).toBe('background')
    expect(ids(run.mock.calls[1][6])).toEqual(['t2', 't3'])
  })

  it('stands for the whole file when every run of it started on this revision', async () => {
    const { watcher, run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['t2'] },
      async (_spec, _files, revision) =>
        result(revision, 'passed', { selection: 'last-failed', passedTests: ['t2'] }),
    )
    await stopFirstRun()
    const [checked] = await watcher.check()
    expect(run).toHaveBeenCalledTimes(2)
    expect(checked).toMatchObject({ status: 'passed' })
    expect(checked.selection).toBeUndefined()
  })

  it('keeps a failure its stopped run saw after the rest of the file passes', async () => {
    const { watcher, run, stopFirstRun } = fixture(
      { lastRun: record(['t1']), unfinishedTests: ['t2', 't3'] },
      async (_spec, _files, revision, _emit, _signal, mode, lastRun) =>
        mode === 'foreground'
          ? result(revision, 'failed', { selection: 'last-failed', lastRun })
          : result(revision, 'passed', { selection: 'last-failed', passedTests: ['t2', 't3'] }),
    )
    await stopFirstRun()
    expect(watcher.failingSpecs()).toEqual([SPEC])
    const [held] = await watcher.check({ failedOnly: true })
    expect(held.status).toBe('failed')
    expect(ids(run.mock.calls[2][6])).toEqual(['t1'])
  })

  it('resumes across a write, but the file is not passed whole on the new revision', async () => {
    const { watcher, run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['t2'] },
      async (_spec, _files, revision, _emit, _signal, mode, lastRun) =>
        result(
          revision,
          'passed',
          lastRun ? { selection: 'last-failed', passedTests: ['t2'] } : {},
        ),
    )
    await stopFirstRun(() => watcher.changed(['/pantry/src/Aisle.tsx']))
    expect(ids(run.mock.calls[1][6])).toEqual(['t2'])
    await watcher.check()
    expect(run).toHaveBeenCalledTimes(3)
    expect(run.mock.calls[2][5]).toBe('foreground')
    expect(run.mock.calls[2][6]).toBeUndefined()
  })

  it('runs whole again once its own spec file is edited', async () => {
    const { watcher, run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['t2'] },
      async (_spec, _files, revision) => result(revision, 'passed'),
    )
    await stopFirstRun(() => watcher.changed([SPEC]))
    expect(run).toHaveBeenCalledTimes(2)
    expect(run.mock.calls[1]).toHaveLength(5)
  })

  it('runs whole on the next pass when its record selects no current test', async () => {
    const { run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['renamed'] },
      async (_spec, _files, revision, _emit, _signal, _mode, lastRun) =>
        lastRun
          ? result(revision, 'unavailable', { selection: 'last-failed', reason: 'no test' })
          : result(revision, 'passed'),
    )
    await stopFirstRun()
    expect(run).toHaveBeenCalledTimes(3)
    expect(run.mock.calls[2]).toHaveLength(5)
  })

  it('takes a host that ignores the record at its whole-file answer, without another run', async () => {
    const { watcher, run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['t2'] },
      async (_spec, _files, revision) => result(revision, 'passed'),
    )
    await stopFirstRun()
    await watcher.check()
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps its resume point when a later run stopped before selecting any test', async () => {
    let secondStarted!: () => void
    const second = new Promise<void>((resolve) => (secondStarted = resolve))
    let resumedRuns = 0
    const { watcher, run, stopFirstRun } = fixture(
      { passedTests: ['t1'], unfinishedTests: ['t2'] },
      async (_spec, _files, revision, _emit, signal) => {
        if (++resumedRuns === 1) {
          secondStarted()
          await new Promise<void>((resolve) =>
            signal.addEventListener('abort', () => resolve(), { once: true }),
          )
          return result(revision, 'cancelled')
        }
        return result(revision, 'passed', { selection: 'last-failed', passedTests: ['t2'] })
      },
    )
    const stopping = stopFirstRun()
    await second
    const release = await watcher.pause()
    release()
    await stopping
    await watcher.settled()
    expect(run).toHaveBeenCalledTimes(3)
    expect(ids(run.mock.calls[1][6])).toEqual(['t2'])
    expect(ids(run.mock.calls[2][6])).toEqual(['t2'])
  })

  it('re-runs a serial group whole, whatever part of it a record names', async () => {
    const { watcher, run, stopFirstRun } = fixture(
      {
        passedTests: ['open'],
        lastRun: record(['pay']),
        unfinishedTests: ['ship', 'alone'],
        serialGroups: [['open', 'pay', 'ship']],
      },
      async (_spec, _files, revision, _emit, _signal, mode) =>
        mode === 'foreground'
          ? result(revision, 'passed', { selection: 'last-failed' })
          : result(revision, 'failed', { selection: 'last-failed', lastRun: record(['ship']) }),
    )
    await stopFirstRun()
    expect(ids(run.mock.calls[1][6])).toEqual(['open', 'pay', 'ship', 'alone'])
    await watcher.check({ failedOnly: true })
    expect(ids(run.mock.calls[2][6])).toEqual(['open', 'pay', 'ship'])
  })
})

describe('the real runner', () => {
  let root: string
  let backend: ReturnType<typeof createLocalBackend>
  let cli: string
  const state = (value: string) => writeFile(join(root, 'state.txt'), value)
  const file = async (name: string, content: string): Promise<FeedbackSpec> => {
    const path = join(root, 'e2e', name)
    await writeFile(path, content)
    return {
      path,
      content,
      cwd: root,
      command: `node ${shellQuote(cli)} test --config playwright.config.mjs ${name}`,
    }
  }
  const header = `import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const state = () => readFileSync(new URL('../state.txt', import.meta.url), 'utf8').trim();
`
  /** A background run stopped at its first failure, the way a pause stops one. */
  const stoppedAtFailure = (spec: FeedbackSpec) => {
    const abort = new AbortController()
    return runPlaywrightFeedback(backend, spec, [], 1, {
      command: (flags) => `${spec.command} ${flags.join(' ')}`,
      signal: abort.signal,
      pollMs: 50,
      emit: () => abort.abort(),
    })
  }
  const selective = (spec: FeedbackSpec, lastFailed: string, foreground = false) =>
    runPlaywrightFeedback(backend, spec, [], 1, {
      command: (flags) => `${spec.command} ${flags.join(' ')}`,
      foreground,
      lastFailed,
    })

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'unfinished-'))
    cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
    await symlink(dirname(dirname(dirname(cli))), join(root, 'node_modules'), 'dir')
    await mkdir(join(root, 'e2e'))
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(
      join(root, 'playwright.config.mjs'),
      "export default {testDir:'./e2e',workers:1,retries:0,timeout:30000}",
    )
    backend = createLocalBackend(root)
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('a stopped run names the tests it never finished, and they alone run next', async () => {
    await state('broken')
    const spec = await file(
      'shelves.spec.ts',
      `${header}test('counts the shelves', async () => { expect(1).toBe(1) });
test('restocks a shelf', async () => { expect(state()).toBe('fixed') });
test('prints the stock list', async () => { if (state() !== 'fixed') await new Promise((r) => setTimeout(r, 20000)); expect(3).toBe(3) });
`,
    )
    const stopped = await stoppedAtFailure(spec)
    expect(stopped.status).toBe('cancelled')
    expect(stopped.passedTests).toHaveLength(1)
    expect(stopped.unfinishedTests).toHaveLength(1)
    expect(stopped.unfinishedTests).not.toContain(stopped.passedTests![0])
    expect(ids(stopped.lastRun)).not.toContain(stopped.unfinishedTests![0])

    await state('fixed')
    const rest = await selective(spec, record(stopped.unfinishedTests!))
    expect(rest).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(rest.nativeStats).toMatchObject({ expected: 1, unexpected: 0 })
    expect(rest.passedTests).toEqual(stopped.unfinishedTests)
  }, 60_000)

  it('a failed serial group is recorded whole, so its fixed re-run passes', async () => {
    await state('broken')
    const spec = await file(
      'booking.spec.ts',
      `${header}test.describe.serial('booking', () => {
  let held = false;
  test('holds a slot', async () => { held = true });
  test('confirms the slot', async () => { expect(state()).toBe('fixed'); expect(held).toBe(true) });
  test('sends the receipt', async () => { expect(held).toBe(true) });
});
test('lists the rooms', async () => { expect(1).toBe(1) });
`,
    )
    const failed = await runPlaywrightFeedback(backend, spec, [], 1, {
      command: (flags) => `${spec.command} ${flags.join(' ')}`,
    })
    expect(failed.status).toBe('failed')
    expect(failed.serialGroups).toHaveLength(1)
    expect(ids(failed.lastRun)).toEqual(expect.arrayContaining(failed.serialGroups![0]))

    await state('fixed')
    const known = await selective(spec, failed.lastRun!, true)
    expect(known).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(known.nativeStats).toMatchObject({ expected: 3, unexpected: 0 })
  }, 60_000)

  it('a run stopped inside a serial group records the group whole', async () => {
    await state('broken')
    const spec = await file(
      'checkout.spec.ts',
      `${header}test.describe.serial('checkout', () => {
  let cart = 0;
  test('adds to the cart', async () => { cart = 1 });
  test('pays for the cart', async () => { expect(state()).toBe('fixed'); expect(cart).toBe(1) });
  test('prints the order', async () => { expect(cart).toBe(1) });
});
test('shows the menu', async () => { if (state() !== 'fixed') await new Promise((r) => setTimeout(r, 20000)); expect(1).toBe(1) });
`,
    )
    const stopped = await stoppedAtFailure(spec)
    expect(stopped.status).toBe('cancelled')
    const [group] = stopped.serialGroups!
    expect(group).toHaveLength(3)
    expect(ids(stopped.lastRun)).toEqual(group)

    await state('fixed')
    const known = await selective(spec, stopped.lastRun!, true)
    expect(known).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(known.nativeStats).toMatchObject({ expected: 3, unexpected: 0 })
  }, 60_000)
})
