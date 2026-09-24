/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import {
  createNoopIAPProvider,
  finish,
  get,
  type IAPProvider,
  initialize,
  order,
  register,
  setProvider,
  verify,
} from '../index.js'

/**
 * The README example's purchase flow, verbatim.
 *
 * @returns Whether the purchase went through, plus the store's error message if not.
 */
async function buyPro(): Promise<{ ok: boolean; message?: string }> {
  const result = await order('pro_monthly')
  if (!result.success || !result.product) {
    return { ok: false, message: result.error?.message }
  }
  const { valid } = await verify(result.product, '/api/iap/verify')
  if (valid) finish(result.product) // only AFTER your server accepted the receipt
  return { ok: valid }
}

describe('README @example', () => {
  it('registers products on the bonded provider and reports the no-op provider as unavailable', async () => {
    // Startup: bond a store provider (the no-op one is the only built-in — see remarks).
    setProvider(createNoopIAPProvider())
    await initialize()
    register([{ id: 'com.example.pro_monthly', alias: 'pro_monthly', type: 'subscription' }])

    expect(get('pro_monthly')?.type).toBe('subscription')
    expect(get('com.example.pro_monthly')?.alias).toBe('pro_monthly')
    expect(await buyPro()).toEqual({
      ok: false,
      message: 'In-app purchases are not available.',
    })
  })

  it('verifies with the server before finishing when a real store provider is bonded', async () => {
    // Stand-in for a platform store (StoreKit / Play Billing) — the outside world.
    const store = createNoopIAPProvider()
    const calls: string[] = []
    const verifyMock = vi.fn(async () => {
      calls.push('verify')
      return { valid: true }
    })
    const finishMock = vi.fn(() => {
      calls.push('finish')
    })
    const storeProvider: IAPProvider = {
      ...store,
      order: async (idOrAlias) => ({ success: true, product: store.get(idOrAlias) }),
      verify: verifyMock,
      finish: finishMock,
    }
    setProvider(storeProvider)
    await initialize()
    register([{ id: 'com.example.pro_monthly', alias: 'pro_monthly', type: 'subscription' }])

    expect(await buyPro()).toEqual({ ok: true })
    expect(calls).toEqual(['verify', 'finish'])
    expect(verifyMock).toHaveBeenCalledWith(get('pro_monthly'), '/api/iap/verify', undefined)
  })
})
