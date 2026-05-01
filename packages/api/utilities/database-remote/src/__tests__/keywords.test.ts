/**
 * Tests for the read-only SQL keyword sniff.
 */

import { describe, expect, it } from 'vitest'

import { isMutating } from '../keywords.js'

describe('isMutating', () => {
  it('passes plain SELECT', () => {
    expect(isMutating('SELECT * FROM users')).toBe(false)
  })

  it('passes SELECT with leading whitespace and lower-case', () => {
    expect(isMutating('   \n  select id from users')).toBe(false)
  })

  it('passes WITH (CTE)', () => {
    expect(isMutating('WITH t AS (SELECT 1) SELECT * FROM t')).toBe(false)
  })

  it('passes EXPLAIN, SHOW, DESCRIBE, PRAGMA', () => {
    expect(isMutating('EXPLAIN SELECT 1')).toBe(false)
    expect(isMutating('SHOW TABLES')).toBe(false)
    expect(isMutating('DESCRIBE users')).toBe(false)
    expect(isMutating('PRAGMA table_info(users)')).toBe(false)
  })

  it('rejects INSERT / UPDATE / DELETE', () => {
    expect(isMutating('INSERT INTO users (id) VALUES (1)')).toBe(true)
    expect(isMutating('update users set name = $1')).toBe(true)
    expect(isMutating('DELETE FROM users')).toBe(true)
  })

  it('rejects DDL', () => {
    expect(isMutating('CREATE TABLE foo (id INT)')).toBe(true)
    expect(isMutating('DROP TABLE foo')).toBe(true)
    expect(isMutating('ALTER TABLE foo ADD COLUMN bar INT')).toBe(true)
    expect(isMutating('TRUNCATE TABLE foo')).toBe(true)
  })

  it('rejects GRANT / REVOKE / VACUUM', () => {
    expect(isMutating('GRANT SELECT ON foo TO bar')).toBe(true)
    expect(isMutating('REVOKE SELECT ON foo FROM bar')).toBe(true)
    expect(isMutating('VACUUM')).toBe(true)
  })

  it('rejects mutators hidden behind line comments', () => {
    expect(isMutating('-- innocent\nDELETE FROM users')).toBe(true)
  })

  it('rejects mutators hidden behind block comments', () => {
    expect(isMutating('/* hi */ INSERT INTO t VALUES (1)')).toBe(true)
  })

  it('rejects unknown leading verbs (conservative default)', () => {
    expect(isMutating('FOO BAR BAZ')).toBe(true)
  })

  it('returns false for empty / whitespace-only input', () => {
    expect(isMutating('')).toBe(false)
    expect(isMutating('   ')).toBe(false)
    expect(isMutating('   --comment\n')).toBe(false)
  })
})
