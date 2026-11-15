/**
 * A run stopped before it finished records exactly the tests it saw fail, in the runner's own
 * last-run shape, so a later selection re-runs them alone. Every record handed to
 * `--last-failed` names whole serial groups, so a group's later test never runs without the
 * earlier ones.
 */
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { runPlaywrightFeedback } from '../playwright-feedback.js'
import type { FeedbackSpec } from '../playwright-feedback-types.js'
import { shellQuote } from '../utilities.js'

const ids = (text: string | undefined) =>
  (JSON.parse(text!) as { failedTests: string[] }).failedTests

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
  /** A run stopped at its first failure, the way an abort stops one. */
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

  it('a stopped run names the test it saw fail, and it alone runs next', async () => {
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
    expect(stopped.tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'passed', startedAfter: expect.any(Number) }),
        expect.objectContaining({ status: 'failed' }),
      ]),
    )
    expect(stopped.selectedTests).toHaveLength(3)
    expect(stopped.passedTests).toHaveLength(1)
    // The record names the failed test alone — never one that already passed.
    expect(ids(stopped.lastRun)).toHaveLength(1)
    expect(ids(stopped.lastRun)).not.toContain(stopped.passedTests![0])

    await state('fixed')
    const rest = await selective(spec, stopped.lastRun!)
    expect(rest).toMatchObject({ status: 'passed', selection: 'last-failed' })
    expect(rest.nativeStats).toMatchObject({ expected: 1, unexpected: 0 })
    expect(rest.passedTests).toEqual(ids(stopped.lastRun))
  }, 60_000)

  it('records an expected failure as a completed test, without a failure diagnosis', async () => {
    const spec = await file(
      'expected.spec.ts',
      `${header}test('known unsupported feature', () => {test.fail(); expect(false).toBe(true)})`,
    )
    const completed = await runPlaywrightFeedback(backend, spec, [], 1, {
      command: (flags) => `${spec.command} ${flags.join(' ')}`,
    })
    expect(completed.status).toBe('passed')
    expect(completed.tests).toHaveLength(1)
    expect(completed.tests![0].status).toBe('passed')
    expect(completed.selectedTests).toEqual(completed.tests!.map((test) => test.id))
    expect(completed.failures).toEqual([])
  })

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
