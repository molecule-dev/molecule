# @molecule/api-compliance-gdpr

GDPR compliance provider for molecule.dev.

Implements the `ComplianceProvider` interface with in-memory storage
for consent records, processing logs, and data export/deletion.
Supports configurable data collectors, legal obligation retention,
and data category filtering for GDPR Article 15–20 compliance.

## Quick Start

```typescript
import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
import { provider } from '@molecule/api-compliance-gdpr'

// Wire the provider at startup (default config)
setProvider(provider)

// Or create with custom config
import { createProvider } from '@molecule/api-compliance-gdpr'
const customProvider = createProvider({
  retentionDays: 730,
  legalObligationCategories: ['billing', 'authentication'],
})
setProvider(customProvider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-compliance-gdpr
```

## API

### Interfaces

#### `DataCollector`

A function that collects user data for a specific category.

```typescript
interface DataCollector {
  /** The data category this collector handles. */
  category: DataCategory

  /**
   * Collects data for the given user.
   *
   * @param userId - The user whose data to collect.
   * @returns The collected data.
   */
  collect(userId: string): Promise<unknown>
}
```

#### `GdprConfig`

Configuration for the GDPR compliance provider.

```typescript
interface GdprConfig {
  /**
   * Data retention period in days. Data older than this is eligible for
   * automatic purging when `autoPurge` is enabled.
   *
   * @default 365
   */
  retentionDays?: number

  /**
   * Whether to automatically purge data that exceeds the retention period
   * during deletion requests.
   *
   * @default false
   */
  autoPurge?: boolean

  /**
   * Data categories managed by this provider. Defaults to all categories.
   */
  categories?: DataCategory[]

  /**
   * Categories that must be retained for legal obligations regardless
   * of deletion requests. These categories are excluded from deletion
   * unless `retainLegalObligations` is explicitly set to `false`.
   *
   * @default ['billing']
   */
  legalObligationCategories?: DataCategory[]

  /**
   * Default legal basis for data processing when none is specified.
   *
   * @default 'consent'
   */
  defaultLegalBasis?: LegalBasis

  /**
   * Callback invoked when user data is collected, for custom data
   * source integration. Providers can register data collectors that
   * are called during data export.
   */
  dataCollectors?: DataCollector[]
}
```

### Functions

#### `createProvider(config)`

Creates a GDPR compliance provider.

```typescript
function createProvider(config?: GdprConfig): ComplianceProvider
```

- `config` — Provider configuration.

**Returns:** A `ComplianceProvider` implementing GDPR compliance operations.

### Constants

#### `provider`

Default GDPR compliance provider instance.

Lazily initializes on first property access with default configuration.

```typescript
const provider: ComplianceProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-compliance` ^1.0.0
