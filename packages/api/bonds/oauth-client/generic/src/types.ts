/**
 * Generic OAuth 2.0 client provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the generic OAuth 2.0 client provider.
 */
export interface GenericOAuthConfig {
  /** Default timeout for HTTP requests in milliseconds. Defaults to `10_000`. */
  timeout?: number

  /** Custom user-agent header sent with all requests. */
  userAgent?: string

  /**
   * How the client credentials are sent in token requests.
   * - `'body'` — client_id and client_secret in the POST body (default).
   * - `'header'` — HTTP Basic auth header.
   */
  clientAuthMethod?: 'body' | 'header'
}
