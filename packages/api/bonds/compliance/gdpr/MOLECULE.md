# @molecule/api-compliance-gdpr

GDPR compliance provider for molecule.dev.

Implements the `ComplianceProvider` interface with in-memory storage
for consent records, processing logs, and data export/deletion
bookkeeping. Supports configurable data collectors, legal obligation
retention, and data category filtering for GDPR Article 15–20 compliance.

## Quick Start

```typescript
import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
import { createProvider } from '@molecule/api-compliance-gdpr'

setProvider(createProvider({
  legalObligationCategories: ['billing', 'authentication'],
  dataCollectors: [
    {
      category: 'profile',
      collect: async (userId) => findOne('users', { id: userId }),
      delete: async (userId) => { await deleteById('users', userId) },
    },
  ],
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-compliance-gdpr @molecule/api-compliance
```

## API

### Interfaces

#### `DataCollector`

Bridges the provider to a real data source for one data category.

`collect()` is invoked by `exportUserData()`. `delete()`, if implemented,
is invoked by `deleteUserData()` to actually erase the user's data for
this category — without it, that category is left in place and reported
as skipped (never as a false `'completed'`).

```typescript
interface DataCollector {
  /** The data category this collector handles. */
  category: DataCategory

  /**
   * Collects data for the given user (used by `exportUserData()`).
   *
   * @param userId - The user whose data to collect.
   * @returns The collected data.
   */
  collect(userId: string): Promise<unknown>

  /**
   * Erases this collector's data for the given user (used by
   * `deleteUserData()`).
   *
   * OPTIONAL so existing collect-only collectors keep compiling — but a
   * collector WITHOUT this hook cannot be erased: `deleteUserData()` will
   * not count its category as deleted and will report a non-`'completed'`
   * status. Implement it to make right-to-erasure real. It should be
   * idempotent; a rejection propagates out of `deleteUserData()` (the call
   * fails loudly rather than claiming success) and the caller may retry.
   *
   * @param userId - The user whose data to erase.
   * @returns Resolves once this category's data has been erased.
   */
  delete?(userId: string): Promise<void>
}
```

#### `GdprConfig`

Configuration for the GDPR compliance provider.

```typescript
interface GdprConfig {
  /**
   * NOT IMPLEMENTED — currently ignored by the provider (no purging logic
   * consumes it). Reserved for a future retention sweep.
   *
   * @default 365
   */
  retentionDays?: number

  /**
   * NOT IMPLEMENTED — currently ignored by the provider; no automatic
   * purging occurs regardless of this setting.
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
   * Data collectors for custom data-source integration, one per category.
   * `collect()` feeds `exportUserData()`; the optional `delete()` hook is
   * what makes `deleteUserData()` actually erase that category's data. A
   * category with no delete-capable collector is NOT erased and cannot be
   * reported as deleted.
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

## Core Interface
Implements `@molecule/api-compliance` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-compliance'
import { provider } from '@molecule/api-compliance-gdpr'

export function setupComplianceGdpr(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-compliance` ^1.0.0

### Runtime Dependencies

- `@molecule/api-compliance`

- **Erasure runs through your `DataCollector.delete` hooks.**
  `deleteUserData()` calls the optional `delete(userId)` on every registered
  collector whose category is being erased, and returns `status: 'completed'`
  only when every requested (non-legally-retained) category was actually
  erased. A category with no delete-capable collector is left in place and
  reported as skipped — the result comes back `'partial'` (some erased) or
  `'failed'` (none erased), never a false `'completed'`. So register a
  `delete`-capable collector per category you manage; a `collect`-only
  collector still exports but does NOT erase.
- **`exportUserData()` returns an empty `data` object unless you register
  `dataCollectors`** — one per data category, each `collect()` returning that
  user's data from your real sources. Without them the export contains only
  in-memory consent entries.
- **All state is in process memory.** Consent records, processing logs, and
  deletion receipts are lost on restart and are not shared across
  instances. Persist consent changes in your own database if you need a
  durable Art. 7 / Art. 30 trail.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A logged-in user can export their own data from the UI and the export
  contains their data — and only theirs.
- [ ] Requesting an export or deletion for a DIFFERENT user's id (e.g. by
  editing the request) is rejected server-side — not merely hidden in the UI.
- [ ] The deletion flow requires an explicit confirmation, completes, and the
  user's content is gone after a full reload; any retained categories are
  stated in the UI.
- [ ] Toggling a consent purpose off persists (survives reload) and the
  consent-scoped behavior actually stops.
