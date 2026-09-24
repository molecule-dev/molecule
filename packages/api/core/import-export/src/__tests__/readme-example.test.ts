/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the CSV bond. Only the
 * `@molecule/api-database` DataStore (the database) is mocked — with a tiny
 * in-memory table — the same way the bond's own tests mock it.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
interface Where {
  field: string
  operator: string
  value: unknown
}

const { table, findManyCalls } = vi.hoisted(() => ({
  table: [] as Record<string, unknown>[],
  findManyCalls: [] as unknown[],
}))

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async (_table: string, data: Row) => {
    table.push({ ...data })
    return { data, affected: 1 }
  }),
  findMany: vi.fn(
    async (
      tableName: string,
      options: { where?: Where[]; select?: string[]; orderBy?: { field: string }[] } = {},
    ) => {
      findManyCalls.push({ tableName, ...options })
      const rows = table.filter((row) =>
        (options.where ?? []).every((w) => w.operator === '=' && row[w.field] === w.value),
      )
      const sortField = options.orderBy?.[0]?.field
      if (sortField) rows.sort((a, b) => String(a[sortField]).localeCompare(String(b[sortField])))
      const select = options.select
      return select ? rows.map((row) => Object.fromEntries(select.map((c) => [c, row[c]]))) : rows
    },
  ),
}))

import { createProvider } from '@molecule/api-import-export-csv'

import { exportCSV, getJobStatus, importCSV, setProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the CSV provider, imports with mapping + validation and exports filtered CSV', async () => {
    setProvider(createProvider({ maxExportRows: 10_000 }))

    const upload = Buffer.from(
      'Full Name,Email Address,Plan\nAda Lovelace,ada@example.com,pro\nNo Email,,free\n',
    )
    const result = await importCSV('contacts', upload, {
      mapping: { 'Full Name': 'name', 'Email Address': 'email', Plan: 'plan' },
      validateRow: (row) => typeof row.email === 'string' && row.email.includes('@'),
      skipDuplicates: true,
    })
    expect(result).toMatchObject({ totalRows: 2, importedRows: 1, skippedRows: 1, errors: [] })
    expect(table).toEqual([{ name: 'Ada Lovelace', email: 'ada@example.com', plan: 'pro' }])

    const job = await getJobStatus(result.jobId)
    expect(job).toEqual({ jobId: result.jobId, status: 'completed', result })

    const csv = await exportCSV('contacts', {
      filters: [{ field: 'plan', operator: 'eq', value: 'pro' }],
      columns: ['name', 'email'],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    expect(csv.toString('utf-8')).toBe('name,email\nAda Lovelace,ada@example.com')
    expect(findManyCalls[0]).toMatchObject({
      tableName: 'contacts',
      where: [{ field: 'plan', operator: '=', value: 'pro' }],
      limit: 10_000,
    })
  })
})
