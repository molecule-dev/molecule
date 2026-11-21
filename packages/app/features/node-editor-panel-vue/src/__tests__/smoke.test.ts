// @vitest-environment jsdom
/**
 * Package smoke test — a port of the React package's own smoke test: the
 * module imports without throwing.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
