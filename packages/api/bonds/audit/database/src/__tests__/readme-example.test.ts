/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { log, query, setProvider } from '@molecule/api-audit'
import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { createProvider } from '../index.js'

const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

describe('README @example', () => {
  it('writes the audit row through the DataStore and reads it back newest-first', async () => {
    fakeStore.create.mockResolvedValueOnce({ data: null, affected: 1 })
    fakeStore.findMany.mockResolvedValueOnce([
      {
        id: 'a-1',
        actor: 'user:123',
        action: 'project.delete',
        resource: 'project',
        resource_id: 'proj-42',
        details: '{"name":"Old site"}',
        ip: '203.0.113.7',
        user_agent: null,
        timestamp: '2026-09-24T12:00:00.000Z',
      },
    ])
    fakeStore.count.mockResolvedValueOnce(1)

    setStore(store)
    setProvider(createProvider({ tableName: 'audit_log' }))

    await log({
      actor: 'user:123',
      action: 'project.delete',
      resource: 'project',
      resourceId: 'proj-42',
      details: { name: 'Old site' },
      ip: '203.0.113.7',
    })

    const recent = await query({ actor: 'user:123', page: 1, perPage: 20 })

    expect(fakeStore.create).toHaveBeenCalledWith('audit_log', {
      id: expect.any(String),
      actor: 'user:123',
      action: 'project.delete',
      resource: 'project',
      resource_id: 'proj-42',
      details: '{"name":"Old site"}',
      ip: '203.0.113.7',
      user_agent: null,
      timestamp: expect.any(String),
    })
    expect(fakeStore.findMany).toHaveBeenCalledWith('audit_log', {
      where: [{ field: 'actor', operator: '=', value: 'user:123' }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
      limit: 20,
      offset: 0,
    })
    expect(recent).toEqual({
      data: [
        {
          id: 'a-1',
          actor: 'user:123',
          action: 'project.delete',
          resource: 'project',
          resourceId: 'proj-42',
          details: { name: 'Old site' },
          ip: '203.0.113.7',
          timestamp: new Date('2026-09-24T12:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
    })
  })
})
