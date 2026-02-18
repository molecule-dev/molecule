/**
 * Express cookie parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setCookieParser, setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
 * import { provider, cookieParserFactory } from '@molecule/api-middleware-cookie-parser-express'
 *
 * setCookieParser(provider)
 * setCookieParserFactory(cookieParserFactory)
 * ```
 *
 * @module
 */

export * from './provider.js'
