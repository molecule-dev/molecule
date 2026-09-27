/**
 * Tests for the `query` handler (`GET /devices`).
 *
 * The load-bearing assertion is the page-size clamp: an unbounded `limit` is a
 * table-dump primitive, so the query clamps it into 1..500 — the same bound
 * every other resource's list handlers apply (the device handler previously
 * allowed up to 10000).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }))

vi.mock('@molecule/api-database', () => ({ findMany: mockFindMany }))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
}))

import { query } from '../handlers/query.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return { query: {}, ...overrides }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(): any {
  return { locals: { session: { userId: 'u1', deviceId: 'd1' } } }
}

describe('device query handler', () => {
  beforeEach(() => {
    mockFindMany.mockReset()
    mockFindMany.mockResolvedValue([])
  })

  it('clamps the limit query into 1..500 (the old 1..10000 cap was a table-dump outlier)', async () => {
    await query({ tableName: 'devices' })(mockReq({ query: { limit: '999999999' } }), mockRes())
    expect(mockFindMany).toHaveBeenCalledWith('devices', expect.objectContaining({ limit: 500 }))
  })

  it('keeps the default page size at 100', async () => {
    await query({ tableName: 'devices' })(mockReq(), mockRes())
    expect(mockFindMany).toHaveBeenCalledWith('devices', expect.objectContaining({ limit: 100 }))
  })

  it('responds 200 with the devices, current session device flagged', async () => {
    mockFindMany.mockResolvedValue([{ id: 'other' }, { id: 'd1' }])
    const response = await query({ tableName: 'devices' })(mockReq(), mockRes())
    expect(response.statusCode).toBe(200)
    expect(response.body[0]).toMatchObject({ id: 'd1', isCurrent: true })
  })
})
