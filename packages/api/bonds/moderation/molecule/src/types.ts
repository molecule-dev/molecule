/**
 * Configuration types for the molecule.dev hosted content classifier.
 *
 * @module
 */

/**
 * Options for {@link createClassifier}. Every field falls back to an env var,
 * so the zero-argument `classifier` export works from `.env` alone.
 */
export interface MoleculeModerationConfig {
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
  /** Per-request timeout in milliseconds. Default 30000. */
  timeoutMs?: number
}

/** Environment variables this classifier reads. */
export interface ProcessEnv {
  MOLECULE_API_KEY?: string
  MOLECULE_SERVICES_URL?: string
}
