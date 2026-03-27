import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { AuditRecord, PaginatedResult } from '@molecule/api-audit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

describe('file audit provider', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'audit-test-'))
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-1' as ReturnType<typeof crypto.randomUUID>)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('log', () => {
    it('should write an audit entry as NDJSON', async () => {
      const provider = createProvider({ directory: tempDir })

      await provider.log({
        actor: 'user:1',
        action: 'create',
        resource: 'project',
        resourceId: 'proj-42',
        details: { name: 'My Project' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      const content = await readFile(filePath, 'utf-8')
      const record = JSON.parse(content.trim())

      expect(record.id).toBe('uuid-1')
      expect(record.actor).toBe('user:1')
      expect(record.action).toBe('create')
      expect(record.resource).toBe('project')
      expect(record.resourceId).toBe('proj-42')
      expect(record.details).toEqual({ name: 'My Project' })
      expect(record.ip).toBe('127.0.0.1')
      expect(record.userAgent).toBe('Mozilla/5.0')
      expect(record.timestamp).toBeDefined()
    })

    it('should append multiple entries to the same file', async () => {
      const provider = createProvider({ directory: tempDir })

      await provider.log({ actor: 'user:1', action: 'create', resource: 'project' })

      vi.mocked(crypto.randomUUID).mockReturnValue('uuid-2' as ReturnType<typeof crypto.randomUUID>)

      await provider.log({ actor: 'user:2', action: 'delete', resource: 'project' })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      const content = await readFile(filePath, 'utf-8')
      const lines = content.trim().split('\n')

      expect(lines).toHaveLength(2)
    })

    it('should not include optional fields when not provided', async () => {
      const provider = createProvider({ directory: tempDir })

      await provider.log({ actor: 'user:1', action: 'login', resource: 'session' })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      const content = await readFile(filePath, 'utf-8')
      const record = JSON.parse(content.trim())

      expect(record.resourceId).toBeUndefined()
      expect(record.details).toBeUndefined()
      expect(record.ip).toBeUndefined()
      expect(record.userAgent).toBeUndefined()
    })

    it('should use custom file prefix', async () => {
      const provider = createProvider({ directory: tempDir, filePrefix: 'custom' })

      await provider.log({ actor: 'user:1', action: 'login', resource: 'session' })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `custom-${date}.ndjson`)
      const content = await readFile(filePath, 'utf-8')
      expect(content.trim()).toBeTruthy()
    })
  })

  describe('query', () => {
    it('should return paginated results', async () => {
      const provider = createProvider({ directory: tempDir })

      // Write records directly
      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      const records = Array.from({ length: 5 }, (_, i) =>
        JSON.stringify({
          id: `rec-${i}`,
          actor: 'user:1',
          action: 'create',
          resource: 'project',
          timestamp: new Date(2025, 0, 1, 0, 0, i).toISOString(),
        }),
      )
      await writeFile(filePath, records.join('\n') + '\n', 'utf-8')

      const result: PaginatedResult<AuditRecord> = await provider.query({
        page: 1,
        perPage: 2,
      })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(5)
      expect(result.page).toBe(1)
      expect(result.perPage).toBe(2)
      expect(result.totalPages).toBe(3)
    })

    it('should filter by actor', async () => {
      const provider = createProvider({ directory: tempDir })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      const lines = [
        JSON.stringify({
          id: 'r1',
          actor: 'user:1',
          action: 'create',
          resource: 'project',
          timestamp: '2025-01-01T00:00:00Z',
        }),
        JSON.stringify({
          id: 'r2',
          actor: 'user:2',
          action: 'create',
          resource: 'project',
          timestamp: '2025-01-01T00:01:00Z',
        }),
      ]
      await writeFile(filePath, lines.join('\n') + '\n', 'utf-8')

      const result = await provider.query({ actor: 'user:1' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].actor).toBe('user:1')
    })

    it('should filter by date range', async () => {
      const provider = createProvider({ directory: tempDir })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      const lines = [
        JSON.stringify({
          id: 'r1',
          actor: 'u1',
          action: 'a',
          resource: 'r',
          timestamp: '2025-01-01T00:00:00Z',
        }),
        JSON.stringify({
          id: 'r2',
          actor: 'u1',
          action: 'a',
          resource: 'r',
          timestamp: '2025-06-15T00:00:00Z',
        }),
        JSON.stringify({
          id: 'r3',
          actor: 'u1',
          action: 'a',
          resource: 'r',
          timestamp: '2025-12-31T00:00:00Z',
        }),
      ]
      await writeFile(filePath, lines.join('\n') + '\n', 'utf-8')

      const result = await provider.query({
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-09-01'),
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('r2')
    })

    it('should return empty results when no records match', async () => {
      const provider = createProvider({ directory: tempDir })

      const result = await provider.query({ actor: 'nonexistent' })

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should use default pagination when not specified', async () => {
      const provider = createProvider({ directory: tempDir })

      const result = await provider.query({})

      expect(result.page).toBe(1)
      expect(result.perPage).toBe(20)
    })
  })

  describe('export', () => {
    it('should export as JSON', async () => {
      const provider = createProvider({ directory: tempDir })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      await writeFile(
        filePath,
        JSON.stringify({
          id: 'r1',
          actor: 'user:1',
          action: 'create',
          resource: 'project',
          timestamp: '2025-01-01T00:00:00Z',
        }) + '\n',
        'utf-8',
      )

      const buf = await provider.export({}, 'json')
      const parsed = JSON.parse(buf.toString()) as AuditRecord[]

      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe('r1')
    })

    it('should export as CSV', async () => {
      const provider = createProvider({ directory: tempDir })

      const date = new Date().toISOString().slice(0, 10)
      const filePath = join(tempDir, `audit-${date}.ndjson`)
      await writeFile(
        filePath,
        JSON.stringify({
          id: 'r1',
          actor: 'user:1',
          action: 'create',
          resource: 'project',
          timestamp: '2025-01-01T00:00:00Z',
        }) + '\n',
        'utf-8',
      )

      const buf = await provider.export({}, 'csv')
      const csv = buf.toString()
      const lines = csv.split('\n')

      expect(lines[0]).toBe('id,actor,action,resource,resourceId,details,ip,userAgent,timestamp')
      expect(lines).toHaveLength(2)
      expect(lines[1]).toContain('r1')
    })

    it('should return empty results when no files exist', async () => {
      const provider = createProvider({ directory: tempDir })

      const jsonBuf = await provider.export({}, 'json')
      expect(JSON.parse(jsonBuf.toString())).toEqual([])

      const csvBuf = await provider.export({}, 'csv')
      expect(csvBuf.toString().split('\n')).toHaveLength(1)
    })
  })
})
