/**
 * Express CORS implementation.
 *
 * @module
 */

import createCors from 'cors'

import type { CorsOptions, Middleware } from '@molecule/api-middleware-cors'

/**
 * The Express CORS provider.
 *
 * Allows requests from:
 * - `APP_ORIGIN` environment variable
 * - `SITE_ORIGIN` environment variable
 * - `https://localhost` and `http://localhost` for development
 * - `capacitor://localhost` for mobile apps
 * - `capacitor-electron://-` for Electron apps
 * - Custom `APP_URL_SCHEME` for mobile apps
 * - `null` and `undefined` for certain mobile apps
 *
 * Exposes the 'Set-Authorization' header for JWT auth.
 *
 * Lazily initialized so that secrets are resolved before reading env vars.
 */
let _cors: ReturnType<typeof createCors> | null = null

/**
 * Returns the lazily-initialized CORS middleware. On first call, reads `APP_ORIGIN`,
 * `SITE_ORIGIN`, and `APP_URL_SCHEME` from env and configures the allowed origins list.
 * @returns The configured `cors` middleware handler.
 */
function getLazyCors(): ReturnType<typeof createCors> {
  if (!_cors) {
    _cors = createCors({
      origin: [
        process.env.APP_ORIGIN,
        process.env.SITE_ORIGIN,
        // Allow any localhost port (e.g. :3000, :5173, :5174) for local dev
        /^https?:\/\/localhost(:\d+)?$/,
        `capacitor://localhost`,
        `capacitor-electron://-`,
        `${process.env.APP_URL_SCHEME}://-`,
        null,
        `null`,
        undefined,
        `undefined`,
      ],
      credentials: true,
      exposedHeaders: `set-authorization`,
    } as createCors.CorsOptions)
  }
  return _cors
}

/**
 * CORS middleware provider that delegates to the lazily-initialized `cors` handler.
 * Allows requests from `APP_ORIGIN`, `SITE_ORIGIN`, localhost, and Capacitor/Electron schemes.
 * @param req - The incoming request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 * @returns The result of the CORS handler invocation.
 */
export const provider: Middleware = (req, res, next) =>
  getLazyCors()(req as never, res as never, next)

/**
 * Factory for creating CORS middleware with fully custom options, bypassing the default origin list.
 * @param options - CORS configuration passed directly to the `cors` package.
 * @returns A `Middleware` that applies the specified CORS policy.
 */
export const corsFactory = (options: CorsOptions): Middleware => {
  const handler = createCors(options as createCors.CorsOptions)
  return (req, res, next) => handler(req as never, res as never, next)
}
