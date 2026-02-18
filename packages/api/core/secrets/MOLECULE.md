# @molecule/api-secrets

Secrets management core interface for molecule.dev.

Provides a standardized way to:
- Define required secrets for packages
- Retrieve secrets from various providers (env, Doppler, Vault, etc.)
- Validate secrets at startup
- Auto-provision services

## Type
`core`

## Installation
```bash
npm install @molecule/api-secrets
```

## Usage

```typescript
import { get, getRequired, validate, COMMON_SECRETS } from '@molecule/api-secrets'

// Get a secret (returns undefined if not set)
const apiKey = await get('STRIPE_SECRET_KEY')

// Get a required secret (throws if not set)
const dbUrl = await getRequired('DATABASE_URL')

// Validate multiple secrets
const results = await validate([
  COMMON_SECRETS.DATABASE_URL,
  COMMON_SECRETS.STRIPE_SECRET_KEY,
])
```

## API

### Interfaces

#### `HealthCheckResult`

Health check result for a service connection.

```typescript
interface HealthCheckResult {
  service: string
  healthy: boolean
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}
```

#### `PackageSecrets`

Package-level secret manifest, mapping a package name to the secrets it
requires. Read from package metadata during CLI operations.

```typescript
interface PackageSecrets {
  /** Package name */
  package: string
  /** Required secrets */
  secrets: SecretDefinition[]
}
```

#### `ProvisionerOptions`

Options passed to a service provisioner's `setup()` method.

```typescript
interface ProvisionerOptions {
  /** Run in non-interactive mode */
  nonInteractive?: boolean
  /** Secrets provider to store credentials */
  secretsProvider?: SecretsProvider
  /** Use test/sandbox mode if available */
  sandbox?: boolean
}
```

#### `ProvisionerResult`

Result returned by a service provisioner's `setup()` method.

```typescript
interface ProvisionerResult {
  success: boolean
  secrets?: Record<string, string>
  error?: string
  message?: string
}
```

#### `Secret`

A secret value with metadata.

```typescript
interface Secret {
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
```

#### `SecretDefinition`

Secret definition used by packages to declare their requirements.

```typescript
interface SecretDefinition {
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
```

#### `SecretsProvider`

Secrets provider interface.

Providers implement this interface to retrieve secrets from
different sources (env files, Doppler, Vault, etc.)

```typescript
interface SecretsProvider {
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
```

#### `SecretValidation`

Result of secret validation.

```typescript
interface SecretValidation {
  key: string
  valid: boolean
  value?: string
  error?: string
}
```

#### `ServiceProvisioner`

Service provisioner interface.

Provisioners can automatically create accounts, API keys, or
resources for specific services.

```typescript
interface ServiceProvisioner {
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
```

### Functions

#### `get(key)`

Retrieves a single secret value. Delegates to the bonded provider if
available, otherwise reads from `process.env`.

```typescript
function get(key: string): Promise<string | undefined>
```

- `key` — The environment variable / secret key name.

**Returns:** The secret value, or `undefined` if not set.

#### `getAllProvisioners()`

Returns all registered service provisioners.

```typescript
function getAllProvisioners(): ServiceProvisioner[]
```

**Returns:** An array of all registered provisioners.

#### `getAllSecretDefinitions()`

Returns all registered secret definitions from both dynamic registration
and pre-registered common secrets.

```typescript
function getAllSecretDefinitions(): SecretDefinition[]
```

**Returns:** An array of all registered secret definitions.

#### `getMany(keys)`

Retrieves multiple secret values at once. Delegates to the bonded
provider if available, otherwise reads from `process.env`.

```typescript
function getMany(keys: string[]): Promise<Record<string, string | undefined>>
```

- `keys` — The secret key names to retrieve.

**Returns:** A record mapping each key to its value (or `undefined`).

#### `getProvider()`

Retrieves the bonded secrets provider, or `null` if none is bonded.

```typescript
function getProvider(): SecretsProvider | null
```

**Returns:** The bonded secrets provider, or `null`.

#### `getProvisioner(service)`

Retrieves a registered service provisioner by service name.

```typescript
function getProvisioner(service: string): ServiceProvisioner | undefined
```

