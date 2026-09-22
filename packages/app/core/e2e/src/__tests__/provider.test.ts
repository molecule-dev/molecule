import type * as FS from 'node:fs'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbondAll } from '@molecule/app-bond'

import {
  getProvider,
  hasInstalledBrowser,
  hasProvider,
  isMoleculeSandbox,
  playwrightBrowsersPath,
  requireProvider,
  resolveE2EProviderName,
  SANDBOX_MARKER_PATH,
  setProvider,
} from '../provider.js'
import type { E2EProvider } from '../types.js'

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

describe('the e2e bond accessor', () => {
  let browsers: string

  beforeEach(() => {
    unbondAll('e2e')
    delete process.env['MOL_E2E_PROVIDER']
    delete process.env['PLAYWRIGHT_BROWSERS_PATH']
    browsers = mkdtempSync(join(tmpdir(), 'mol-e2e-browsers-'))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(browsers, { recursive: true, force: true })
  })

  it('reports no provider until one is bonded, then returns it', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
    expect(() => requireProvider()).toThrow(/e2e\/bonds\.ts/)
    const provider: E2EProvider = { name: 'fake', connect: async () => ({}) as never }
    setProvider(provider)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(provider)
  })

  it('MOL_E2E_PROVIDER wins over everything', () => {
    pretendSandbox(true)
    process.env['MOL_E2E_PROVIDER'] = 'playwright'
    expect(resolveE2EProviderName()).toBe('playwright')
    process.env['MOL_E2E_PROVIDER'] = 'preview'
    expect(resolveE2EProviderName()).toBe('preview')
  })

  it('defaults to playwright outside a sandbox', () => {
    pretendSandbox(false)
    expect(isMoleculeSandbox()).toBe(false)
    expect(resolveE2EProviderName()).toBe('playwright')
  })

  it('looks for browsers under PLAYWRIGHT_BROWSERS_PATH, else ~/.cache/ms-playwright', () => {
    expect(playwrightBrowsersPath()).toMatch(/[\\/]\.cache[\\/]ms-playwright$/)
    process.env['PLAYWRIGHT_BROWSERS_PATH'] = browsers
    expect(playwrightBrowsersPath()).toBe(browsers)
    expect(hasInstalledBrowser()).toBe(false)
    mkdirSync(join(browsers, 'chromium_headless_shell-1200'))
    expect(hasInstalledBrowser()).toBe(true)
    process.env['PLAYWRIGHT_BROWSERS_PATH'] = '0'
    expect(playwrightBrowsersPath()).toMatch(/ms-playwright$/)
  })

  it('inside a sandbox picks playwright when a browser is installed and preview when none is', () => {
    pretendSandbox(true)
    process.env['PLAYWRIGHT_BROWSERS_PATH'] = browsers
    expect(isMoleculeSandbox()).toBe(true)
    expect(resolveE2EProviderName()).toBe('preview')
    mkdirSync(join(browsers, 'chromium-1200'))
    expect(resolveE2EProviderName()).toBe('playwright')
  })
})
