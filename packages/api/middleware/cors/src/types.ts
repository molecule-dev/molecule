/**
 * Type definitions for the CORS middleware.
 *
 * @module
 */

/**
 * CORS configuration options.
 */
export interface CorsOptions {
  origin?:
    | string
    | string[]
    | boolean
    | RegExp
    | (string | RegExp | null | undefined)[]
    | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void)
  methods?: string | string[]
  allowedHeaders?: string | string[]
  exposedHeaders?: string | string[]
  credentials?: boolean
  maxAge?: number
  preflightContinue?: boolean
  optionsSuccessStatus?: number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The primary app origin for CORS.
       */
      APP_ORIGIN?: string
      /**
       * The site origin for CORS.
       */
      SITE_ORIGIN?: string
      /**
       * Custom URL scheme for mobile apps.
       */
      APP_URL_SCHEME?: string
    }
  }
}
