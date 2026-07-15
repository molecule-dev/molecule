# @molecule/api-resource-journal-entry

`@molecule/api-resource-journal-entry` — owner-scoped diary entries
with optional at-rest encryption, mood-score linkage, daily-write
streaks, and JSON/CSV/TXT export.

Extracted from the mental-health-journal flagship. When
`@molecule/api-encryption` is bonded, entry bodies are stored
encrypted-at-rest; otherwise the plaintext column is used (the read
path falls back automatically so key rotation never bricks reads).

## Quick Start

```ts
import { createJournalEntryRouter } from '@molecule/api-resource-journal-entry'
import express from 'express'

const app = express()
app.use('/api/journal', createJournalEntryRouter())
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-journal-entry @molecule/api-bonds-default-express @molecule/api-database @molecule/api-encryption @molecule/api-i18n @molecule/api-logger @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `CreateEntryInput`

Input fields accepted when creating a new journal entry.

```typescript
interface CreateEntryInput {
  mood?: MoodLevel
  title?: string
  body: string
  tags?: string[]
  prompt_id?: string | null
  written_at?: string | Date
}
```

#### `ExportRecord`

Flattened, export-friendly representation of a single journal entry.

```typescript
interface ExportRecord {
  id: string
  date: string
  title: string
  mood: MoodLevel
  tags: string[]
  word_count: number
  body: string
}
```

#### `JournalEntryRow`

Row shape persisted in `journal_entries`.

```typescript
interface JournalEntryRow {
  id: string
  user_id: string
  written_at: string | Date
  title: string | null
  body: string | null
  body_encrypted: string | null
  body_iv: string | null
  mood_id: string | null
  prompt_id: string | null
  activity_ids: unknown
  tags: unknown
  word_count: number
  ai_summary: string | null
  ai_themes: unknown
  is_private: boolean
  created_at: string | Date
}
```

#### `MoodEntryRow`

Row shape persisted in `mood_entries`.

```typescript
interface MoodEntryRow {
  id: string
  user_id: string
  recorded_at: string | Date
  score: number
  energy: number | null
  anxiety: number | null
  label: string | null
  activities: unknown
  notes: string | null
  journal_entry_id: string | null
  created_at: string | Date
}
```

#### `PublicJournalEntry`

Public-facing decrypted entry (returned by the service / routes).

```typescript
interface PublicJournalEntry {
  id: string
  date: string
  title: string
  preview: string
  body: string
  mood: MoodLevel
  tags: string[]
  word_count: number
  ai_summary: string | null
  ai_themes: string[]
  prompt: string | null
}
```

#### `UpdateEntryInput`

Fields that can be patched on an existing journal entry.

```typescript
interface UpdateEntryInput {
  mood?: MoodLevel
  title?: string
  body?: string
  tags?: string[]
}
```

### Types

#### `MoodLevel`

Discrete mood-level labels mapped to a 1..5 score.

```typescript
type MoodLevel = 'radiant' | 'good' | 'neutral' | 'low' | 'struggling'
```

### Functions

#### `computeStreak(userId)`

Daily-write streak: consecutive distinct UTC days ending today/yesterday.

```typescript
function computeStreak(userId: string): Promise<number>
```

#### `createEntryForOwner(userId, input)`

Create a journal entry and, if `mood` is provided, upsert today's
`mood_entries` row + link it to the journal entry.

```typescript
function createEntryForOwner(userId: string, input: CreateEntryInput): Promise<PublicJournalEntry | null>
```

#### `createJournalEntryRouter()`

Build the journal-entry router.

```typescript
function createJournalEntryRouter(): Router
```

#### `decryptIfNeeded(row)`

Decrypt the entry body if encryption is bonded; otherwise return plaintext.

```typescript
function decryptIfNeeded(row: JournalEntryRow): Promise<string>
```

#### `deleteEntryForOwner(userId, id)`

Owner-scoped delete — true if it deleted, false if not owned / missing.

```typescript
function deleteEntryForOwner(userId: string, id: string): Promise<boolean>
```

#### `exportEntries(userId, max?)`

Serialize all entries for an owner into an export-friendly array.

```typescript
function exportEntries(userId: string, max?: number): Promise<ExportRecord[]>
```

#### `formatExport(records, format)`

Format export records as JSON / CSV / TXT.

```typescript
function formatExport(records: ExportRecord[], format: "json" | "csv" | "txt"): { contentType: string; body: string; }
```

#### `getEntryForOwner(userId, id)`

Owner-scoped read — returns null when missing or not owned.

```typescript
function getEntryForOwner(userId: string, id: string): Promise<PublicJournalEntry | null>
```

#### `levelByScore(score)`

Round + clamp a raw score and return its discrete label.

```typescript
function levelByScore(score: number | null | undefined): MoodLevel
```

#### `listEntriesForOwner(userId, limit?)`

List the most-recent entries for an owner.

```typescript
function listEntriesForOwner(userId: string, limit?: number): Promise<PublicJournalEntry[]>
```

#### `normalizeScore(score)`

Normalize a 1..5 score to 0..1 (useful for sparkline charts).

```typescript
function normalizeScore(score: number | null | undefined): number
```

#### `shapeEntry(entry, body)`

Shape a row into the public-facing representation.

```typescript
function shapeEntry(entry: JournalEntryRow, body: string): Promise<PublicJournalEntry>
```

#### `updateEntryForOwner(userId, id, input)`

Owner-scoped patch update — returns null when missing or not owned.

```typescript
function updateEntryForOwner(userId: string, id: string, input: UpdateEntryInput): Promise<PublicJournalEntry | null>
```

### Constants

#### `createEntrySchema`

Validator for creating a new journal entry.

```typescript
const createEntrySchema: z.ZodObject<{ mood: z.ZodOptional<z.ZodEnum<{ radiant: "radiant"; good: "good"; neutral: "neutral"; low: "low"; struggling: "struggling"; }>>; title: z.ZodOptional<z.ZodString>; body: z.ZodString; tags: z.ZodOptional<z.ZodArray<z.ZodString>>; prompt_id: z.ZodOptional<z.ZodString>; written_at: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `moodLevelSchema`

Mood level enum used by journal-entry payloads.

```typescript
const moodLevelSchema: z.ZodEnum<{ radiant: "radiant"; good: "good"; neutral: "neutral"; low: "low"; struggling: "struggling"; }>
```

#### `SCORE_BY_LEVEL`

Maps each MoodLevel label to its corresponding numeric score (1..5).

```typescript
const SCORE_BY_LEVEL: Record<MoodLevel, number>
```

#### `updateEntrySchema`

Validator for updating an existing journal entry.

```typescript
const updateEntrySchema: z.ZodObject<{ mood: z.ZodOptional<z.ZodOptional<z.ZodEnum<{ radiant: "radiant"; good: "good"; neutral: "neutral"; low: "low"; struggling: "struggling"; }>>>; title: z.ZodOptional<z.ZodOptional<z.ZodString>>; tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>; prompt_id: z.ZodOptional<z.ZodOptional<z.ZodString>>; written_at: z.ZodOptional<z.ZodOptional<z.ZodString>>; body: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-encryption` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-encryption`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Schema lives in `__setup__/journal_entries.sql` — two tables:
`journal_entries` + `mood_entries`. Mood rows are upserted per
(user, day) so multiple entries in a day share one mood row.
