/**
 * OauthClient provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete oauth-client implementation.
 *
 * @module
 */

/**
 *
 */
export interface OauthClientProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface OauthClientConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
