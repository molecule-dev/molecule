import { afterEach, describe, expect, it } from 'vitest'

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

describe('error tracking setups', () => {
  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('error-tracking')
  })

  it('exports setupErrorTrackingSentry and setupErrorTrackingConsole', () => {
    expect(typeof bondsDefault.setupErrorTrackingSentry).toBe('function')
    expect(typeof bondsDefault.setupErrorTrackingConsole).toBe('function')
  })

  it('setupErrorTrackingConsole bonds the console provider (zero-credential)', async () => {
    await bondsDefault.setupErrorTrackingConsole()
    const { getProvider, hasProvider } = await import('@molecule/api-error-tracking')
    const { provider } = await import('@molecule/api-error-tracking-console')
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(provider)
  })

  it('setupErrorTrackingSentry bonds the sentry provider', async () => {
    await bondsDefault.setupErrorTrackingSentry()
    const { getProvider, hasProvider } = await import('@molecule/api-error-tracking')
    const { provider } = await import('@molecule/api-error-tracking-sentry')
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(provider)
  })
})
