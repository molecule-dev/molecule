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

function fixture(run: PlaywrightFeedbackOptions['run'], seeded?: string) {
  const spy = vi.fn(run)
  const watcher = createPlaywrightFeedback({
    load: async () => ({
      sources: [],
      testRoots: ['/clinic/e2e'],
      specs: [{ path: SPEC, content: '', command: '', cwd: '/clinic' }],
    }),
    run: spy,
  })
  // A completed host run established these failures — with its failed-test record when it
  // wrote one — before the source write.
  watcher.record(
    [{ path: SPEC, content: '', command: '', cwd: '/clinic' }].map(({ path }) => ({
      spec: path,
      revision: 0,
      durationMs: 1,
      status: 'failed',
      failures: [],
      ...(seeded === undefined ? {} : { lastRun: seeded }),
    })),
    0,
  )

  watchers.push(watcher)
  return { watcher, run: spy }
}

describe('known-failures checkpoint', () => {
  it('re-runs only the recorded tests, and their pass is never a whole-file pass', async () => {
    const f = fixture(
      async (_spec, _files, revision, _emit, _signal, lastRun) =>
        lastRun
          ? result(revision, 'passed', { selection: 'last-failed' })
          : result(revision, 'passed'),
      RECORD,
    )
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    expect(f.watcher.failingSpecs()).toEqual([SPEC])

    const known = await f.watcher.check({ failedOnly: true })
    expect(known.map((r) => [r.status, r.selection])).toEqual([['passed', 'last-failed']])
    expect(f.run.mock.calls.map((call) => call[5])).toEqual([RECORD])
    expect(f.watcher.failingSpecs()).toEqual([])

    // A full checkpoint at the same revision runs the whole file: the subset pass was not reused.
    const full = await f.watcher.check()
    expect(full.map((r) => [r.status, r.selection])).toEqual([['passed', undefined]])
    expect(f.run).toHaveBeenCalledTimes(2)
    expect(f.run.mock.calls[1]).toHaveLength(5)
  })

  it('leaves the rest of a repaired file to an explicit checkpoint', async () => {
    const f = fixture(
      async (_spec, _files, revision, _emit, _signal, lastRun) =>
        result(revision, 'passed', lastRun ? { selection: 'last-failed' } : {}),
      RECORD,
    )
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    // The repair is written, and the deploy checks before anything else runs the file.
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    const known = await f.watcher.check({ failedOnly: true })
    expect(known.map((r) => r.selection)).toEqual(['last-failed'])
    // Nothing else runs on the repaired revision: the subset pass settled nothing else.
    expect(await f.watcher.check({ failedOnly: true })).toEqual([])
    expect(f.run).toHaveBeenCalledTimes(1)
    // The whole file still runs on the repaired revision at an explicit full checkpoint.
    await f.watcher.check()
    expect(f.run).toHaveBeenCalledTimes(2)
    expect(f.run.mock.calls[1][5]).toBeUndefined()
  })

  it('holds on the recorded tests when they still fail and keeps the runner’s fresh record', async () => {
    const fresh = JSON.stringify({
      status: 'failed',
      failedTests: ['3f1c-reschedule', '9a0e-cancel'],
    })
    const f = fixture(
      async (_spec, _files, revision, _emit, _signal) =>
        result(revision, 'failed', { selection: 'last-failed', lastRun: fresh }),
      RECORD,
    )
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    const held = await f.watcher.check({ failedOnly: true })
    expect(held.map((r) => r.status)).toEqual(['failed'])
    expect(f.watcher.failingSpecs()).toEqual([SPEC])
    expect(f.run).toHaveBeenCalledTimes(1)
    await f.watcher.check({ failedOnly: true })
    expect(f.run.mock.calls.map((call) => call[5])).toEqual([RECORD, fresh])
  })

  it('re-runs every known-failing file, not only the first that still fails', async () => {
    const SECOND = '/clinic/e2e/billing.spec.ts'
    const run = vi.fn<PlaywrightFeedbackOptions['run']>(
      async (spec, _files, revision, _emit, _signal, lastRun) => ({
        ...result(revision, 'failed', { lastRun: RECORD }),
        spec: spec.path,
        failures: [
          { spec: spec.path, line: 7, locator: 'button', error: 'not visible', sourceFiles: [] },
        ],
        ...(lastRun ? { selection: 'last-failed' as const } : {}),
      }),
    )
    const watcher = createPlaywrightFeedback({
      load: async () => ({
        sources: [],
        testRoots: ['/clinic/e2e'],
        specs: [SPEC, SECOND].map((path) => ({ path, content: '', command: '', cwd: '/clinic' })),
      }),
      run,
    })
    // A completed host run established these failures, each with its failed-test record.
    watcher.record(
      [SPEC, SECOND]
        .map((path) => ({ path, content: '', command: '', cwd: '/clinic' }))
        .map(({ path }) => ({
          spec: path,
          revision: 0,
          durationMs: 1,
          status: 'failed',
          failures: [],
          lastRun: RECORD,
        })),
      0,
    )

    watchers.push(watcher)
    watcher.changed(['/clinic/src/Calendar.tsx'])
    expect(watcher.failingSpecs().sort()).toEqual([SECOND, SPEC].sort())

    const held = await watcher.check({ failedOnly: true })
    expect(held.map((r) => [r.spec, r.status, r.selection]).sort()).toEqual(
      [
        [SECOND, 'failed', 'last-failed'],
        [SPEC, 'failed', 'last-failed'],
      ].sort(),
    )
    expect(watcher.failingSpecs().sort()).toEqual([SECOND, SPEC].sort())

    // Counterexample: a full checkpoint still answers at its first failing file.
    watcher.changed(['/clinic/src/Calendar.tsx'])
    const full = await watcher.check()
    expect(full.map((r) => r.status)).toEqual(['failed'])
  })

  it('runs the whole file when the record selects nothing the runner can run', async () => {
    const f = fixture(
      async (_spec, _files, revision, _emit, _signal, lastRun) =>
        lastRun
          ? result(revision, 'unavailable', {
              selection: 'last-failed',
              reason: 'zero executed tests',
            })
          : result(revision, 'passed'),
      RECORD,
    )
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    const checked = await f.watcher.check({ failedOnly: true })
    expect(checked.map((r) => [r.status, r.selection])).toEqual([['passed', undefined]])
    expect(f.run.mock.calls.map((call) => call.length)).toEqual([6, 5])
    expect(f.watcher.failingSpecs()).toEqual([])
  })

  it('takes a whole-file answer from a host that does not pass records on, without a second run', async () => {
    const f = fixture(async (_spec, _files, revision) => result(revision, 'passed'), RECORD)
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    const checked = await f.watcher.check({ failedOnly: true })
    expect(checked.map((r) => [r.status, r.selection])).toEqual([['passed', undefined]])
    expect(f.run).toHaveBeenCalledTimes(1)
    expect(f.watcher.failingSpecs()).toEqual([])
    // That answer covered the whole file, so a full checkpoint reuses it.
    await f.watcher.check()
    expect(f.run).toHaveBeenCalledTimes(1)
  })

  it('never hands a record to a full checkpoint', async () => {
    const f = fixture(async (_spec, _files, revision) => result(revision, 'passed'), RECORD)
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.check()
    expect(f.run.mock.calls.map((call) => call.length)).toEqual([5])
  })

  it('drops an older record when a later failed run wrote none', async () => {
    const f = fixture(async (_spec, _files, revision) => result(revision, 'failed'), RECORD)
    f.watcher.changed(['/clinic/src/Calendar.tsx'])
    await f.watcher.check({ failedOnly: true })
    await f.watcher.check({ failedOnly: true })
    expect(f.run.mock.calls.map((call) => call.length)).toEqual([6, 5])
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
      run: (s, files, revision, emit, signal, lastRun) =>
        runPlaywrightFeedback(backend, s, files, revision, {
          command: (flags) => `${s.command} ${flags.join(' ')}`,
          emit,
          signal,
          foreground: true,
          ...(lastRun === undefined ? {} : { lastFailed: lastRun }),
        }),
    })
    // The host's own whole-file run, handed over with its record, establishes the failure.
    const at = watcher.revision()
    const failed = await runPlaywrightFeedback(backend, spec, [], at, {
      command: (flags) => `${spec.command} ${flags.join(' ')}`,
    })
    expect(failed.status).toBe('failed')
    watcher.record([failed], at)
    watcher.changed([join(root, 'src', 'Visits.tsx')])
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

  it('a known-failures checkpoint reports every recorded failure, not only the first', async () => {
    await state('broken')
    const pairContent = `import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const state = () => readFileSync(new URL('../state.txt', import.meta.url), 'utf8').trim();
test('opens the ward', async () => { expect(1).toBe(1) });
test('admits a patient', async () => { expect(state()).toBe('fixed') });
test('discharges a patient', async () => { expect(state()).toBe('fixed') });
`
    const pairPath = join(root, 'e2e', 'ward.spec.ts')
    await writeFile(pairPath, pairContent)
    const pair: FeedbackSpec = {
      ...spec,
      path: pairPath,
      content: pairContent,
      command: spec.command.replace('visits.spec.ts', 'ward.spec.ts'),
    }
    const runPair = (lastFailed?: string, foreground = true) =>
      runPlaywrightFeedback(backend, pair, [], 1, {
        command: (flags) => `${pair.command} ${flags.join(' ')}`,
        foreground,
        ...(lastFailed === undefined ? {} : { lastFailed }),
      })
    const failed = await runPair(undefined, false)
    expect(JSON.parse(failed.lastRun!).failedTests).toHaveLength(2)

    const known = await runPair(failed.lastRun)
    expect(known).toMatchObject({ status: 'failed', selection: 'last-failed' })
    expect(known.nativeStats).toMatchObject({ unexpected: 2, skipped: 0 })
    // Both recorded tests answer: the spec's lines 5 and 6.
    expect(known.failures.map((failure) => failure.line).sort()).toEqual([5, 6])

    // Counterexample: an explicit whole-file run still stops at its first failure.
    const whole = await runPair()
    expect(whole.selection).toBeUndefined()
    expect(whole.nativeStats).toMatchObject({ unexpected: 1 })
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
