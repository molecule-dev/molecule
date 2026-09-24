/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the GDPR bond (in-memory — no
 * outside world to mock).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/api-compliance-gdpr'

import { deleteUserData, exportUserData, getConsent, setConsent, setProvider } from '../index.js'

describe('README @example', () => {
  it('records consent, exports via collectors, erases while retaining legal categories', async () => {
    const profiles = new Map([['user-123', { name: 'Ada', email: 'ada@example.com' }]])

    setProvider(
      createProvider({
        legalObligationCategories: ['billing'],
        dataCollectors: [
          {
            category: 'profile',
            collect: async (userId) => profiles.get(userId) ?? null,
            delete: async (userId) => {
              profiles.delete(userId)
            },
          },
        ],
      }),
    )

    const userId = 'user-123'
    await setConsent(userId, { purpose: 'marketing', granted: false })
    const consent = await getConsent(userId)
    expect(consent.consents).toEqual([
      expect.objectContaining({ purpose: 'marketing', granted: false }),
    ])

    const exported = await exportUserData(userId, 'json')
    expect(exported.format).toBe('json')
    expect(exported.data['profile']).toEqual({ name: 'Ada', email: 'ada@example.com' })

    const result = await deleteUserData(userId, { categories: ['profile', 'billing'] })
    expect(result.status).toBe('completed')
    expect(result.deletedCategories).toEqual(['profile'])
    expect(result.retainedCategories).toEqual(['billing'])
    expect(profiles.has('user-123')).toBe(false)
  })
})
