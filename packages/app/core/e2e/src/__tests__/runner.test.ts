import type * as FS from 'node:fs'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SANDBOX_MARKER_PATH } from '../provider.js'
import { e2eRunnerDefaults } from '../runner.js'

// The sandbox marker lives at an absolute path this machine does not have; the
// tests that need "inside a sandbox" mock only that one existsSync answer.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof FS>()
  return { ...actual, existsSync: vi.fn(actual.existsSync) }
})

const { existsSync } = await import('node:fs')

const pretendSandbox = (inside: boolean): void => {
  vi.mocked(existsSync).mockImplementation((path) =>
    String(path) === SANDBOX_MARKER_PATH ? inside : false,
  )
}

describe('e2eRunnerDefaults', () => {
  let browsers: string

  beforeEach(() => {
    delete process.env['MOL_E2E_PROVIDER']
    delete process.env['CI']
    browsers = mkdtempSync(join(tmpdir(), 'mol-e2e-browsers-'))
    process.env['PLAYWRIGHT_BROWSERS_PATH'] = browsers
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env['PLAYWRIGHT_BROWSERS_PATH']
    delete process.env['MOL_E2E_PROVIDER']
    delete process.env['CI']
    rmSync(browsers, { recursive: true, force: true })
  })

  it('in a sandbox with a browser: half the cores, fully parallel, no retries, capped, 30 s', () => {
    pretendSandbox(true)
    mkdirSync(join(browsers, 'chromium_headless_shell-1200'))
    expect(e2eRunnerDefaults()).toEqual({
      workers: '50%',
      fullyParallel: true,
      retries: 0,
      maxFailures: 8,
      timeout: 30_000,
    })
  })

  it('in a sandbox with no browser (the preview bond): one worker, still no retries and capped', () => {
    pretendSandbox(true)
    expect(e2eRunnerDefaults()).toEqual({
      workers: 1,
      fullyParallel: false,
      retries: 0,
      maxFailures: 8,
      timeout: 30_000,
    })
  })

  it('MOL_E2E_PROVIDER=preview gives one worker even outside a sandbox', () => {
    pretendSandbox(false)
    process.env['MOL_E2E_PROVIDER'] = 'preview'
    const defaults = e2eRunnerDefaults()
    expect(defaults.workers).toBe(1)
    expect(defaults.fullyParallel).toBe(false)
  })

  it('on your machine: parallel, 1 retry, no failure cap, 60 s', () => {
    pretendSandbox(false)
    expect(e2eRunnerDefaults()).toEqual({
      workers: '50%',
      fullyParallel: true,
      retries: 1,
      maxFailures: 0,
      timeout: 60_000,
    })
  })

  it('under CI: 2 retries', () => {
    pretendSandbox(false)
    process.env['CI'] = 'true'
    expect(e2eRunnerDefaults().retries).toBe(2)
  })

  it("lets an app's own value win when spread first", () => {
    pretendSandbox(true)
    const config = { ...e2eRunnerDefaults(), timeout: 120_000 }
    expect(config.timeout).toBe(120_000)
    expect(config.maxFailures).toBe(8)
  })
})
