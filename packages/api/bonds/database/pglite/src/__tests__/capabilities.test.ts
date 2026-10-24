/**
 * The capability declaration must cover every SQL feature the shared contract
 * knows about — an omitted key is treated as missing metadata by the generator's
 * preflight, which refuses the selection rather than assuming support.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { sqlCapabilities } from '../capabilities.js'

/** The compatibility vocabulary (the core subpath is types-only by design). */
const SQL_FEATURES = ['fk-referential-action', 'partial-index', 'unique-partial-index'] as const

describe('sqlCapabilities (pglite)', () => {
  it('declares every SQL feature the contract defines', () => {
    expect(Object.keys(sqlCapabilities).sort()).toEqual([...SQL_FEATURES].sort())
  })

  it('declares the three constructs native — PGlite is PostgreSQL', () => {
    for (const feature of SQL_FEATURES) {
      expect(sqlCapabilities[feature]?.support).toBe('native')
    }
  })

  it('gives every declaration a non-empty provider note', () => {
    for (const feature of SQL_FEATURES) {
      expect((sqlCapabilities[feature]?.note ?? '').length).toBeGreaterThan(20)
    }
  })
})
