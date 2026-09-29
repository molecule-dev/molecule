/**
 * Intern-Decision decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Intern-Decision decisions provider.
 */
export interface InternDecisionConfig {
  /**
   * Base URL of the Intern-Decision service (or of an authenticating proxy in
   * front of it). Defaults to `INTERN_DECISION_URL`, then `http://127.0.0.1:7860`.
   */
  baseUrl?: string
  /**
   * Bearer token for a proxy in front of the service. The service itself has
   * no authentication. Defaults to the `INTERN_DECISION_API_KEY` env var.
   */
  apiKey?: string
}
