/**
 * Vonage SMS provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the Vonage SMS provider.
 */
export interface VonageSMSConfig {
  /** Vonage API key. Defaults to `process.env.VONAGE_API_KEY`. */
  apiKey?: string

  /** Vonage API secret. Defaults to `process.env.VONAGE_API_SECRET`. */
  apiSecret?: string

  /** Default sender phone number or alphanumeric ID. Defaults to `process.env.VONAGE_FROM_NUMBER`. */
  defaultFrom?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** Vonage-specific environment variable declarations. */
    export interface ProcessEnv {
      VONAGE_API_KEY?: string
      VONAGE_API_SECRET?: string
      VONAGE_FROM_NUMBER?: string
    }
  }
}
