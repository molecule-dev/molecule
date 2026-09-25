/**
 * Configuration types for the molecule.dev hosted speech provider.
 *
 * @module
 */

/**
 * Options for {@link createProvider}. Every field falls back to an env var, so
 * the zero-argument `provider` export works from `.env` alone.
 */
export interface MoleculeSpeechConfig {
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
  /** Default text-to-speech voice. Default `alloy`. */
  defaultVoice?: string
  /** Default text-to-speech model: `tts-1` (default) or `tts-1-hd`. */
  defaultTTSModel?: string
  /** Per-request timeout in milliseconds. Default 120000. */
  timeoutMs?: number
}

/** Environment variables this provider reads. */
export interface ProcessEnv {
  MOLECULE_API_KEY?: string
  MOLECULE_SERVICES_URL?: string
}
