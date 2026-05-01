/**
 * RxNorm drug-database provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the RxNorm drug-database provider.
 *
 * The NIH National Library of Medicine RxNav REST API at
 * `https://rxnav.nlm.nih.gov/REST/` is keyless and free for any use, so
 * all fields are optional.
 *
 * @see https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
 */
export interface RxNormConfig {
  /**
   * Base URL override. Defaults to `'https://rxnav.nlm.nih.gov/REST'`.
   *
   * The trailing `/REST` segment is part of the base URL — endpoints are
   * appended without a leading slash duplicate. Trailing slashes on the
   * supplied value are tolerated (and stripped).
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
