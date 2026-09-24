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

import { createApiKey, recordApiKeyUse, verifyApiKey } from '../index.js'

describe('README @example', () => {
  it('issues a key once, verifies the plaintext with its scopes and records the use', async () => {
    let saved: Record<string, unknown> | null = null
    fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
      saved = { id: 'key-1', created_at: new Date('2026-09-24T00:00:00Z'), ...data }
      return { data: saved, affected: 1 }
    })
    fakeStore.findOne.mockImplementation(
      async (_table: string, where: { field: string; value: unknown }[]) =>
        saved && where.every((w) => saved?.[w.field] === w.value) ? saved : null,
    )
    fakeStore.updateById.mockResolvedValue({ data: null, affected: 1 })

    setStore(store)

    const { apiKey, plaintext } = await createApiKey({
      user_id: 'user-123',
      name: 'CI deploy key',
      scopes: ['deploy:write'],
    })
    expect(plaintext.startsWith('sk_')).toBe(true)
    expect(apiKey.masked).toMatch(/^sk_…/)
    expect(apiKey.masked).not.toBe(plaintext)
    expect(JSON.stringify(saved)).not.toContain(plaintext)

    const verified = await verifyApiKey(plaintext)
    expect(verified?.id).toBe('key-1')
    expect(verified?.scopes).toEqual(['deploy:write'])
    if (!verified) throw new Error('key did not verify')
    await recordApiKeyUse(verified.id)
    expect(fakeStore.updateById).toHaveBeenCalledWith(
      'api_keys',
      'key-1',
      expect.objectContaining({ last_used_at: expect.any(Date) }),
    )

    expect(await verifyApiKey(`${plaintext}x`)).toBeNull()
  })
})
