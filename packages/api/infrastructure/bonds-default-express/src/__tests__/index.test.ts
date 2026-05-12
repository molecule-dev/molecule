import { describe, expect, it } from 'vitest'

import * as bondsDefault from '../index.js'

describe('@molecule/api-bonds-default-express', () => {
  it('exports the universal API bond setup functions', () => {
    const expected = [
      'setupConfigEnv',
      'setupDatabasePostgresql',
      'setupJwtJsonwebtoken',
      'setupMiddlewareBodyParserExpress',
      'setupMiddlewareCookieParserExpress',
      'setupMiddlewareCorsExpress',
      'setupPasswordBcrypt',
      'setupSecretsEnv',
      'setupServiceDevice',
      'setupTwoFactorOtplib',
      'setupEmailsMailgun',
      'setupPaymentsStripe',
      'setupServicePayment',
      'setupSearchMeilisearch',
      'setupUploadsS3',
    ]
    for (const name of expected) {
      expect(
        typeof (bondsDefault as Record<string, unknown>)[name],
        `${name} missing or not a function`,
      ).toBe('function')
    }
  })
})
