/**
 * Configuration types for the egress relay client.
 *
 * @module
 */

/**
 * Options shared by `installRelayFetch`, `createRelayFetch` and `createRelayClient`.
 */
export interface RelayOptions {
  /**
   * The relay endpoint, e.g. `https://api.molecule.dev/api/egress-relay`.
   * Defaults to the `MOLECULE_EGRESS_RELAY_URL` environment variable.
   */
  relayUrl?: string

  /**
   * The project's egress credential: the `<projectId>:<mac>` pair the platform mints
   * (it is base64-encoded into `Authorization: Basic …` for you), or an already
   * base64-encoded value. Defaults to the `MOLECULE_EGRESS_CREDENTIAL` environment variable.
   */
  credential?: string

  /**
   * The fetch used to reach the relay itself. Defaults to the `globalThis.fetch` in place
   * when the relay fetch is created (so installing the relay fetch never recurses).
   */
  fetch?: typeof fetch

  /**
   * Most redirects followed for one request (each hop goes back through the relay).
   * Defaults to 5.
   */
  maxRedirects?: number

  /**
   * Return `true` for a URL that must NOT be relayed (it goes to the underlying fetch
   * unchanged), e.g. the runtime's own origin. Requests to the relay URL itself are
   * never relayed, whatever this returns.
   */
  bypass?: (url: URL) => boolean
}

/**
 * A `fetch`-compatible function that sends http(s) requests through the relay.
 */
export interface RelayFetch {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>
}

/**
 * Handle returned by `installRelayFetch`.
 */
export interface RelayFetchInstallation {
  /** The relay fetch now installed as `globalThis.fetch`. */
  fetch: RelayFetch
  /** Restore the fetch that was installed before (idempotent). */
  uninstall: () => void
}
