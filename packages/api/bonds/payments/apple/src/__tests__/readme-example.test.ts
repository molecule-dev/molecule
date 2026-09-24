/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written, with the REAL env config provider. Only the
 * network (`fetch` to Apple's `verifyReceipt`, reached through the real
 * `@molecule/api-http` default client) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import { setProvider as setConfigProvider } from '@molecule/api-config'
import { provider as envConfig } from '@molecule/api-config-env'
import type { PaymentProviderInterface } from '@molecule/api-payments'

import { paymentProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('APPLE_SHARED_SECRET', 'test-shared-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('verifies an App Store subscription receipt through the named bond', async () => {
    const expiresMs = Date.now() + 30 * 24 * 3600 * 1000
    const purchase = {
      quantity: '1',
      product_id: 'com.example.pro.monthly',
      transaction_id: '2000000200',
      original_transaction_id: '2000000100',
      purchase_date: '2026-09-01 00:00:00 Etc/GMT',
      purchase_date_ms: String(expiresMs - 30 * 24 * 3600 * 1000),
      purchase_date_pst: '2026-08-31 17:00:00 America/Los_Angeles',
      original_purchase_date: '2026-08-01 00:00:00 Etc/GMT',
      original_purchase_date_ms: '1785542400000',
      original_purchase_date_pst: '2026-07-31 17:00:00 America/Los_Angeles',
      expires_date_ms: String(expiresMs),
    }
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            status: 0,
            environment: 'Production',
            latest_receipt_info: [purchase],
            pending_renewal_info: [
              { original_transaction_id: '2000000100', auto_renew_status: '1' },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setConfigProvider(envConfig)
    bond('payments', 'apple', paymentProvider)

    const receiptData = 'MIIT…base64-app-receipt'
    const apple = get<PaymentProviderInterface>('payments', 'apple')
    const verified = await apple?.verifyReceipt?.(receiptData, 'com.example.pro.monthly')

    expect(verified).toMatchObject({
      productId: 'com.example.pro.monthly',
      transactionId: '2000000100',
      expiresAt: new Date(expiresMs).toISOString(),
      autoRenews: true,
    })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://buy.itunes.apple.com/verifyReceipt')
    expect(JSON.parse(String(init?.body))).toEqual({
      'receipt-data': 'MIIT…base64-app-receipt',
      password: 'test-shared-secret',
      'exclude-old-transactions': true,
    })
  })
})
