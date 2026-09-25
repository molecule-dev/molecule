/**
 * Configuration types for the molecule.dev hosted translation provider.
 *
 * @module
 */

/**
 * Options for {@link createProvider}. Every field falls back to an env var, so
 * the zero-argument `provider` export works from `.env` alone.
 */
export interface MoleculeTranslationConfig {
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
  /** Per-request timeout in milliseconds. Default 120000 (a large batch takes a while). */
  timeoutMs?: number
}
