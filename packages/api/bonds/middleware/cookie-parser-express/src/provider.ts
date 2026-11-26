/**
 * Express cookie parser implementation.
 *
 * @see https://www.npmjs.com/package/cookie-parser
 *
 * @module
 */

import createCookieParser from 'cookie-parser'
import type { Request, Response } from 'express'

import type { CookieParseOptions, Middleware } from '@molecule/api-middleware-cookie-parser'

/**
 * Factory for creating cookie parser middleware with a signing secret and custom options.
 * @param secret - A string or array of strings used to sign/unsign cookies. If provided, signed cookies are available on `req.signedCookies`.
 * @param options - Options passed to the `cookie-parser` package (e.g. `decode` function).
 * @returns A `Middleware` that parses cookies with the specified secret and options.
 */
export const cookieParserFactory = (
  secret?: string | string[],
  options?: CookieParseOptions,
): Middleware => {
  const middleware = createCookieParser(secret, options)
  return (req, res, next) => middleware(req as Request, res as Response, next)
}

/** The default Express middleware that populates `req.cookies`. */
export const provider: Middleware = cookieParserFactory()
