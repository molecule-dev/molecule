import { describe, expect, it } from 'vitest'

import {
  setupConfigEnv,
  setupDatabasePostgresql,
  setupJwtJsonwebtoken,
  setupMiddlewareBodyParserExpress,
  setupMiddlewareCookieParserExpress,
  setupMiddlewareCorsExpress,
  setupPasswordBcrypt,
  setupSecretsEnv,
  setupServiceDevice,
  setupTwoFactorOtplib,
} from '../index.js'

describe('@molecule/api-bonds-default-express', () => {
  it('exports the 10 universal API bond setup functions', () => {
    const setups = [
      setupConfigEnv,
      setupDatabasePostgresql,
      setupJwtJsonwebtoken,
      setupMiddlewareBodyParserExpress,
      setupMiddlewareCookieParserExpress,
      setupMiddlewareCorsExpress,
      setupPasswordBcrypt,
      setupSecretsEnv,
      setupServiceDevice,
      setupTwoFactorOtplib,
    ]
    expect(setups).toHaveLength(10)
    for (const fn of setups) {
      expect(typeof fn).toBe('function')
    }
  })
})
