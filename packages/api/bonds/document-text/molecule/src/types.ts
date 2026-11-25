/**
 * Configuration for the molecule.dev hosted document text provider.
 *
 * @module
 */

/** Options for `createProvider()`. Every field falls back to its env var. */
export interface MoleculeDocumentTextConfig {
  /**
   * A molecule project API key (`mk_…`) or the in-sandbox token (`mbk_…`),
   * scope `broker` or `broker:pdf`. Defaults to
   * `process.env.MOLECULE_API_KEY`.
   */
  apiKey?: string

  /**
   * The hosted services base URL. Defaults to
   * `process.env.MOLECULE_SERVICES_URL`, then
   * `https://api.molecule.dev/api/v1/services`.
   */
  servicesUrl?: string

  /** Per-call timeout in milliseconds. Defaults to `60_000` — a large document parses in seconds. */
  timeoutMs?: number
}
