/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { deleteUserData, exportUserData, setConsent, setProvider } from '@molecule/api-compliance'
import { deleteById, deleteMany, findMany, findOne, setStore } from '@molecule/api-database'
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
  it('exports every collected category and erases all but the legally retained one', async () => {
    const profile = { id: 'user-123', name: 'Ada', email: 'ada@example.com' }
    const posts = [{ id: 'p1', authorId: 'user-123', title: 'Hello' }]
    const invoices = [{ id: 'inv-1', userId: 'user-123', amountCents: 4900 }]
    fakeStore.findOne.mockResolvedValue(profile)
    fakeStore.findMany.mockImplementation(async (table: string) =>
      table === 'posts' ? posts : invoices,
    )
    fakeStore.deleteById.mockResolvedValue({ data: null, affected: 1 })
    fakeStore.deleteMany.mockResolvedValue({ data: null, affected: 1 })

    setStore(store)
    const byUser = (field: string, userId: string) => [
      { field, operator: '=' as const, value: userId },
    ]
    setProvider(
      createProvider({
        categories: ['profile', 'content', 'billing'],
        legalObligationCategories: ['billing'],
        dataCollectors: [
          {
            category: 'profile',
            collect: (userId) => findOne('users', byUser('id', userId)),
            delete: async (userId) => void (await deleteById('users', userId)),
          },
          {
            category: 'content',
            collect: (userId) => findMany('posts', { where: byUser('authorId', userId) }),
            delete: async (userId) => void (await deleteMany('posts', byUser('authorId', userId))),
          },
          {
            category: 'billing',
            collect: (userId) => findMany('invoices', { where: byUser('userId', userId) }),
          },
        ],
      }),
    )

    const userId = 'user-123'
    await setConsent(userId, { purpose: 'marketing', granted: false })
    const exported = await exportUserData(userId, 'json')
    const erased = await deleteUserData(userId)

    expect(exported.categories).toEqual(['profile', 'content', 'billing'])
    expect(exported.data).toEqual({
      profile,
      content: posts,
      billing: invoices,
      consents: [expect.objectContaining({ purpose: 'marketing', granted: false })],
    })
    expect(fakeStore.findOne).toHaveBeenCalledWith('users', [
      { field: 'id', operator: '=', value: 'user-123' },
    ])

    expect(erased).toMatchObject({
      userId,
      status: 'completed',
      deletedCategories: ['profile', 'content'],
      retainedCategories: ['billing'],
    })
    expect(fakeStore.deleteById).toHaveBeenCalledWith('users', 'user-123')
    expect(fakeStore.deleteMany).toHaveBeenCalledWith('posts', [
      { field: 'authorId', operator: '=', value: 'user-123' },
    ])
  })
})
