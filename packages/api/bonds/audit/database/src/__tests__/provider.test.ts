import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuditRecord, PaginatedResult } from '@molecule/api-audit'

vi.mock('@molecule/api-database', () => {
  const store = {
    create: vi.fn().mockResolvedValue({ data: null, affected: 1 }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  }
  return store
})

import * as db from '@molecule/api-database'

import { createProvider } from '../provider.js'

const mockCreate = vi.mocked(db.create)
const mockFindMany = vi.mocked(db.findMany)
const mockCount = vi.mocked(db.count)

describe('database audit provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-1' as ReturnType<typeof crypto.randomUUID>)
  })

  describe('log', () => {
    it('should insert an audit entry into the database', async () => {
      const provider = createProvider()

      await provider.log({
        actor: 'user:1',
        action: 'create',
        resource: 'project',
        resourceId: 'proj-42',
        details: { name: 'My Project' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      })

      expect(mockCreate).toHaveBeenCalledWith('audit_log', {
        id: 'uuid-1',
        actor: 'user:1',
        action: 'create',
        resource: 'project',
        resource_id: 'proj-42',
        details: '{"name":"My Project"}',
        ip: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        timestamp: expect.any(String),
      })
    })

    it('should use custom table name from config', async () => {
      const provider = createProvider({ tableName: 'custom_audit' })

      await provider.log({ actor: 'user:1', action: 'login', resource: 'session' })

      expect(mockCreate).toHaveBeenCalledWith('custom_audit', expect.any(Object))
    })

    it('should store null for optional fields when not provided', async () => {
      const provider = createProvider()

      await provider.log({ actor: 'user:1', action: 'login', resource: 'session' })

      expect(mockCreate).toHaveBeenCalledWith(
        'audit_log',
        expect.objectContaining({
          resource_id: null,
          details: null,
          ip: null,
          user_agent: null,
        }),
      )
    })
  })

  describe('query', () => {
    it('should return paginated results', async () => {
      const row = {
        id: 'rec-1',
        actor: 'user:1',
        action: 'create',
        resource: 'project',
        resource_id: null,
        details: null,
        ip: null,
        user_agent: null,
        timestamp: '2025-01-01T00:00:00.000Z',
      }
      mockFindMany.mockResolvedValue([row])
      mockCount.mockResolvedValue(1)

      const provider = createProvider()
      const result: PaginatedResult<AuditRecord> = await provider.query({
        actor: 'user:1',
        page: 1,
        perPage: 10,
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('rec-1')
      expect(result.data[0].actor).toBe('user:1')
      expect(result.data[0].timestamp).toBeInstanceOf(Date)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.perPage).toBe(10)
      expect(result.totalPages).toBe(1)
    })

    it('should apply all query filters', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const provider = createProvider()
      const start = new Date('2025-01-01')
      const end = new Date('2025-12-31')

      await provider.query({
        actor: 'user:1',
        action: 'create',
        resource: 'project',
        resourceId: 'proj-42',
        startDate: start,
        endDate: end,
        page: 2,
        perPage: 5,
      })

      expect(mockFindMany).toHaveBeenCalledWith('audit_log', {
        where: [
          { field: 'actor', operator: '=', value: 'user:1' },
          { field: 'action', operator: '=', value: 'create' },
          { field: 'resource', operator: '=', value: 'project' },
          { field: 'resource_id', operator: '=', value: 'proj-42' },
          { field: 'timestamp', operator: '>=', value: start.toISOString() },
          { field: 'timestamp', operator: '<=', value: end.toISOString() },
        ],
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: 5,
        offset: 5,
      })
    })

    it('should use default pagination when not specified', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const provider = createProvider()
      const result = await provider.query({})

      expect(result.page).toBe(1)
      expect(result.perPage).toBe(20)
      expect(mockFindMany).toHaveBeenCalledWith(
        'audit_log',
        expect.objectContaining({ limit: 20, offset: 0 }),
      )
    })

    it('should deserialize details JSON', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'rec-1',
          actor: 'user:1',
          action: 'update',
          resource: 'project',
          resource_id: 'proj-42',
          details: '{"field":"name","old":"A","new":"B"}',
          ip: '10.0.0.1',
          user_agent: 'TestAgent',
          timestamp: '2025-06-15T12:00:00.000Z',
        },
      ])
      mockCount.mockResolvedValue(1)

      const provider = createProvider()
      const result = await provider.query({})

      expect(result.data[0].details).toEqual({ field: 'name', old: 'A', new: 'B' })
      expect(result.data[0].resourceId).toBe('proj-42')
      expect(result.data[0].ip).toBe('10.0.0.1')
      expect(result.data[0].userAgent).toBe('TestAgent')
    })
  })

  describe('export', () => {
    const sampleRow = {
      id: 'rec-1',
      actor: 'user:1',
      action: 'create',
      resource: 'project',
      resource_id: null,
      details: null,
      ip: null,
      user_agent: null,
      timestamp: '2025-01-01T00:00:00.000Z',
    }

    it('should export as JSON', async () => {
      mockFindMany.mockResolvedValue([sampleRow])

      const provider = createProvider()
      const buf = await provider.export({}, 'json')
      const parsed = JSON.parse(buf.toString()) as AuditRecord[]

      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe('rec-1')
    })

    it('should export as CSV', async () => {
      mockFindMany.mockResolvedValue([sampleRow])

      const provider = createProvider()
      const buf = await provider.export({}, 'csv')
      const csv = buf.toString()
      const lines = csv.split('\n')

      expect(lines[0]).toBe('id,actor,action,resource,resourceId,details,ip,userAgent,timestamp')
      expect(lines).toHaveLength(2)
      expect(lines[1]).toContain('rec-1')
      expect(lines[1]).toContain('user:1')
    })

    it('should escape CSV values containing commas and quotes', async () => {
      mockFindMany.mockResolvedValue([
        {
          ...sampleRow,
          details: '{"key":"value, with comma"}',
          user_agent: 'Agent "Special"',
        },
      ])

      const provider = createProvider()
      const buf = await provider.export({}, 'csv')
      const csv = buf.toString()

      expect(csv).toContain('"')
    })

    it('should return empty results when no records match', async () => {
      mockFindMany.mockResolvedValue([])

      const provider = createProvider()

      const jsonBuf = await provider.export({}, 'json')
      expect(JSON.parse(jsonBuf.toString())).toEqual([])

      const csvBuf = await provider.export({}, 'csv')
      const csvLines = csvBuf.toString().split('\n')
      expect(csvLines).toHaveLength(1) // headers only
    })
  })
})
