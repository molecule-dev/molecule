/**
 * Configuration types for the molecule.dev hosted web search provider.
 *
 * @module
 */

/**
 * Options for {@link createProvider}. Every field falls back to an env var,
 * so the zero-argument `provider` export works from `.env` alone.
 */
export interface MoleculeWebSearchConfig {
  /**
   * The molecule project API key (`mk_…`), or the sandbox token molecule.dev
   * writes for in-IDE apps (`mbk_…`). Defaults to `MOLECULE_API_KEY`.
   */
  apiKey?: string
  /**
   * The hosted services base URL, without a trailing slash. Defaults to
   * `MOLECULE_SERVICES_URL`, then `https://api.molecule.dev/api/v1/services`.
   */
  servicesUrl?: string
  /** Per-request timeout in milliseconds. Default 15000. */
  timeoutMs?: number
}

/** Environment variables this provider reads. */
export interface ProcessEnv {
  MOLECULE_API_KEY?: string
  MOLECULE_SERVICES_URL?: string
}
