// @vitest-environment jsdom
/**
 * Package smoke test — a port of the React package's own smoke test: the
 * module imports without throwing. The ClassMap bond is stubbed because the
 * peer UI package resolves class tokens at module load.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, p) =>
          typeof p === 'string' && p === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (...args: unknown[]) => `mock-${String(p)}-${args.join('-')}`,
      },
    ),
}))

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
