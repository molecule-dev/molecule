/**
 * Photon (OpenStreetMap) geolocation provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Photon geolocation provider.
 */
export interface PhotonGeolocationConfig {
  /**
   * Base URL of the Photon instance.
   * Defaults to the public instance `'https://photon.komoot.io'`.
   * Point this at a self-hosted Photon for production volume — the public
   * instance serves reasonable low-volume use only and throttles or bans
   * heavy callers.
   */
  baseUrl?: string

  /**
   * Photon result language (`en`, `de`, `fr`, `nl`, `it`, …). Languages the
   * instance has no data for fall back to the default. Defaults to the
   * instance default (`en`) when omitted.
   */
  language?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /** Maximum number of results to return from search queries. Defaults to `10`. */
  limit?: number

  /**
   * ISO 3166-1 alpha-2 country codes to keep (e.g. `['LI', 'CH']`). Photon's
   * API has no country-restriction parameter, so results are filtered AFTER
   * the query — a restriction combined with a small `limit` can return fewer
   * (even zero) results that the upstream actually had.
   */
  countryCodes?: string[]
}
