/**
 * Express cookie parser implementation.
 *
 * @see https://www.npmjs.com/package/cookie-parser
 *
 * @module
 */

import createCookieParser from 'cookie-parser'

import type { CookieParseOptions, Middleware } from '@molecule/api-middleware-cookie-parser'

/**
 * The Express cookie parser provider.
 *
 * Parses Cookie header and populates `req.cookies` with an object
 * keyed by the cookie names.
 */
export const provider: Middleware = createCookieParser() as unknown as Middleware

/**
 * Factory for creating cookie parser middleware with a signing secret and custom options.
 * @param secret - A string or array of strings used to sign/unsign cookies. If provided, signed cookies are available on `req.signedCookies`.
 * @param options - Options passed to the `cookie-parser` package (e.g. `decode` function).
 * @returns A `Middleware` that parses cookies with the specified secret and options.
 */
export const cookieParserFactory = (
  secret?: string | string[],
  options?: CookieParseOptions,
): Middleware => createCookieParser(secret, options) as unknown as Middleware
