import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { describe, expect, it, vi } from 'vitest'

// `react-router/dom` is the package's only path to `react-dom`; make it unloadable.
vi.mock('react-router/dom', () => {
  throw new Error('react-dom is not installed')
})

describe('main entry without react-dom', () => {
  it('imports, as 1.1.3 did, when react-router/dom cannot load', async () => {
    const entry = await import('../index.js')

    expect(typeof entry.BrowserRouter).toBe('function')
    expect(typeof entry.RouterProvider).toBe('function')
    expect(typeof entry.lazyPage).toBe('function')
  })

  it('keeps the DOM provider behind the /dom entry', async () => {
    await expect(import('../dom.js')).rejects.toThrow()
  })

  it('relies on a react-router main entry that does not import react-dom', () => {
    const require = createRequire(import.meta.url)
    const main = readFileSync(require.resolve('react-router'), 'utf8')

    expect(main).not.toMatch(/(?:from|require\()\s*["']react-dom(?:\/[^"']*)?["']/)
  })
})
