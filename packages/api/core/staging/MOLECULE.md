# @molecule/api-staging

Staging environment management core interface for molecule.dev.

Defines the abstract `StagingDriver` interface for ephemeral branch-per-feature
environments. Driver packages (e.g. `@molecule/api-staging-docker-compose`)
implement this interface. The CLI orchestrates lifecycle operations.

## Type
`core`

## Installation
```bash
npm install @molecule/api-staging
```

## Usage

```typescript
import { setProvider, getProvider } from '@molecule/api-staging'
import { provider } from '@molecule/api-staging-docker-compose'

setProvider(provider)

const driver = getProvider()
if (driver) {
  const urls = await driver.up(env, config)
  console.log(`API: ${urls.api}, App: ${urls.app}`)
}
```

## API

### Interfaces

#### `EnvironmentHealth`

Health check result for a staging environment.

```typescript
interface EnvironmentHealth {
  /** Whether the environment is healthy overall. */
  readonly healthy: boolean

  /** API service health. */
  readonly api?: { readonly status: string; readonly latencyMs?: number }

  /** App service health. */
  readonly app?: { readonly status: string; readonly latencyMs?: number }
}
```

#### `EnvironmentLogs`

Log output from a staging environment.

```typescript
interface EnvironmentLogs {
  /** Log lines. */
  readonly lines: string[]

  /** Which service the logs are from. */
  readonly service: 'api' | 'app' | 'all'
}
```

#### `EnvironmentUrls`

URLs for a deployed staging environment.

```typescript
interface EnvironmentUrls {
  /** API server URL. */
  readonly api?: string

  /** Frontend app URL. */
  readonly app?: string
}
```

#### `StagingDriver`

Abstract staging driver interface.

All staging drivers must implement this contract. The CLI delegates
lifecycle operations (deploy, teardown, health, logs) to the bonded driver.

```typescript
interface StagingDriver {
  /** Driver name identifier. */
  readonly name: string

  /**
   * Checks whether the driver's prerequisites are met (e.g. Docker installed).
   *
   * @returns An object indicating whether prerequisites are met, and which are missing.
   */
  checkPrerequisites(): Promise<{ met: boolean; missing: string[] }>

  /**
   * Deploys or updates a staging environment for a branch.
   *
   * @param env - The staging environment descriptor.
   * @param config - Driver configuration.
   * @returns URLs for the deployed environment.
   */
  up(env: StagingEnvironment, config: StagingDriverConfig): Promise<EnvironmentUrls>

  /**
   * Tears down a staging environment.
   *
   * @param env - The staging environment to tear down.
   * @param config - Driver configuration.
   */
  down(env: StagingEnvironment, config: StagingDriverConfig): Promise<void>

  /**
   * Checks the health of a staging environment.
   *
   * @param env - The staging environment to check.
   * @param config - Driver configuration.
   * @returns Health status for each service.
   */
  health(env: StagingEnvironment, config: StagingDriverConfig): Promise<EnvironmentHealth>

  /**
   * Retrieves logs from a staging environment.
   *
   * @param env - The staging environment.
   * @param config - Driver configuration.
   * @param options - Log retrieval options.
   * @param options.service - Which service to retrieve logs for.
   * @param options.tail - Number of trailing lines to return.
   * @param options.follow - Whether to follow (stream) new log output.
   * @returns Log output.
   */
  logs(
    env: StagingEnvironment,
    config: StagingDriverConfig,
    options?: { service?: 'api' | 'app' | 'all'; tail?: number; follow?: boolean },
  ): Promise<EnvironmentLogs>

  /**
   * Lists all active environments managed by this driver.
   *
   * @param config - Driver configuration.
   * @returns Array of active staging environments.
   */
  list(config: StagingDriverConfig): Promise<StagingEnvironment[]>
}
```

#### `StagingDriverConfig`

Configuration for a staging driver instance.

```typescript
interface StagingDriverConfig {
  /** Driver name (e.g. `'docker-compose'`, `'fly-io'`). */
  readonly name: string

  /** Absolute path to the project root. */
  readonly projectPath: string

  /** Port range for dynamic environment allocation. */
  readonly portRange?: { readonly start: number; readonly end: number }

  /** Custom environment variable overrides for all staging environments. */
  readonly envOverrides?: Record<string, string>
}
```

#### `StagingEnvironment`

Represents an ephemeral staging environment tied to a git branch.

```typescript
interface StagingEnvironment {
  /** Unique slug derived from branch name. */
  readonly slug: string

  /** Original git branch name. */
  readonly branch: string

  /** Environment type identifier. */
  readonly type: 'staging' | 'preview' | 'development' | 'production'

  /** Full environment name (e.g. `'staging-feat-user-login'`). */
  readonly name: string

  /** ISO 8601 timestamp of when this environment was created. */
  readonly createdAt: string

  /** API URL for this environment, if deployed. */
  readonly apiUrl?: string

  /** App URL for this environment, if deployed. */
  readonly appUrl?: string

  /** Name of the driver managing this environment. */
  readonly driver: string

  /** Driver-specific metadata. */
  readonly driverMeta?: Record<string, unknown>
}
```

### Functions

#### `branchToSlug(branch, maxLength)`

Converts a git branch name to a DNS-safe, filesystem-safe slug.

```typescript
function branchToSlug(branch: string, maxLength?: number): string
```

- `branch` — The git branch name (e.g. `'feature/user-login'`).
- `maxLength` — Maximum slug length (default: 40).

**Returns:** A lowercase, hyphenated slug.

#### `getProvider()`

Retrieves the bonded staging driver, or `null` if none is bonded.

```typescript
function getProvider(): StagingDriver | null
```

**Returns:** The bonded staging driver, or `null`.

#### `hasProvider()`

Checks whether a staging driver is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a staging driver is bonded.

#### `setProvider(driver)`

Registers a staging driver as the active singleton.
Called by driver packages during application startup.

```typescript
function setProvider(driver: StagingDriver): void
```

- `driver` — The staging driver implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Docker Compose | `@molecule/api-staging-docker-compose` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
