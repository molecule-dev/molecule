/**
 * Cookie parser middleware for molecule.dev.
 *
 * Core interface — the actual implementation is provided via bonds.
 * Install a cookie parser bond (e.g., `@molecule/api-middleware-cookie-parser-express`)
 * to provide cookie parsing.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

/**
 * Generic middleware type — framework-agnostic.
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
export type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void

/** Options for cookie parsing. */
export interface CookieParseOptions {
  decode?: (value: string) => string
}

/** Factory function type for creating cookie parser middleware with secret and options. */
export type CookieParserFactory = (
  secret?: string | string[],
  options?: CookieParseOptions,
) => Middleware

const BOND_TYPE = 'middleware:cookie-parser'
const BOND_TYPE_FACTORY = 'middleware:cookie-parser:factory'

/**
 * Bonds a cookie parser middleware implementation for use by `getCookieParser()` and `cookieParser`.
 * @param parser - The middleware function that parses cookies.
 */
export const setCookieParser = (parser: Middleware): void => {
  bond(BOND_TYPE, parser)
}

/**
 * Gets the bonded cookie parser middleware.
 * @throws {Error} If no cookie parser has been bonded.
 * @returns The bonded cookie parser middleware function.
 */
export const getCookieParser = (): Middleware => {
  const parser = bondGet<Middleware>(BOND_TYPE)
  if (!parser) {
    throw new Error(
      'No cookie parser implementation has been bonded. Install a cookie parser bond (e.g., @molecule/api-middleware-cookie-parser-express).',
    )
  }
  return parser
}

/**
 * Checks if a cookie parser middleware has been bonded.
 * @returns `true` if a cookie parser is available.
 */
export const hasCookieParser = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Bonds a cookie parser factory for creating parsers with custom secrets and options.
 * @param factory - A function that creates cookie parser middleware from options.
 */
export const setCookieParserFactory = (factory: CookieParserFactory): void => {
  bond(BOND_TYPE_FACTORY, factory)
}

/**
 * Gets the bonded cookie parser factory.
 * @returns The factory function, or `null` if none has been bonded.
 */
export const getCookieParserFactory = (): CookieParserFactory | null => {
  return bondGet<CookieParserFactory>(BOND_TYPE_FACTORY) ?? null
}

/**
 * Default cookie parser middleware that delegates to the bonded implementation. Parses the Cookie header and populates `req.cookies`.
 * @param req - The incoming request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 * @returns The result of the bonded cookie parser invocation.
 */
export const cookieParser: Middleware = (req, res, next) => getCookieParser()(req, res, next)

/**
 * Creates cookie parser middleware with custom options via the bonded factory.
 * @param secret - Secret string(s) for signed cookie verification.
 * @param options - Cookie parsing options (e.g., custom decode function).
 * @throws {Error} If no cookie parser factory has been bonded.
 * @returns A middleware function that parses cookies.
 */
export const createCookieParserMiddleware = (
  secret?: string | string[],
  options?: CookieParseOptions,
): Middleware => {
  const factory = getCookieParserFactory()
  if (!factory) {
    throw new Error(
      'No cookie parser factory has been bonded. Install a cookie parser bond (e.g., @molecule/api-middleware-cookie-parser-express).',
    )
  }
  return factory(secret, options)
}
