/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — against a real SQLite DataStore in a
 * temp dir, no mocks.
 *
 * @module
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setStore } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-sqlite'
import { exportCSV, importCSV, setProvider } from '@molecule/api-import-export'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalPath = process.env.SQLITE_PATH
  let dir = ''

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'import-export-csv-readme-'))
    process.env.SQLITE_PATH = join(dir, 'app.db')
    await pool.query(
      'CREATE TABLE contacts (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)',
    )
    await writeFile(
      join(dir, 'contacts.csv'),
      [
        'Full Name,email',
        'Grace Hopper,grace@example.com',
        'Not An Email,nope',
        'Ada Lovelace,ada@example.com',
      ].join('\n'),
    )
  })

  afterAll(async () => {
    await pool.end()
    if (originalPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = originalPath
    await rm(dir, { recursive: true, force: true })
  })

  it('imports an uploaded CSV into the DataStore and exports it back', async () => {
    setStore(store)
    setProvider(createProvider({ maxExportRows: 10000 }))

    const upload = await readFile(join(dir, 'contacts.csv'))
    const result = await importCSV('contacts', upload, {
      mapping: { 'Full Name': 'name' },
      validateRow: (row) => String(row.email).includes('@'),
      skipDuplicates: true,
    })
    expect(result).toMatchObject({ totalRows: 3, importedRows: 2, skippedRows: 1, errors: [] })
    expect(typeof result.jobId).toBe('string')

    const csv = await exportCSV('contacts', {
      columns: ['name', 'email'],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    expect(csv.toString()).toBe(
      'name,email\nAda Lovelace,ada@example.com\nGrace Hopper,grace@example.com',
    )

    // Re-importing the same file: unique violations are skipped, not errors.
    const again = await importCSV('contacts', upload, {
      mapping: { 'Full Name': 'name' },
      validateRow: (row) => String(row.email).includes('@'),
      skipDuplicates: true,
    })
    expect(again).toMatchObject({ importedRows: 0, skippedRows: 3, errors: [] })
  })
})
