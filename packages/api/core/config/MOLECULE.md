# @molecule/api-config

Configuration core interface for molecule.dev.

Defines the standard interface for configuration providers with
typed accessors for strings, numbers, booleans, and JSON values.

## Type
`core`

## Installation
```bash
npm install @molecule/api-config
```

## Usage

```typescript
import {
  setProvider,
  get,
  getRequired,
  getNumber,
  getBoolean,
  getJson,
  has,
  validate,
} from '@molecule/api-config'
import { provider } from '@molecule/api-config-env'

// Wire the provider at app startup
setProvider(provider)

// Get configuration values
const apiKey = getRequired('API_KEY')
const port = getNumber('PORT', 3000)
const debug = getBoolean('DEBUG', false)
const config = getJson('APP_CONFIG', {})

// Validate configuration schema
const result = validate([
  { key: 'DATABASE_URL', required: true },
  { key: 'PORT', type: 'number', min: 1, max: 65535 },
])
```

## API

### Interfaces

#### `ConfigProvider`

Configuration provider interface.

All configuration providers must implement this interface.

```typescript
interface ConfigProvider {
  /**
   * Gets a configuration value.
   *
   * @param key - Configuration key
   * @param defaultValue - Default value if not found
   */
  get<T = string>(key: string, defaultValue?: T): T | undefined

  /**
   * Gets a required configuration value.
   *
   * @param key - Configuration key
   * @throws {Error} Error if the key is not found
   */
  getRequired<T = string>(key: string): T

  /**
   * Gets all configuration values.
   */
  getAll(): Record<string, unknown>

  /**
   * Checks if a configuration key exists.
   */
  has(key: string): boolean

  /**
   * Sets a configuration value (runtime override).
   */
  set?(key: string, value: unknown): void

  /**
   * Validates configuration against a schema.
   */
  validate?(schema: ConfigSchema[]): ConfigValidationResult

  /**
   * Reloads configuration from sources.
   */
  reload?(): Promise<void>

  /**
   * Watches for configuration changes.
   */
  watch?(callback: (key: string, value: unknown) => void): () => void
}
```

#### `ConfigSchema`

Configuration schema for a single value.

```typescript
interface ConfigSchema {
  /**
   * Configuration key (e.g., 'DATABASE_URL', 'API_KEY').
   */
  key: string

  /**
   * Human-readable description.
   */
  description?: string

  /**
   * Expected type.
   */
  type?: 'string' | 'number' | 'boolean' | 'json'

  /**
   * Whether this configuration is required.
   */
  required?: boolean

  /**
   * Default value if not provided.
   */
  default?: unknown

  /**
   * Whether this is a secret (should not be logged).
   */
  secret?: boolean

  /**
   * Validation pattern (regex for strings).
   */
  pattern?: string

  /**
   * Minimum value (for numbers).
   */
  min?: number

  /**
   * Maximum value (for numbers).
   */
  max?: number

  /**
   * Allowed values.
   */
  enum?: unknown[]
}
```

#### `ConfigValidationResult`

Configuration validation result.

```typescript
interface ConfigValidationResult {
  /**
   * Whether validation passed.
   */
  valid: boolean

  /**
   * Validation errors.
   */
  errors: Array<{
    key: string
    message: string
  }>

  /**
   * Warnings (non-fatal issues).
   */
  warnings: Array<{
    key: string
    message: string
  }>
}
```

### Functions

#### `get(key, defaultValue)`

Retrieves a configuration value by key, with an optional default.

```typescript
function get(key: string, defaultValue?: T): T | undefined
```

- `key` — The configuration key (e.g. `'DATABASE_URL'`, `'API_KEY'`).
- `defaultValue` — Value to return if the key is not found.

**Returns:** The configuration value cast to `T`, or `undefined` / `defaultValue` if not found.

#### `getBoolean(key, defaultValue)`

Retrieves a configuration value parsed as a boolean. Recognizes `'true'`, `'1'`,
and `'yes'` (case-insensitive) as `true`; everything else is `false`.

```typescript
function getBoolean(key: string, defaultValue?: boolean): boolean | undefined
```

- `key` — The configuration key.
- `defaultValue` — Value to return if the key is not found.

**Returns:** The boolean value, or `undefined` / `defaultValue`.

#### `getJson(key, defaultValue)`

Retrieves a configuration value parsed as JSON. Returns the default value
if the key is missing or the value is not valid JSON.

```typescript
function getJson(key: string, defaultValue?: T): T | undefined
```

- `key` — The configuration key.
- `defaultValue` — Value to return if the key is missing or JSON parsing fails.

**Returns:** The parsed JSON value cast to `T`, or `undefined` / `defaultValue`.

#### `getNumber(key, defaultValue)`

Retrieves a configuration value parsed as a number. Returns the default
value if the key is missing or the value is not a valid number.

```typescript
function getNumber(key: string, defaultValue?: number): number | undefined
```

- `key` — The configuration key.
- `defaultValue` — Value to return if the key is missing or not a number.

**Returns:** The parsed number, or `undefined` / `defaultValue`.

#### `getProvider()`

Retrieves the bonded configuration provider, throwing if none is configured.

```typescript
function getProvider(): ConfigProvider
```

**Returns:** The bonded configuration provider.

#### `getRequired(key)`

Retrieves a configuration value by key, throwing if not found. Use this for
values that must be present for the application to function.

```typescript
function getRequired(key: string): T
```

- `key` — The configuration key.

**Returns:** The configuration value cast to `T`.

#### `getString(key, defaultValue)`

Retrieves a configuration value as a string.

```typescript
function getString(key: string, defaultValue?: string): string | undefined
```

- `key` — The configuration key.
- `defaultValue` — Value to return if the key is not found.

**Returns:** The string value, or `undefined` / `defaultValue` if not found.

#### `has(key)`

Checks whether a configuration key exists (has a defined value).

```typescript
function has(key: string): boolean
```

- `key` — The configuration key to check.

**Returns:** `true` if the key exists in the configuration.

#### `hasProvider()`

Checks whether a configuration provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a configuration provider is bonded.

#### `setProvider(provider)`

Registers a configuration provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ConfigProvider): void
```

- `provider` — The configuration provider implementation to bond.

#### `validate(schema)`

Validates the current configuration against an array of schema rules.
Returns validation errors and warnings. Throws if the provider doesn't
support validation.

```typescript
function validate(schema: ConfigSchema[]): ConfigValidationResult
```

- `schema` — Array of configuration schema rules to validate against.

**Returns:** The validation result containing `valid`, `errors`, and `warnings`.

## Available Providers

| Provider | Package |
|----------|---------|
| Environment | `@molecule/api-config-env` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-config`.
