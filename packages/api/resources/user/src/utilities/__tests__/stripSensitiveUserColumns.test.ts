import { describe, expect, it } from 'vitest'

import { SENSITIVE_USER_COLUMNS, stripSensitiveUserColumns } from '../stripSensitiveUserColumns.js'

describe('stripSensitiveUserColumns', () => {
  it('removes every sensitive column but keeps public fields', () => {
    const row = {
      id: 'u1',
      username: 'ada',
      email: 'ada@example.com',
      emailVerified: true,
      planKey: 'pro',
      emailConfirmationToken: 'plaintext-verify-token',
      passwordResetToken: 'reset-token',
      oauthData: { accessToken: 'ghp_secret' },
      stripeCustomerId: 'cus_123',
      anonymousSecretHash: 'abc',
    }
    const safe = stripSensitiveUserColumns(row)
    expect(safe.username).toBe('ada')
    expect(safe.emailVerified).toBe(true)
    expect(safe.planKey).toBe('pro')
    for (const col of SENSITIVE_USER_COLUMNS) {
      expect(safe).not.toHaveProperty(col)
    }
    // The email-verification-token self-verify hole specifically:
    expect(JSON.stringify(safe)).not.toContain('plaintext-verify-token')
    expect(JSON.stringify(safe)).not.toContain('ghp_secret')
  })

  it('does not mutate the input row', () => {
    const row = { id: 'u1', emailConfirmationToken: 'tok' }
    stripSensitiveUserColumns(row)
    expect(row.emailConfirmationToken).toBe('tok')
  })
})
