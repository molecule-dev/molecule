/**
 * Molecule managed-vault secrets provider types.
 *
 * @module
 */

/**
 * Options for the molecule managed-vault secrets provider.
 */
export interface MoleculeSecretsProviderOptions {
  /**
   * Per-app bootstrap token.
   * Falls back to the `MOLECULE_VAULT_TOKEN` env var.
   */
  token?: string

  /**
   * App identifier the vault scopes secrets to.
   * Falls back to the `MOLECULE_APP_ID` env var.
   */
  appId?: string

  /**
   * Vault base URL.
   * Falls back to the `MOLECULE_VAULT_URL` env var, then
   * `https://api.molecule.dev/v1/vault`.
   */
  vaultUrl?: string

  /**
   * Cache TTL in milliseconds.
   * @default 60000 (1 minute)
   */
  cacheTtl?: number

  /**
   * On fetch failure, serve last-good cached values (stale) before falling
   * back to `process.env`. When `false`, fall back to `process.env` immediately.
   * @default true
   */
  staleWhileError?: boolean
}
