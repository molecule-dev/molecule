// @vitest-environment jsdom
/**
 * Package smoke test — a port of `@molecule/app-admin-table-react`'s own smoke
 * test: the module imports without throwing.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

// The UI packages read the ClassMap at module scope, so a stand-in is needed
// before the package is imported — the same Proxy the React smoke test uses.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, property) =>
          typeof property === 'string' && property === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (...args: unknown[]) => `mock-${String(property)}-${args.join('-')}`,
      },
    ),
}))

describe('package smoke', () => {
  // The import pulls the framework's whole UI graph; under a loaded machine it
  // can take longer than the default 30 s.
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  }, 120_000)
})
