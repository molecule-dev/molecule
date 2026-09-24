/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store.
 *
 * @module
 */
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

import { describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { issueToken, recordTokenUse, verifyToken } from '../index.js'

describe('README @example', () => {
  it('issues a device token once, verifies the plaintext with its scopes and records the use', async () => {
    let saved: Record<string, unknown> | null = null
    fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
      saved = { id: 'tok-1', created_at: new Date('2026-09-24T00:00:00Z'), ...data }
      return { data: saved, affected: 1 }
    })
    fakeStore.findOne.mockImplementation(
      async (_table: string, where: { field: string; value: unknown }[]) =>
        saved && where.every((w) => saved?.[w.field] === w.value) ? saved : null,
    )
    fakeStore.updateById.mockResolvedValue({ data: null, affected: 1 })

    setStore(store)

    const { token, plaintext } = await issueToken({
      device_id: 'device-42',
      scopes: ['telemetry:write'],
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    })
    expect(plaintext.startsWith('dvt_')).toBe(true)
    expect(token.masked).toMatch(/^dvt_…/)
    expect(JSON.stringify(saved)).not.toContain(plaintext)

    const verified = await verifyToken(plaintext)
    expect(verified?.id).toBe('tok-1')
    expect(verified?.scopes).toEqual(['telemetry:write'])
    if (!verified) throw new Error('token did not verify')
    await recordTokenUse(verified.id, '203.0.113.7')
    expect(fakeStore.updateById).toHaveBeenCalledWith(
      'device_auth_tokens',
      'tok-1',
      expect.objectContaining({ last_used_at: expect.any(Date), last_used_ip: '203.0.113.7' }),
    )

    expect(await verifyToken('dvt_not-a-real-token')).toBeNull()
  })
})
