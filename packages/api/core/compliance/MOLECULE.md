# @molecule/api-compliance

Compliance core interface for molecule.dev.

Provides the `ComplianceProvider` interface for GDPR and data compliance
operations including user data export, deletion, consent management,
and data processing logs. Bond a concrete provider
(e.g. `@molecule/api-compliance-gdpr`) at startup via `setProvider()`.

## Type
`core`

## Installation
```bash
npm install @molecule/api-compliance
```

## Usage

```typescript
import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
import { provider } from '@molecule/api-compliance-gdpr'

// Wire the provider at startup
setProvider(provider)

// Export user data for a data portability request
const exportData = await exportUserData('user-123', 'json')

// Handle a deletion request (right to erasure)
const result = await deleteUserData('user-123', { retainLegalObligations: true })

// Manage user consent
await setConsent('user-123', { purpose: 'marketing', granted: false })
const consent = await getConsent('user-123')
```

## API

### Interfaces

#### `ComplianceConfig`

Configuration options for a compliance provider.

```typescript
interface ComplianceConfig {
  /** Data retention period in days. */
  retentionDays?: number

  /** Whether to automatically purge expired data. */
  autoPurge?: boolean

  /** Data categories managed by this provider. */
  categories?: DataCategory[]
}
```

#### `ComplianceProvider`

Compliance provider interface.

All compliance providers must implement this interface to provide
data export, deletion, consent management, and processing log
capabilities required by data protection regulations.

```typescript
interface ComplianceProvider {
  /**
   * Exports all data associated with a user in a portable format.
   *
   * @param userId - The identifier of the user whose data to export.
   * @param format - The export format (defaults to 'json').
   * @returns The exported user data package.
   */
  exportUserData(userId: string, format?: ExportFormat): Promise<UserDataExport>

  /**
   * Deletes user data according to the specified options. May retain
   * certain categories if required by legal obligations.
   *
   * @param userId - The identifier of the user whose data to delete.
   * @param options - Optional deletion parameters.
   * @returns The result of the deletion request.
   */
  deleteUserData(userId: string, options?: DeletionOptions): Promise<DeletionResult>

  /**
   * Retrieves the current consent record for a user.
   *
   * @param userId - The identifier of the user.
   * @returns The user's consent record.
   */
  getConsent(userId: string): Promise<ConsentRecord>

  /**
   * Updates consent for a specific data processing purpose.
   *
   * @param userId - The identifier of the user.
   * @param consent - The consent update to apply.
   */
  setConsent(userId: string, consent: ConsentUpdate): Promise<void>

  /**
   * Retrieves the data processing log for a user, showing all
   * recorded processing activities on their data.
   *
   * @param userId - The identifier of the user.
   * @returns Array of processing log entries.
   */
  getDataProcessingLog(userId: string): Promise<ProcessingLogEntry[]>
}
```

#### `ConsentEntry`

A single consent entry for a specific data processing purpose.

```typescript
interface ConsentEntry {
  /** The purpose or category of data processing. */
  purpose: string

  /** Whether consent has been granted. */
  granted: boolean

  /** When consent was last updated. */
  updatedAt: Date

  /** Legal basis for processing. */
  legalBasis?: LegalBasis
}
```

#### `ConsentRecord`

Full consent record for a user.

```typescript
interface ConsentRecord {
  /** The user this consent record belongs to. */
  userId: string

  /** Individual consent entries by purpose. */
  consents: ConsentEntry[]

  /** When the consent record was last modified. */
  updatedAt: Date
}
```

#### `ConsentUpdate`

Update payload for modifying user consent.

```typescript
interface ConsentUpdate {
  /** The purpose or category of data processing. */
  purpose: string

  /** Whether consent is being granted or revoked. */
  granted: boolean

  /** Legal basis for processing. */
  legalBasis?: LegalBasis
}
```

#### `DeletionOptions`

Options for user data deletion requests.

```typescript
interface DeletionOptions {
  /** Specific data categories to delete (defaults to all). */
  categories?: DataCategory[]

  /** Whether to retain data required by legal obligations. */
  retainLegalObligations?: boolean

  /** Reason for the deletion request. */
  reason?: string
}
```

