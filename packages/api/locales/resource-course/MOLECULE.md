# @molecule/api-locales-resource-course

Course resource locale bond for molecule.dev.

Provides type-safe translations for `@molecule/api-resource-course`'s
error keys. Wire by importing the resource package's `i18n.ts` (which calls
`registerLocaleModule` on this package).

## Purpose

Provides translations for the `@molecule/api-resource-course` package which has 3 translation keys.

## Languages

1 language supported: en.

## Quick Start

```typescript
import { en } from '@molecule/api-locales-resource-course'
import type { ResourceCourseTranslationKey, ResourceCourseTranslations } from '@molecule/api-locales-resource-course'
```

## Translation Keys

| Key | English |
|-----|---------|
| `resourceCourse.error.courseNotFound` | Course not found. |
| `resourceCourse.error.notCourseStaff` | You do not have permission to manage this course. |
| `resourceCourse.error.notEnrolled` | You are not enrolled in this course. |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-resource-course`
