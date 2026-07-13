/**
 * Tests for App Store Server Notifications V2 orchestration (field extraction,
 * type mapping, error handling). The JWS/x5c cryptographic verification
 * itself is covered with REAL crypto in `jws.test.ts`; here `decodeAndVerifyJWS`
 * is mocked so these tests focus on `parseV2Notification`'s own logic —
 * param construction (which JWS strings it decodes) and response parsing
 * (how a decoded payload becomes a ParsedNotification).
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDecodeAndVerifyJWS, mockLogger } = vi.hoisted(() => ({
  mockDecodeAndVerifyJWS: vi.fn(),
  mockLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../jws.js', () => ({ decodeAndVerifyJWS: mockDecodeAndVerifyJWS }))
vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))

const { parseV2Notification } = await import('../notificationV2.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseV2Notification', () => {
  it('REGRESSION: returns null (not a crash) when the signedPayload fails JWS authentication', () => {
    mockDecodeAndVerifyJWS.mockImplementation(() => {
      throw new Error('JWS signature does not verify against the leaf certificate public key.')
    })

    const result = parseV2Notification('forged.jws.string')

    expect(result).toBeNull()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed authentication'),
      expect.objectContaining({ error: expect.any(Error) }),
    )
  })

  it('returns null when the (authenticated) payload has no notificationType', () => {
    mockDecodeAndVerifyJWS.mockReturnValue({ data: {} })

    expect(parseV2Notification('valid.jws.here')).toBeNull()
  })

  it('returns null for a TEST notification without treating it as an error (mirrors Google testNotification)', () => {
    mockDecodeAndVerifyJWS.mockReturnValue({ notificationType: 'TEST' })

    const result = parseV2Notification('valid.jws.here')

    expect(result).toBeNull()
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('TEST notification'))
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('returns null when signedTransactionInfo is missing from an entitlement-affecting type', () => {
    mockDecodeAndVerifyJWS.mockReturnValue({ notificationType: 'DID_RENEW', data: {} })

    expect(parseV2Notification('valid.jws.here')).toBeNull()
  })

  it('REGRESSION: derives transactionId/productId/expiresAt/type from the VERIFIED signedTransactionInfo, never from the outer payload', () => {
    mockDecodeAndVerifyJWS.mockImplementation((jws: string) => {
      if (jws === 'outer-jws') {
        return {
          notificationType: 'DID_RENEW',
          data: { signedTransactionInfo: 'txn-jws', signedRenewalInfo: 'renewal-jws' },
        }
      }
      if (jws === 'txn-jws') {
        return {
          originalTransactionId: 'orig-txn-1',
          transactionId: 'txn-1',
          productId: 'com.app.pro',
          expiresDate: 1700000000000,
        }
      }
      if (jws === 'renewal-jws') {
        return { autoRenewStatus: 1 }
      }
      throw new Error(`unexpected jws: ${jws}`)
    })

    const result = parseV2Notification('outer-jws')

    expect(mockDecodeAndVerifyJWS).toHaveBeenCalledWith('outer-jws', expect.any(Buffer))
    expect(mockDecodeAndVerifyJWS).toHaveBeenCalledWith('txn-jws', expect.any(Buffer))
    expect(mockDecodeAndVerifyJWS).toHaveBeenCalledWith('renewal-jws', expect.any(Buffer))
    expect(result).toEqual({
      transactionId: 'orig-txn-1',
      productId: 'com.app.pro',
      type: 'renewed',
      expiresAt: new Date(1700000000000).toISOString(),
      autoRenews: true,
    })
  })

  it('falls back to transactionId when originalTransactionId is absent', () => {
    mockDecodeAndVerifyJWS.mockImplementation((jws: string) => {
      if (jws === 'outer')
        return { notificationType: 'REFUND', data: { signedTransactionInfo: 'txn' } }
      if (jws === 'txn') return { transactionId: 'txn-only' }
      throw new Error('unexpected')
    })

    const result = parseV2Notification('outer')

    expect(result?.transactionId).toBe('txn-only')
    expect(result?.type).toBe('refund')
  })

  it('rejects (null) when signedTransactionInfo fails authentication', () => {
    mockDecodeAndVerifyJWS.mockImplementation((jws: string) => {
      if (jws === 'outer') {
        return { notificationType: 'DID_RENEW', data: { signedTransactionInfo: 'bad-txn' } }
      }
      throw new Error('JWS signature does not verify against the leaf certificate public key.')
    })

    expect(parseV2Notification('outer')).toBeNull()
  })

  it('degrades gracefully (autoRenews undefined) when signedRenewalInfo fails authentication, WITHOUT rejecting the already-authenticated transaction', () => {
    mockDecodeAndVerifyJWS.mockImplementation((jws: string) => {
      if (jws === 'outer') {
        return {
          notificationType: 'DID_RENEW',
          data: { signedTransactionInfo: 'txn', signedRenewalInfo: 'bad-renewal' },
        }
      }
      if (jws === 'txn') return { originalTransactionId: 'orig-1', productId: 'com.app.pro' }
      throw new Error('renewal info JWS failed')
    })

    const result = parseV2Notification('outer')

    expect(result).not.toBeNull()
    expect(result?.transactionId).toBe('orig-1')
    expect(result?.autoRenews).toBeUndefined()
  })

  it.each([
    ['SUBSCRIBED', 'renewed'],
    ['DID_RENEW', 'renewed'],
    ['DID_CHANGE_RENEWAL_STATUS', 'renewed'],
    ['DID_FAIL_TO_RENEW', 'expired'],
    ['EXPIRED', 'expired'],
    ['GRACE_PERIOD_EXPIRED', 'expired'],
    ['REFUND', 'refund'],
    ['CONSUMPTION_REQUEST', 'refund'],
    ['REVOKE', 'canceled'],
  ])('maps v2 notificationType %s to the shared vocabulary type %s', (v2Type, expectedType) => {
    mockDecodeAndVerifyJWS.mockImplementation((jws: string) => {
      if (jws === 'outer')
        return { notificationType: v2Type, data: { signedTransactionInfo: 'txn' } }
      return { originalTransactionId: 'orig-1' }
    })

    expect(parseV2Notification('outer')?.type).toBe(expectedType)
  })

  it('falls through to the lower-cased raw type for an unrecognized notificationType', () => {
    mockDecodeAndVerifyJWS.mockImplementation((jws: string) => {
      if (jws === 'outer') {
        return { notificationType: 'METADATA_UPDATE', data: { signedTransactionInfo: 'txn' } }
      }
      return { originalTransactionId: 'orig-1' }
    })

    expect(parseV2Notification('outer')?.type).toBe('metadata_update')
  })
})
