/**
 * Daily.co video rooms provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the Daily.co video rooms provider.
 */
export interface DailyCoVideoRoomsConfig {
  /** Daily.co API key. Defaults to `process.env.DAILY_CO_API_KEY`. */
  apiKey?: string

  /**
   * Override the Daily.co REST base URL. Useful for tests or self-hosted
   * proxies. Defaults to `https://api.daily.co/v1`.
   */
  baseUrl?: string

  /**
   * Optional `fetch` implementation. Defaults to the global `fetch` from
   * Node 20+. Tests may inject a mock here.
   */
  fetch?: typeof fetch
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** Daily.co-specific environment variable declarations. */
    export interface ProcessEnv {
      DAILY_CO_API_KEY?: string
    }
  }
}
