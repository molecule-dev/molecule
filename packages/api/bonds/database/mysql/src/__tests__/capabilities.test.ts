/**
 * MySQL's declaration must be complete, and the bond must AGREE with it: the
 * map says a UNIQUE partial index is unsupported, so the translator has to
 * refuse it (with the same explanation) before rewriting anything. A declaration
 * without the refusal is how the old translator silently widened the constraint.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { sqlCapabilities } from '../capabilities.js'
import { translateDdlToMysql } from '../utilities.js'

const PAYMENT_METHODS = `CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"
  ON "payment_methods" ("userId") WHERE "isDefault" = true;`

/** The compatibility vocabulary (the core subpath is types-only by design). */
const SQL_FEATURES = ['fk-referential-action', 'partial-index', 'unique-partial-index'] as const

describe('sqlCapabilities (mysql)', () => {
  it('declares every SQL feature the contract defines', () => {
    expect(Object.keys(sqlCapabilities).sort()).toEqual([...SQL_FEATURES].sort())
  })

  it('declares referential actions native and partial indexes translated', () => {
    expect(sqlCapabilities['fk-referential-action']?.support).toBe('native')
    expect(sqlCapabilities['partial-index']?.support).toBe('translated')
  })

  it('declares a UNIQUE partial index unsupported', () => {
    expect(sqlCapabilities['unique-partial-index']?.support).toBe('unsupported')
  })

  it('the translator refuses what the declaration marks unsupported, with its note', () => {
    expect(() => translateDdlToMysql(PAYMENT_METHODS, { source: 'payment_methods.sql' })).toThrow(
      /payment_methods\.sql/,
    )
    const note = sqlCapabilities['unique-partial-index']?.note ?? ''
    expect(note.length).toBeGreaterThan(20)
    expect(() => translateDdlToMysql(PAYMENT_METHODS)).toThrowError(note)
  })
})
