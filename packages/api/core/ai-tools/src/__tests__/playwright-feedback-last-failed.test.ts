/**
 * A known-failures checkpoint re-runs only the tests that failed, with Playwright's own
 * last-run record (`--last-failed`), instead of every test in each failing file. Their pass
 * releases the checkpoint but never stands for the whole file.
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

const SPEC = '/clinic/e2e/appointments.spec.ts'
const RECORD = JSON.stringify({ status: 'failed', failedTests: ['3f1c-reschedule'] })

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
        ? [{ spec: SPEC, line: 31, locator: 'button', error: 'not visible', sourceFiles: [] }]
        : [],
    ...extra,
  }
}

function fixture(run: PlaywrightFeedbackOptions['run']) {
  const spy = vi.fn(run)
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/clinic/e2e'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/clinic' }],
    }),
    run: spy,
    debounceMs: 1,
  })
  watchers.push(watcher)
  return { watcher, run: spy }
}

const foregroundCalls = (run: ReturnType<typeof vi.fn>) =>
  run.mock.calls.filter((call) => call[5] === 'foreground')

describe('known-failures checkpoint', () => {
  it('re-runs only the recorded tests, and their pass is never a whole-file pass', async () => {
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode, lastRun) => {
      if (mode !== 'foreground') return result(revision, 'failed', { lastRun: RECORD })
      return lastRun
        ? result(revision, 'passed', { selection: 'last-failed' })
        : result(revision, 'passed')
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    expect(f.watcher.failingSpecs()).toEqual([SPEC])

    const known = await f.watcher.check({ failedOnly: true })
    expect(known.map((r) => [r.status, r.selection])).toEqual([['passed', 'last-failed']])
    expect(foregroundCalls(f.run).map((call) => call[6])).toEqual([RECORD])
    expect(f.watcher.failingSpecs()).toEqual([])

    // A full checkpoint at the same revision runs the whole file: the subset pass was not reused.
    const full = await f.watcher.check()
    expect(full.map((r) => [r.status, r.selection])).toEqual([['passed', undefined]])
    expect(foregroundCalls(f.run)).toHaveLength(2)
    expect(foregroundCalls(f.run)[1]).toHaveLength(6)
  })

  it('leaves the whole file to background diagnosis of the repaired revision', async () => {
    const background: number[] = []
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode, lastRun) => {
      if (mode !== 'foreground') {
        background.push(revision)
        return background.length === 1
          ? result(revision, 'failed', { lastRun: RECORD })
          : result(revision, 'passed')
      }
      return result(revision, 'passed', lastRun ? { selection: 'last-failed' } : {})
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    // The repair is written, and the deploy checks before background diagnosis starts on it.
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    const known = await f.watcher.check({ failedOnly: true })
    expect(known.map((r) => r.selection)).toEqual(['last-failed'])
    await f.watcher.settled()
    // The whole file runs on the repaired revision afterwards; the subset pass did not settle it.
    expect(background).toEqual([1, 2])
  })

  it('holds on the recorded tests when they still fail and keeps the runner’s fresh record', async () => {
    const fresh = JSON.stringify({
      status: 'failed',
      failedTests: ['3f1c-reschedule', '9a0e-cancel'],
    })
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode, lastRun) => {
      if (mode !== 'foreground') return result(revision, 'failed', { lastRun: RECORD })
      return result(revision, 'failed', {
        selection: lastRun ? 'last-failed' : undefined,
        lastRun: fresh,
      })
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    const held = await f.watcher.check({ failedOnly: true })
    expect(held.map((r) => r.status)).toEqual(['failed'])
    expect(f.watcher.failingSpecs()).toEqual([SPEC])
    expect(foregroundCalls(f.run)).toHaveLength(1)
    await f.watcher.check({ failedOnly: true })
    expect(foregroundCalls(f.run).map((call) => call[6])).toEqual([RECORD, fresh])
  })

  it('runs the whole file when the record selects nothing the runner can run', async () => {
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode, lastRun) => {
      if (mode !== 'foreground') return result(revision, 'failed', { lastRun: RECORD })
      return lastRun
        ? result(revision, 'unavailable', {
            selection: 'last-failed',
            reason: 'zero executed tests',
          })
        : result(revision, 'passed')
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    const checked = await f.watcher.check({ failedOnly: true })
    expect(checked.map((r) => [r.status, r.selection])).toEqual([['passed', undefined]])
    expect(foregroundCalls(f.run).map((call) => call.length)).toEqual([7, 6])
    expect(f.watcher.failingSpecs()).toEqual([])
  })

  it('takes a whole-file answer from a host that does not pass records on, without a second run', async () => {
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode) =>
      mode !== 'foreground'
        ? result(revision, 'failed', { lastRun: RECORD })
        : result(revision, 'passed'),
    )
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    const checked = await f.watcher.check({ failedOnly: true })
    expect(checked.map((r) => [r.status, r.selection])).toEqual([['passed', undefined]])
    expect(foregroundCalls(f.run)).toHaveLength(1)
    expect(f.watcher.failingSpecs()).toEqual([])
    // That answer covered the whole file, so a full checkpoint reuses it.
    await f.watcher.check()
    expect(foregroundCalls(f.run)).toHaveLength(1)
  })

  it('never hands a record to a full checkpoint', async () => {
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode) =>
      mode !== 'foreground'
        ? result(revision, 'failed', { lastRun: RECORD })
        : result(revision, 'passed'),
    )
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    await f.watcher.check()
    expect(foregroundCalls(f.run).map((call) => call.length)).toEqual([6])
  })

  it('re-runs only the tests a paused run saw fail, not the whole file (P348, 2026-11-13)', async () => {
    // The deploy's checkpoint pauses a started background file. Before, a failure it had already
    // reported left the file known-failing with no record, so the checkpoint ran every test in it.
    const f = fixture(async (_spec, _files, revision, emit, signal, mode, lastRun) => {
      if (mode === 'foreground')
        return result(revision, 'passed', lastRun ? { selection: 'last-failed' } : {})
      emit(result(revision, 'failed'))
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled', { lastRun: RECORD })
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(f.watcher.failingSpecs()).toEqual([SPEC]))
    const checked = await f.watcher.check({ failedOnly: true })
    expect(checked.map((r) => [r.status, r.selection])).toEqual([['passed', 'last-failed']])
    expect(foregroundCalls(f.run).map((call) => call[6])).toEqual([RECORD])
    expect(f.watcher.failingSpecs()).toEqual([])
  })

  it('adds a paused run’s failures to the older record instead of replacing it', async () => {
    const later = JSON.stringify({ status: 'failed', failedTests: ['77b2-waitlist'] })
    let background = 0
    const f = fixture(async (_spec, _files, revision, emit, signal, mode, lastRun) => {
      if (mode === 'foreground')
        return result(revision, 'passed', lastRun ? { selection: 'last-failed' } : {})
      if (++background === 1) return result(revision, 'failed', { lastRun: RECORD })
      emit(result(revision, 'failed'))
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled', { lastRun: later })
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(background).toBe(2))
    await f.watcher.check({ failedOnly: true })
    // The paused run never reached the older failure, so that one is still known.
    expect(JSON.parse(foregroundCalls(f.run)[0][6] as string).failedTests).toEqual([
      '3f1c-reschedule',
      '77b2-waitlist',
    ])
  })

  it('keeps the older record when a paused run saw no failure', async () => {
    let background = 0
    const f = fixture(async (_spec, _files, revision, _emit, signal, mode, lastRun) => {
      if (mode === 'foreground')
        return result(revision, 'passed', lastRun ? { selection: 'last-failed' } : {})
      if (++background === 1) return result(revision, 'failed', { lastRun: RECORD })
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled')
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(background).toBe(2))
    await f.watcher.check({ failedOnly: true })
    expect(foregroundCalls(f.run).map((call) => call[6])).toEqual([RECORD])
  })

  it('drops tests a later paused run saw pass, and the file once none is left (P348, 2026-11-13)', async () => {
    // A file failed whole before its feature existed; later runs passed those tests but were paused
    // before they finished, so the checkpoint re-ran all nine at the deploy.
    const early = JSON.stringify({
      status: 'failed',
      failedTests: ['3f1c-reschedule', '9a0e-cancel'],
    })
    let background = 0
    const f = fixture(async (_spec, _files, revision, _emit, signal, mode, lastRun) => {
      if (mode === 'foreground')
        return result(revision, 'passed', lastRun ? { selection: 'last-failed' } : {})
      background++
      if (background === 1) return result(revision, 'failed', { lastRun: early })
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled', {
        passedTests: background === 2 ? ['3f1c-reschedule'] : ['9a0e-cancel', '1b2d-list'],
      })
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(background).toBe(2))
    await f.watcher.check({ failedOnly: true })
    expect(foregroundCalls(f.run).map((call) => call[6])).toEqual([
      JSON.stringify({ status: 'failed', failedTests: ['9a0e-cancel'] }),
    ])
  })

  it('stops knowing a file as failing once a paused run passed every test its record named', async () => {
    const early = JSON.stringify({
      status: 'failed',
      failedTests: ['3f1c-reschedule', '9a0e-cancel'],
    })
    let background = 0
    const f = fixture(async (_spec, _files, revision, _emit, signal, mode) => {
      if (mode === 'foreground') return result(revision, 'passed')
      if (++background === 1) return result(revision, 'failed', { lastRun: early })
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled', { passedTests: ['3f1c-reschedule', '9a0e-cancel'] })
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    expect(f.watcher.failingSpecs()).toEqual([SPEC])
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(background).toBe(2))
    expect(await f.watcher.check({ failedOnly: true })).toEqual([])
    expect(foregroundCalls(f.run)).toHaveLength(0)
    expect(f.watcher.failingSpecs()).toEqual([])
  })

  it('keeps a file known-failing without a record, whatever a paused run passed', async () => {
    let background = 0
    const f = fixture(async (_spec, _files, revision, emit, signal, mode) => {
      if (mode === 'foreground') return result(revision, 'passed')
      background++
      if (background === 1) {
        // An older runner: a failure, and no last-run record.
        emit(result(revision, 'failed'))
        return result(revision, 'failed')
      }
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled', { passedTests: ['3f1c-reschedule'] })
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(background).toBe(2))
    await f.watcher.check({ failedOnly: true })
    // Nothing named the failing test, so the whole file answers.
    expect(foregroundCalls(f.run).map((call) => call.length)).toEqual([6])
  })

  it('does not make a file known-failing when its paused run saw no failure', async () => {
    let started = false
    const f = fixture(async (_spec, _files, revision, _emit, signal, mode) => {
      if (mode === 'foreground') return result(revision, 'passed')
      started = true
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      return result(revision, 'cancelled')
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await vi.waitFor(() => expect(started).toBe(true))
    expect(await f.watcher.check({ failedOnly: true })).toEqual([])
    expect(foregroundCalls(f.run)).toHaveLength(0)
  })

  it('drops an older record when a later failed run wrote none', async () => {
    let backgroundRuns = 0
    const f = fixture(async (_spec, _files, revision, _emit, _signal, mode) => {
      if (mode === 'foreground') return result(revision, 'passed')
      backgroundRuns++
      return result(revision, 'failed', backgroundRuns === 1 ? { lastRun: RECORD } : {})
    })
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.settled()
    expect(backgroundRuns).toBe(2)
    await f.watcher.check({ failedOnly: true })
    expect(foregroundCalls(f.run).map((call) => call.length)).toEqual([6])
  })
})

describe('the real runner', () => {
  let root: string
  let spec: FeedbackSpec
  let backend: ReturnType<typeof createLocalBackend>
  const state = (value: string) => writeFile(join(root, 'state.txt'), value)

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'last-failed-'))
    const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
    await symlink(dirname(dirname(dirname(cli))), join(root, 'node_modules'), 'dir')
    await mkdir(join(root, 'e2e'))
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(
      join(root, 'playwright.config.mjs'),
      "export default {testDir:'./e2e',workers:1,retries:0,timeout:5000}",
    )
    const content = `import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const state = () => readFileSync(new URL('../state.txt', import.meta.url), 'utf8').trim();
test('lists the day', async () => { expect(1).toBe(1) });
test('reschedules a visit', async () => { expect(state()).toBe('fixed') });
test('keeps the waiting list', async () => { await new Promise((r) => setTimeout(r, 200)); expect(2).toBe(2) });
`
    const path = join(root, 'e2e', 'visits.spec.ts')
    await writeFile(path, content)
    spec = {
      path,
      content,
      cwd: root,
      command: `node ${shellQuote(cli)} test --config playwright.config.mjs visits.spec.ts`,
    }
    backend = createLocalBackend(root)
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const run = (lastFailed?: string, foreground = true) =>
    runPlaywrightFeedback(backend, spec, [], 1, {
      command: (flags) => `${spec.command} ${flags.join(' ')}`,
      foreground,
      ...(lastFailed === undefined ? {} : { lastFailed }),
    })

  it('records the failed test and re-runs only it once the app is fixed', async () => {
    await state('broken')
    const failed = await run(undefined, false)
    expect(failed.status).toBe('failed')
    expect(failed.nativeStats).toMatchObject({ expected: 2, unexpected: 1 })
    expect(JSON.parse(failed.lastRun!).failedTests).toHaveLength(1)

    await state('fixed')
    const known = await run(failed.lastRun)
    expect(known).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(known.nativeStats).toMatchObject({ expected: 1, unexpected: 0 })
  }, 30_000)

  it('drives the scheduler end to end: the checkpoint runs one test, not the file', async () => {
    await state('broken')
    const watcher = createPlaywrightFeedback({
      load: async () => ({ sources: [], specs: [spec] }),
      run: (s, files, revision, emit, signal, mode, lastRun) =>
        runPlaywrightFeedback(backend, s, files, revision, {
          command: (flags) => `${s.command} ${flags.join(' ')}`,
          emit,
          signal,
          foreground: mode === 'foreground',
          ...(lastRun === undefined ? {} : { lastFailed: lastRun }),
        }),
      debounceMs: 1,
    })
    watchers.push(watcher)
    watcher.changed([join(root, 'src', 'Visits.tsx')])
    await watcher.settled()
    expect(watcher.failingSpecs()).toEqual([spec.path])
    await state('fixed')
    const [checked] = await watcher.check({ failedOnly: true })
    expect(checked).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(checked.nativeStats).toMatchObject({ expected: 1 })
  }, 30_000)

  it('a run stopped after a failure names that test in the runner’s own record', async () => {
    // The ids the reporter writes must be the ones `--last-failed` selects by.
    await state('broken')
    const slowContent = `import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const state = () => readFileSync(new URL('../state.txt', import.meta.url), 'utf8').trim();
test('opens the waiting room', async () => { expect(1).toBe(1) });
test('moves a visit', async () => { expect(state()).toBe('fixed') });
test('prints the schedule', async () => { await new Promise((r) => setTimeout(r, 20000)); expect(3).toBe(3) });
`
    const slowPath = join(root, 'e2e', 'rooms.spec.ts')
    await writeFile(slowPath, slowContent)
    const slow: FeedbackSpec = {
      ...spec,
      path: slowPath,
      content: slowContent,
      command: spec.command.replace('visits.spec.ts', 'rooms.spec.ts'),
    }
    const abort = new AbortController()
    const stopped = await runPlaywrightFeedback(backend, slow, [], 1, {
      command: (flags) => `${slow.command} ${flags.join(' ')}`,
      signal: abort.signal,
      pollMs: 50,
      emit: () => abort.abort(),
    })
    expect(stopped.status).toBe('cancelled')
    expect(JSON.parse(stopped.lastRun!).failedTests).toHaveLength(1)
    // The test that passed before the failure is named too, and is not the failed one.
    expect(stopped.passedTests).toHaveLength(1)
    expect(JSON.parse(stopped.lastRun!).failedTests).not.toContain(stopped.passedTests![0])

    await state('fixed')
    const known = await runPlaywrightFeedback(backend, slow, [], 1, {
      command: (flags) => `${slow.command} ${flags.join(' ')}`,
      foreground: true,
      lastFailed: stopped.lastRun,
    })
    expect(known).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(known.nativeStats).toMatchObject({ expected: 1, unexpected: 0 })
  }, 60_000)

  it('runs nothing as a pass when the record names no current test', async () => {
    await state('fixed')
    const stale = await run(JSON.stringify({ status: 'failed', failedTests: ['0000-renamed'] }))
    expect(stale.status).not.toBe('passed')
    expect(stale.selection).toBe('last-failed')
  }, 30_000)

  it('ignores a malformed record and runs the whole file', async () => {
    await state('fixed')
    const whole = await run('not a record')
    expect(whole.status).toBe('passed')
    expect(whole.selection).toBeUndefined()
    expect(whole.nativeStats).toMatchObject({ expected: 3 })
  }, 30_000)
})
