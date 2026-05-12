/**
 * Default Express-based API bond wirings.
 *
 * Centralizes the 10 byte-identical `api/src/bonds/<name>.ts` setup
 * functions that every flagship app shipped before this package
 * existed. Each function preserves the legacy name (`setupConfigEnv`,
 * `setupDatabasePostgresql`, ...) so per-app `bonds/<name>.ts` files
 * can become 1-line re-exports without changing `bonds/index.ts` call
 * sites.
 *
 * @module
 */

import { bond } from '@molecule/api-bond'
import { setProvider as setConfig } from '@molecule/api-config'
import { provider as configProvider } from '@molecule/api-config-env'
import { setPool, setStore } from '@molecule/api-database'
import { pool as dbPool, store as dbStore } from '@molecule/api-database-postgresql'
import { setProvider as setJwt } from '@molecule/api-jwt'
import { provider as jwtProvider } from '@molecule/api-jwt-jsonwebtoken'
import { setBodyParser, setJsonParserFactory } from '@molecule/api-middleware-body-parser'
import {
  jsonParserFactory as bodyJsonParserFactory,
  provider as bodyParserProvider,
} from '@molecule/api-middleware-body-parser-express'
import { setCookieParser, setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
import {
  cookieParserFactory,
  provider as cookieParserProvider,
} from '@molecule/api-middleware-cookie-parser-express'
import { setCors, setCorsFactory } from '@molecule/api-middleware-cors'
import { corsFactory, provider as corsProvider } from '@molecule/api-middleware-cors-express'
import { setProvider as setPassword } from '@molecule/api-password'
import { provider as passwordProvider } from '@molecule/api-password-bcrypt'
import { deviceService } from '@molecule/api-resource-device'
import { setProvider as setSecrets } from '@molecule/api-secrets'
import { provider as secretsProvider } from '@molecule/api-secrets-env'
import { setProvider as setTwoFactor } from '@molecule/api-two-factor'
import { provider as twoFactorProvider } from '@molecule/api-two-factor-otplib'

/** Wires `@molecule/api-config-env` to `@molecule/api-config`. */
export function setupConfigEnv(): void {
  setConfig(configProvider)
}

/** Wires `@molecule/api-database-postgresql` to `@molecule/api-database`. */
export function setupDatabasePostgresql(): void {
  setPool(dbPool)
  setStore(dbStore)
}

/** Wires `@molecule/api-jwt-jsonwebtoken` to `@molecule/api-jwt`. */
export function setupJwtJsonwebtoken(): void {
  setJwt(jwtProvider)
}

/** Wires `@molecule/api-middleware-body-parser-express` to `@molecule/api-middleware-body-parser`. */
export function setupMiddlewareBodyParserExpress(): void {
  setBodyParser(bodyParserProvider)
  setJsonParserFactory(bodyJsonParserFactory)
}

/** Wires `@molecule/api-middleware-cookie-parser-express` to `@molecule/api-middleware-cookie-parser`. */
export function setupMiddlewareCookieParserExpress(): void {
  setCookieParser(cookieParserProvider)
  setCookieParserFactory(cookieParserFactory)
}

/** Wires `@molecule/api-middleware-cors-express` to `@molecule/api-middleware-cors`. */
export function setupMiddlewareCorsExpress(): void {
  setCors(corsProvider)
  setCorsFactory(corsFactory)
}

/** Wires `@molecule/api-password-bcrypt` to `@molecule/api-password`. */
export function setupPasswordBcrypt(): void {
  setPassword(passwordProvider)
}

/** Wires `@molecule/api-secrets-env` to `@molecule/api-secrets`. */
export function setupSecretsEnv(): void {
  setSecrets(secretsProvider)
}

/** Registers the device service from `@molecule/api-resource-device` on the bond system. */
export function setupServiceDevice(): void {
  bond('device', deviceService)
}

/** Wires `@molecule/api-two-factor-otplib` to `@molecule/api-two-factor`. */
export function setupTwoFactorOtplib(): void {
  setTwoFactor(twoFactorProvider)
}