- `service` — The service name (e.g. `'stripe'`, `'sendgrid'`).

**Returns:** The provisioner, or `undefined` if not registered.

#### `getProvisionerForSecret(key)`

Finds the provisioner whose `secrets` array includes the given key.

```typescript
function getProvisionerForSecret(key: string): ServiceProvisioner | undefined
```

- `key` — The secret key to search for.

**Returns:** The provisioner that owns the secret, or `undefined`.

#### `getRequired(key)`

Retrieves a secret value, throwing if it is not set.

```typescript
function getRequired(key: string): Promise<string>
```

- `key` — The environment variable / secret key name.

**Returns:** The secret value (guaranteed non-empty).

#### `getSecretDefinition(key)`

Looks up a secret definition by key. Checks the dynamic registry first
(populated by provider bonds), then falls back to `COMMON_SECRETS`.

```typescript
function getSecretDefinition(key: string): SecretDefinition | undefined
```

- `key` — The secret key to look up.

**Returns:** The secret definition, or `undefined` if not registered.

#### `getSecretDefinitions(keys)`

Looks up secret definitions for a list of keys, filtering out any
keys that have no registered definition.

```typescript
function getSecretDefinitions(keys: string[]): SecretDefinition[]
```

- `keys` — The secret keys to look up.

**Returns:** The matching secret definitions (keys without definitions are omitted).

#### `hasProvider()`

Checks whether a secrets provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a secrets provider is bonded.

#### `isConfigured(definitions)`

Checks whether all required secrets in the given definitions are set and valid.

```typescript
function isConfigured(definitions: SecretDefinition[]): Promise<boolean>
```

- `definitions` — The secret definitions to check.

**Returns:** `true` if every definition passes validation.

#### `registerProvisioner(provisioner)`

Registers a service provisioner so the CLI can discover and
auto-provision the service.

```typescript
function registerProvisioner(provisioner: ServiceProvisioner): void
```

- `provisioner` — The provisioner to register, keyed by its `service` name.

#### `registerSecret(definition)`

Registers a single secret definition. Provider bonds call this to
declare their required secrets at import time.

```typescript
function registerSecret(definition: SecretDefinition): void
```

- `definition` — The secret definition to register.

#### `registerSecrets(definitions)`

Registers multiple secret definitions at once.

```typescript
function registerSecrets(definitions: SecretDefinition[]): void
```

- `definitions` — The secret definitions to register.

#### `resolveAll(keys)`

Resolves all registered secret definitions and syncs them into `process.env`.
Call this at application startup after bonding a secrets provider and before
initializing other bonds. Bond packages register their required secrets
via `registerSecrets()`, and this function fetches them all at once.

```typescript
function resolveAll(keys?: string[]): Promise<void>
```

- `keys` — Optional explicit list of keys to resolve; if omitted, resolves all registered definitions.

#### `setProvider(provider)`

Registers a secrets provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: SecretsProvider): void
```

- `provider` — The secrets provider implementation to bond.

#### `syncToEnv(keys)`

Fetches secrets from the bonded provider and writes them into `process.env`.
Call this at application startup before other modules access secrets.

```typescript
function syncToEnv(keys: string[]): Promise<void>
```

- `keys` — The secret key names to sync into `process.env`.

#### `validate(definitions)`

Validates a list of secret definitions against the current environment,
checking presence and optional pattern matching. Values are masked in
the returned results.

```typescript
function validate(definitions: SecretDefinition[]): Promise<SecretValidation[]>
```

- `definitions` — The secret definitions to validate.

**Returns:** One validation result per definition, each with `valid` and optional `error`.

### Constants

#### `COMMON_SECRETS` *(deprecated)*

Common secret definitions — only generic application-level secrets.

Vendor-specific secrets (SendGrid, Stripe, AWS, etc.) are registered
by their respective provider bonds. Use `registerSecret()` to add
new definitions at runtime.

```typescript
const COMMON_SECRETS: Record<string, SecretDefinition>
```

## Available Providers

| Provider | Package |
|----------|---------|
| Doppler | `@molecule/api-secrets-doppler` |
| Environment Variables | `@molecule/api-secrets-env` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-secrets`.
