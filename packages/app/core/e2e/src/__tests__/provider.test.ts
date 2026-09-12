import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbondAll } from '@molecule/app-bond'

import {
  getProvider,
  hasProvider,
  requireProvider,
  resolveE2EProviderName,
  setProvider,
} from '../provider.js'
import type { E2EProvider } from '../types.js'

describe('the e2e bond accessor', () => {
  beforeEach(() => {
    unbondAll('e2e')
    delete process.env['MOL_E2E_PROVIDER']
  })
  afterEach(() => {
    vi.restoreAllMocks()
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

  it('MOL_E2E_PROVIDER wins over the sandbox marker', () => {
    process.env['MOL_E2E_PROVIDER'] = 'playwright'
    expect(resolveE2EProviderName()).toBe('playwright')
    process.env['MOL_E2E_PROVIDER'] = 'preview'
    expect(resolveE2EProviderName()).toBe('preview')
  })

  it('defaults to playwright outside a sandbox', () => {
    // This machine is not a molecule sandbox: no /etc/mol/app-root.
    expect(['playwright', 'preview']).toContain(resolveE2EProviderName())
  })
})
