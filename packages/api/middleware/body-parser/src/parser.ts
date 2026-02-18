/**
 * Body parser middleware for molecule.dev.
 *
 * Core interface with bond-backed implementation.
 * Use a body parser bond (e.g., `@molecule/api-middleware-body-parser-express`)
 * to provide the actual parsing implementation.
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

/** Options for JSON body parsing (limit, strict mode, content type). */
export interface JsonParserOptions {
  limit?: string | number
  strict?: boolean
  type?: string | string[]
}

/** Factory function type for creating JSON parsers with options. */
export type JsonParserFactory = (options?: JsonParserOptions) => Middleware

const BOND_TYPE = 'middleware:body-parser'
const BOND_TYPE_FACTORY = 'middleware:body-parser:json-factory'

/**
 * Bonds a body parser middleware implementation for use by `getBodyParser()` and `bodyParser`.
 * @param parser - The middleware function that parses request bodies.
 */
export const setBodyParser = (parser: Middleware): void => {
  bond(BOND_TYPE, parser)
}

/**
 * Gets the bonded body parser middleware.
 * @throws {Error} If no body parser has been bonded.
 * @returns The bonded body parser middleware function.
 */
export const getBodyParser = (): Middleware => {
  const parser = bondGet<Middleware>(BOND_TYPE)
  if (!parser) {
    throw new Error(
      'No body parser implementation has been bonded. Install a body parser bond (e.g., @molecule/api-middleware-body-parser-express).',
    )
  }
  return parser
}

/**
 * Checks if a body parser middleware has been bonded.
 * @returns `true` if a body parser is available.
 */
export const hasBodyParser = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Bonds a JSON parser factory for creating parsers with custom options (e.g., size limits).
 * @param factory - A function that creates JSON parser middleware from options.
 */
export const setJsonParserFactory = (factory: JsonParserFactory): void => {
  bond(BOND_TYPE_FACTORY, factory)
}

/**
 * Gets the bonded JSON parser factory.
 * @returns The factory function, or `null` if none has been bonded.
 */
export const getJsonParserFactory = (): JsonParserFactory | null => {
  return bondGet<JsonParserFactory>(BOND_TYPE_FACTORY) ?? null
}

/**
 * Default body parser middleware that delegates to the bonded implementation.
 * @param req - The incoming request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 * @returns The result of the bonded body parser invocation.
 */
export const bodyParser: Middleware = (req, res, next) => getBodyParser()(req, res, next)

/**
 * Creates a JSON body parser with custom options via the bonded factory.
 * @param options - JSON parsing options (limit, strict mode, content type).
 * @throws {Error} If no JSON parser factory has been bonded.
 * @returns A middleware function that parses JSON request bodies.
 */
export const createJsonParser = (options?: JsonParserOptions): Middleware => {
  const factory = getJsonParserFactory()
  if (!factory) {
    throw new Error(
      'No JSON parser factory has been bonded. Install a body parser bond (e.g., @molecule/api-middleware-body-parser-express).',
    )
  }
  return factory(options)
}
