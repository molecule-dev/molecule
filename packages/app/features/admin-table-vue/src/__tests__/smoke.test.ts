/**
 * Package smoke test — a port of `@molecule/app-admin-table-react`'s own smoke
 * test: the module imports without throwing.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

describe('package smoke', () => {
  // The import pulls the framework's whole UI graph; under a loaded machine it
  // can take longer than the default 30 s.
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  }, 120_000)
})
