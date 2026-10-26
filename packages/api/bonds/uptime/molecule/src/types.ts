/**
 * Configuration for the molecule.dev hosted uptime provider.
 *
 * @module
 */

/** Options for `createProvider()`. Every field falls back to its env var. */
export interface MoleculeUptimeConfig {
  /**
   * A molecule project API key (`mk_…`) or the in-sandbox token (`mbk_…`),
   * scope `broker` or `broker:uptime`. Defaults to
   * `process.env.MOLECULE_API_KEY`.
   */
  apiKey?: string

  /**
   * The hosted services base URL. Defaults to
   * `process.env.MOLECULE_SERVICES_URL`, then
   * `https://api.molecule.dev/api/v1/services`.
   */
  servicesUrl?: string

  /** Per-call HTTP timeout in milliseconds. Defaults to `45_000` — the probe's own `timeoutMs` (at most 30,000) plus redirect and network slack. */
  timeoutMs?: number
}
