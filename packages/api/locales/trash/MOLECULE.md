# @molecule/api-locales-trash

English-baseline locale bond for `@molecule/api-trash`.

Other languages should be added as sibling files (`es.ts`, `de.ts`, …)
mirroring the {@link TrashTranslations} shape, then re-exported here.

## Purpose

Provides translations for the `@molecule/api-trash` package which has 12 translation keys.

## Languages

1 language supported: en.

## Quick Start

```typescript
import { en } from '@molecule/api-locales-trash'
import type { TrashTranslationKey, TrashTranslations } from '@molecule/api-locales-trash'
```

## Translation Keys

| Key | English |
|-----|---------|
| `trash.error.alreadyResolved` | Trashed item has already been restored or purged |
| `trash.error.countFailed` | Failed to count trashed items |
| `trash.error.listFailed` | Failed to list trashed items |
| `trash.error.missingId` | Trash ID is required |
| `trash.error.missingResource` | Resource type and ID are required |
| `trash.error.notFound` | Trashed item not found |
| `trash.error.noRestoreHandler` | No restore handler is registered for this resource type |
| `trash.error.purgeFailed` | Failed to purge trashed item |
| `trash.error.readFailed` | Failed to read trashed item |
| `trash.error.restoreFailed` | Failed to restore trashed item |
| `trash.error.trashFailed` | Failed to trash item |
| `trash.error.validationFailed` | Validation failed |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-trash`
