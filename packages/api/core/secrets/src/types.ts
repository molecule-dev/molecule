/**
 * Secrets management types.
 *
 * @module
 */

/**
 * A secret value with metadata.
 */
export interface Secret {
  /** The secret key/name */
  key: string
  /** The secret value (undefined if not set) */
  value: string | undefined
  /** Whether the secret is required */
  required: boolean
  /** Human-readable description */
  description?: string
  /** URL with instructions on how to obtain this secret */
  helpUrl?: string
  /** Validation pattern (regex) */
  pattern?: string
  /** Example value (for documentation) */
  example?: string
}

/**
 * Secret definition used by packages to declare their requirements.
 */
export interface SecretDefinition {
  /** Environment variable name */
  key: string
  /** Human-readable description */
  description: string
  /** Whether this secret is required (default: true) */
  required?: boolean
  /** URL with instructions on how to obtain this secret */
  helpUrl?: string
  /** Validation regex pattern */
  pattern?: string
  /** Example value */
  example?: string
  /** Default value (for optional secrets) */
  default?: string
}

/**
 * Result of secret validation.
 */
export interface SecretValidation {
  key: string
  valid: boolean
  value?: string
  error?: string
}

/**
 * One secret's line in a boot-time configuration report.
 */
export interface ConfigReportEntry {
  /** The secret key. */
  key: string
  /** `set` (value present), `default` (unset but a default applies), or `missing`. */
  status: 'set' | 'default' | 'missing'
  /** Whether the secret is required (SecretDefinition.required, default true). */
  required: boolean
  /** Human-readable description from the registered definition. */
  description?: string
  /** Setup URL from the registered definition — where to obtain the value. */
  helpUrl?: string
}

/**
 * Structured boot-time configuration report (see `buildConfigReport`).
 */
export interface ConfigReport {
  /** `true` when no REQUIRED secret is missing. */
  ok: boolean
  /** Every reported secret. */
  entries: ConfigReportEntry[]
  /** Missing secrets that are required — the app is degraded until set. */
  missingRequired: ConfigReportEntry[]
  /** Missing secrets that are optional. */
  missingOptional: ConfigReportEntry[]
}

/**
 * Health check result for a service connection.
 */
export interface HealthCheckResult {
  service: string
  healthy: boolean
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}

/**
 * Secrets provider interface.
 *
 * Providers implement this interface to retrieve secrets from
 * different sources (env files, Doppler, Vault, etc.)
 */
export interface SecretsProvider {
  /** Provider name (for logging) */
  readonly name: string

  /**
   * Get a single secret value.
   */
  get(key: string): Promise<string | undefined>

  /**
   * Get multiple secret values.
   */
  getMany(keys: string[]): Promise<Record<string, string | undefined>>

  /**
   * Set a secret value (if supported by the provider).
   */
  set?(key: string, value: string): Promise<void>

  /**
   * Delete a secret (if supported by the provider).
   */
  delete?(key: string): Promise<void>

  /**
   * Check if the provider is available and configured.
   */
  isAvailable(): Promise<boolean>

  /**
   * Sync secrets from this provider to environment variables.
   * Call this at app startup to populate process.env.
   */
  syncToEnv?(keys: string[]): Promise<void>
}

/**
 * Service provisioner interface.
 *
 * Provisioners can automatically create accounts, API keys, or
 * resources for specific services.
 */
export interface ServiceProvisioner {
  /** Service name */
  readonly service: string

  /** Human-readable display name */
  readonly displayName: string

  /** Secrets this service provides */
  readonly secrets: SecretDefinition[]

  /**
   * Checks if the service is already configured with valid credentials.
   */
  isConfigured(): Promise<boolean>

  /**
   * Interactively provisions the service (may open a browser or prompt for input).
   */
  setup(options?: ProvisionerOptions): Promise<ProvisionerResult>

  /**
   * Validates that the current configuration works by connecting to the service.
   */
  validate(): Promise<HealthCheckResult>

  /**
   * Returns human-readable instructions for manual setup of this service.
   */
  getSetupInstructions(): string
}

/**
 * Options passed to a service provisioner's `setup()` method.
 */
export interface ProvisionerOptions {
  /** Run in non-interactive mode */
  nonInteractive?: boolean
  /** Secrets provider to store credentials */
  secretsProvider?: SecretsProvider
  /** Use test/sandbox mode if available */
  sandbox?: boolean
}

/**
 * Result returned by a service provisioner's `setup()` method.
 */
export interface ProvisionerResult {
  success: boolean
  secrets?: Record<string, string>
  error?: string
  message?: string
}

/**
 * Package-level secret manifest, mapping a package name to the secrets it
 * requires. Read from package metadata during CLI operations.
 */
export interface PackageSecrets {
  /** Package name */
  package: string
  /** Required secrets */
  secrets: SecretDefinition[]
}
