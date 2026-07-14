/**
 * Tests for the SERVER-ONLY browser guard.
 *
 * The guard must throw ONLY when browser globals (`window` + `document`) are
 * present AND there is no node runtime — so real browser bundles trip it
 * while node, jsdom tests, and SSR stay unaffected.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser-guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('is inert in a plain node runtime (no browser globals)', async () => {
    vi.resetModules()

    await expect(import('../browser-guard.js')).resolves.toBeDefined()
  })

  it('is inert under jsdom/SSR (browser globals + node runtime)', async () => {
    vi.resetModules()
    vi.stubGlobal('window', {})
    vi.stubGlobal('document', {})

    await expect(import('../browser-guard.js')).resolves.toBeDefined()
  })

  it('throws a self-naming error in a browser bundle (browser globals, no node)', async () => {
    vi.resetModules()
    vi.stubGlobal('window', {})
    vi.stubGlobal('document', {})
    vi.stubGlobal('process', { versions: {} })

    await expect(import('../browser-guard.js')).rejects.toThrow(
      /@molecule\/api-external-auth-supabase is SERVER-ONLY/,
    )
  })
})
