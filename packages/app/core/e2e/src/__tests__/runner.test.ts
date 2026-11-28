import type * as FS from 'node:fs'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SANDBOX_MARKER_PATH } from '../provider.js'
import { DEV_SERVER_TIMEOUT_MS, e2eDevServers, e2eRunnerDefaults } from '../runner.js'

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

  it('in a sandbox with a browser: two workers, fully parallel, no retries, capped, 30 s', () => {
    pretendSandbox(true)
    mkdirSync(join(browsers, 'chromium_headless_shell-1200'))
    expect(e2eRunnerDefaults()).toEqual({
      workers: 2,
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

  // A run on your machine is a feedback loop, as it is in a sandbox: a retry doubled the time a
  // failing spec took to report (a coding agent's first failing run took 114 s and it reran with
  // --retries=0 itself) and passes a flaky test without saying so. Playwright's own config does
  // the same: `retries: process.env.CI ? 2 : 0`.
  it('on your machine: parallel, no retries, no failure cap, 60 s', () => {
    pretendSandbox(false)
    expect(e2eRunnerDefaults()).toEqual({
      workers: '50%',
      fullyParallel: true,
      retries: 0,
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

describe('e2eDevServers', () => {
  let project: string
  const write = (dir: string, scripts: Record<string, string>): void => {
    mkdirSync(join(project, dir), { recursive: true })
    writeFileSync(join(project, dir, 'package.json'), JSON.stringify({ scripts }))
  }

  beforeEach(() => {
    pretendSandbox(false)
    for (const key of ['MOL_E2E_PROVIDER', 'APP_BASE', 'VITE_PORT', 'PORT', 'VITE_API_URL'])
      delete process.env[key]
    project = mkdtempSync(join(tmpdir(), 'mol-e2e-project-'))
    write('app', { dev: 'vite' })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    for (const key of ['MOL_E2E_PROVIDER', 'APP_BASE', 'VITE_PORT', 'PORT', 'VITE_API_URL'])
      delete process.env[key]
    rmSync(project, { recursive: true, force: true })
  })

  it('starts the API the app proxies to, then the app, reusing either when it already runs', () => {
    // Without them every spec failed on a server nobody started, and agents started it by hand.
    write('api', { dev: 'tsx watch src/server.ts' })
    process.env['VITE_PORT'] = '3100'
    expect(e2eDevServers(join(project, 'app'))).toEqual([
      {
        command: 'npm run dev',
        cwd: join(project, 'app', '..', 'api'),
        url: 'http://localhost:4000/health',
        reuseExistingServer: true,
        timeout: DEV_SERVER_TIMEOUT_MS,
      },
      {
        command: 'npm run dev',
        cwd: join(project, 'app'),
        url: 'http://localhost:3100',
        reuseExistingServer: true,
        timeout: DEV_SERVER_TIMEOUT_MS,
      },
    ])
  })

  it('starts the app alone when there is no API beside it, or the API is remote', () => {
    expect(e2eDevServers(join(project, 'app')).map((s) => s.url)).toEqual(['http://localhost:3000'])
    write('api', { dev: 'tsx watch src/server.ts' })
    process.env['VITE_API_URL'] = 'https://api.example.com/api'
    expect(e2eDevServers(join(project, 'app')).map((s) => s.url)).toEqual(['http://localhost:3000'])
  })

  it('starts nothing over the preview, inside a sandbox, for APP_BASE, or without a dev script', () => {
    process.env['MOL_E2E_PROVIDER'] = 'preview'
    expect(e2eDevServers(join(project, 'app'))).toEqual([])
    delete process.env['MOL_E2E_PROVIDER']
    process.env['APP_BASE'] = 'http://localhost:9999'
    expect(e2eDevServers(join(project, 'app'))).toEqual([])
    delete process.env['APP_BASE']
    expect(e2eDevServers(project)).toEqual([])
    pretendSandbox(true)
    expect(e2eDevServers(join(project, 'app'))).toEqual([])
  })
})
