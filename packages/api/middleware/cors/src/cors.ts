/**
 * CORS middleware for molecule.dev.
 *
 * Core interface with bond-backed implementation.
 * Use a CORS bond (e.g., `@molecule/api-middleware-cors-express`)
 * to provide the actual CORS implementation.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'
import { registerSecrets } from '@molecule/api-secrets'

import type { CorsOptions } from './types.js'

registerSecrets([
  { key: 'APP_ORIGIN', description: 'Application origin URL', required: false },
  { key: 'SITE_ORIGIN', description: 'Marketing site origin URL', required: false },
  { key: 'APP_URL_SCHEME', description: 'Custom URL scheme for mobile apps', required: false },
])

/**
 * Generic middleware type — framework-agnostic.
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
export type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void

/** Factory function type for creating CORS middleware with custom options. */
export type CorsFactory = (options: CorsOptions) => Middleware

const BOND_TYPE = 'middleware:cors'
const BOND_TYPE_FACTORY = 'middleware:cors:factory'

/**
 * Bonds a CORS middleware implementation for use by `getCors()` and `cors`.
 * @param middleware - The middleware function that handles CORS headers.
 */
export const setCors = (middleware: Middleware): void => {
  bond(BOND_TYPE, middleware)
}

/**
 * Gets the bonded CORS middleware.
 * @throws {Error} If no CORS middleware has been bonded.
 * @returns The bonded CORS middleware function.
 */
export const getCors = (): Middleware => {
  const middleware = bondGet<Middleware>(BOND_TYPE)
  if (!middleware) {
    throw new Error(
      'No CORS implementation has been bonded. Install a CORS bond (e.g., @molecule/api-middleware-cors-express).',
    )
  }
  return middleware
}

/**
 * Checks if a CORS middleware has been bonded.
 * @returns `true` if CORS middleware is available.
 */
export const hasCors = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Bonds a CORS factory for creating middleware with custom options (origins, methods, headers).
 * @param factory - A function that creates CORS middleware from options.
 */
export const setCorsFactory = (factory: CorsFactory): void => {
  bond(BOND_TYPE_FACTORY, factory)
}

/**
 * Gets the bonded CORS factory.
 * @returns The factory function, or `null` if none has been bonded.
 */
export const getCorsFactory = (): CorsFactory | null => {
  return bondGet<CorsFactory>(BOND_TYPE_FACTORY) ?? null
}

/**
 * Default CORS middleware that delegates to the bonded implementation.
 * @param req - The incoming request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 * @returns The result of the bonded CORS handler invocation.
 */
export const cors: Middleware = (req, res, next) => getCors()(req, res, next)

/**
 * Creates CORS middleware with custom options via the bonded factory.
 * @param options - CORS options (origins, methods, headers, credentials, etc.).
 * @throws {Error} If no CORS factory has been bonded.
 * @returns A middleware function that handles CORS headers.
 */
export const createCorsMiddleware = (options: CorsOptions): Middleware => {
  const factory = getCorsFactory()
  if (!factory) {
    throw new Error(
      'No CORS factory has been bonded. Install a CORS bond (e.g., @molecule/api-middleware-cors-express).',
    )
  }
  return factory(options)
}