#### `DeletionResult`

Result of a data deletion request.

```typescript
interface DeletionResult {
  /** The user whose data was deleted. */
  userId: string

  /** Current status of the deletion. */
  status: DeletionStatus

  /** Categories that were deleted. */
  deletedCategories: DataCategory[]

  /** Categories that were retained (e.g., for legal reasons). */
  retainedCategories: DataCategory[]

  /** Timestamp when the deletion was requested. */
  requestedAt: Date

  /** Timestamp when the deletion was completed (if applicable). */
  completedAt?: Date
}
```

#### `ProcessingLogEntry`

A log entry recording a data processing activity.

```typescript
interface ProcessingLogEntry {
  /** Unique identifier for the log entry. */
  id: string

  /** The user whose data was processed. */
  userId: string

  /** Description of the processing activity. */
  activity: string

  /** Data category that was processed. */
  category: DataCategory

  /** Legal basis for the processing. */
  legalBasis: LegalBasis

  /** Who or what performed the processing. */
  processor: string

  /** When the processing occurred. */
  timestamp: Date

  /** Additional details about the processing. */
  details?: Record<string, unknown>
}
```

#### `UserDataExport`

Exported user data package.

```typescript
interface UserDataExport {
  /** The user whose data was exported. */
  userId: string

  /** Timestamp when the export was generated. */
  exportedAt: Date

  /** Format of the exported data. */
  format: ExportFormat

  /** Exported data organized by category. */
  data: Record<string, unknown>

  /** Categories included in the export. */
  categories: DataCategory[]
}
```

### Types

#### `DataCategory`

Categories of user data that can be managed for compliance purposes.

```typescript
type DataCategory =
  | 'profile'
  | 'activity'
  | 'preferences'
  | 'communications'
  | 'billing'
  | 'analytics'
  | 'content'
  | 'authentication'
```

#### `DeletionStatus`

Status of a data deletion request.

```typescript
type DeletionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial'
```

#### `ExportFormat`

Supported data export formats.

```typescript
type ExportFormat = 'json' | 'csv'
```

#### `LegalBasis`

Legal bases for data processing under regulations like GDPR.

```typescript
type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests'
```

### Functions

#### `deleteUserData(userId, options)`

Deletes user data using the bonded provider.

```typescript
function deleteUserData(userId: string, options?: DeletionOptions): Promise<DeletionResult>
```

- `userId` — The identifier of the user whose data to delete.
- `options` — Optional deletion parameters.

**Returns:** The result of the deletion request.

#### `exportUserData(userId, format)`

Exports all data associated with a user using the bonded provider.

```typescript
function exportUserData(userId: string, format?: ExportFormat): Promise<UserDataExport>
```

- `userId` — The identifier of the user whose data to export.
- `format` — The export format (defaults to 'json').

**Returns:** The exported user data package.

#### `getConsent(userId)`

Retrieves the current consent record for a user using the bonded provider.

```typescript
function getConsent(userId: string): Promise<ConsentRecord>
```

- `userId` — The identifier of the user.

**Returns:** The user's consent record.

#### `getDataProcessingLog(userId)`

Retrieves the data processing log for a user using the bonded provider.

```typescript
function getDataProcessingLog(userId: string): Promise<ProcessingLogEntry[]>
```

- `userId` — The identifier of the user.

**Returns:** Array of processing log entries.

#### `getProvider()`

Retrieves the bonded compliance provider, throwing if none is configured.

```typescript
function getProvider(): ComplianceProvider
```

**Returns:** The bonded compliance provider.

#### `hasProvider()`

Checks whether a compliance provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a compliance provider is bonded.

#### `setConsent(userId, consent)`

Updates consent for a specific data processing purpose using the bonded provider.

```typescript
function setConsent(userId: string, consent: ConsentUpdate): Promise<void>
```

- `userId` — The identifier of the user.
- `consent` — The consent update to apply.

#### `setProvider(provider)`

Registers a compliance provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: ComplianceProvider): void
```

- `provider` — The compliance provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
