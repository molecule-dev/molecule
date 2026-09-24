/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the database bond. Only the
 * `@molecule/api-database` DataStore (the database) is mocked — with a tiny
 * in-memory table — the same way the bond's own tests mock it.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>

const { table } = vi.hoisted(() => ({ table: [] as Record<string, unknown>[] }))

vi.mock('@molecule/api-database', () => {
  const matches = (
    row: Row,
    where?: { field: string; operator: string; value: unknown }[],
  ): boolean =>
    (where ?? []).every((w) =>
      w.operator === 'in'
        ? Array.isArray(w.value) && w.value.includes(row[w.field])
        : row[w.field] === w.value,
    )
  return {
    findMany: vi.fn(
      async (
        _table: string,
        options: { where?: { field: string; operator: string; value: unknown }[] } = {},
      ) => table.filter((row) => matches(row, options.where)),
    ),
    create: vi.fn(async (_table: string, data: Row) => {
      table.push({ ...data })
      return { data, affected: 1 }
    }),
    updateById: vi.fn(async (_table: string, id: string, data: Row) => {
      const row = table.find((r) => r.id === id)
      if (row) Object.assign(row, data)
      return { data: row ?? null, affected: row ? 1 : 0 }
    }),
    deleteById: vi.fn(async () => ({ data: null, affected: 1 })),
  }
})

import { provider } from '@molecule/api-feature-flags-database'

import { evaluateForUser, isEnabled, setFlag, setProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the database provider, rolls a flag out per user and fails closed on unknown flags', async () => {
    setProvider(provider)

    const flag = await setFlag({ name: 'new-dashboard', enabled: true, percentage: 50 })
    expect(flag).toMatchObject({ name: 'new-dashboard', enabled: true, percentage: 50 })
    expect(table).toHaveLength(1)

    const showDashboard = await isEnabled('new-dashboard', { userId: 'user-123' })
    expect(showDashboard).toBe(true)
    // Sticky and deterministic: another user lands outside the 50% bucket.
    expect(await isEnabled('new-dashboard', { userId: 'user-456' })).toBe(false)

    const flags = await evaluateForUser('user-123')
    expect(flags).toEqual({ 'new-dashboard': true })

    const unknown = await isEnabled('does-not-exist', { userId: 'user-123' })
    expect(unknown).toBe(false)
  })
})
