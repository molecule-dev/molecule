/**
 * D1's declaration must be complete, and its SUPPORT values must match the
 * SQLite bond's — D1 is SQLite, so a value that drifts would either refuse a
 * supported D1 selection or promise one the engine cannot honour. The notes are
 * provider-specific (D1 applies schema out of band), so the map is not a
 * re-export.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { sqlCapabilities as sqliteCapabilities } from '@molecule/api-database-sqlite'

import { sqlCapabilities } from '../capabilities.js'

/** The compatibility vocabulary (the core subpath is types-only by design). */
const SQL_FEATURES = ['fk-referential-action', 'partial-index', 'unique-partial-index'] as const

describe('sqlCapabilities (d1)', () => {
  it('declares every SQL feature the contract defines', () => {
    expect(Object.keys(sqlCapabilities).sort()).toEqual([...SQL_FEATURES].sort())
  })

  it('matches the SQLite bond on every support value (D1 is SQLite)', () => {
    for (const feature of SQL_FEATURES) {
      expect(sqlCapabilities[feature]?.support).toBe(sqliteCapabilities[feature]?.support)
    }
  })

  it('gives every declaration a provider-specific note, not the sqlite bond sentence', () => {
    for (const feature of SQL_FEATURES) {
      const note = sqlCapabilities[feature]?.note ?? ''
      expect(note.length).toBeGreaterThan(20)
      expect(note).not.toBe(sqliteCapabilities[feature]?.note)
    }
  })
})
