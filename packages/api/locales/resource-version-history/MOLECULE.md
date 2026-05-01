# @molecule/api-locales-resource-version-history

English-baseline locale bond for `@molecule/api-resource-version-history`.

Other languages should be added as sibling files (`es.ts`, `de.ts`, …)
mirroring the {@link VersionHistoryTranslations} shape, then re-exported here.

## Purpose

Provides translations for the `@molecule/api-resource-version-history` package which has 12 translation keys.

## Languages

1 language supported: en.

## Quick Start

```typescript
import { en } from '@molecule/api-locales-resource-version-history'
import type { VersionHistoryTranslationKey, VersionHistoryTranslations } from '@molecule/api-locales-resource-version-history'
```

## Translation Keys

| Key | English |
|-----|---------|
| `versionHistory.error.countFailed` | Failed to count versions |
| `versionHistory.error.createFailed` | Failed to create version |
| `versionHistory.error.diffFailed` | Failed to diff versions |
| `versionHistory.error.diffNotFound` | One or both versions not found, or they belong to different resources |
| `versionHistory.error.invalidVersion` | Version number must be a positive integer |
| `versionHistory.error.listFailed` | Failed to list versions |
| `versionHistory.error.missingId` | Version ID is required |
| `versionHistory.error.missingResource` | Resource type and ID are required |
| `versionHistory.error.notFound` | Version not found |
| `versionHistory.error.readFailed` | Failed to read version |
| `versionHistory.error.restoreFailed` | Failed to restore version |
| `versionHistory.error.validationFailed` | Validation failed |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-resource-version-history`
