/**
 * MotherDuck runs DuckDB, so its SQL capability declaration must be the DuckDB
 * bond's — not a second copy that can drift.
 */
import { describe, expect, it } from 'vitest'

import { sqlCapabilities as duckdbCapabilities } from '@molecule/api-database-duckdb/capabilities.js'

import { sqlCapabilities } from '../capabilities.js'

describe('sqlCapabilities', () => {
  it('is the DuckDB bond declaration (same engine, one source of truth)', () => {
    expect(sqlCapabilities).toBe(duckdbCapabilities)
  })

  it('refuses referential actions and translates partial indexes', () => {
    expect(sqlCapabilities['fk-referential-action']?.support).toBe('unsupported')
    expect(sqlCapabilities['partial-index']?.support).toBe('translated')
    expect(sqlCapabilities['unique-partial-index']?.support).toBe('translated')
  })
})
