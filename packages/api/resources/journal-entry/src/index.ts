/**
 * `@molecule/api-resource-journal-entry` — owner-scoped diary entries
 * with optional at-rest encryption, mood-score linkage, daily-write
 * streaks, and JSON/CSV/TXT export.
 *
 * Extracted from the mental-health-journal flagship. When
 * `@molecule/api-encryption` is bonded, entry bodies are stored
 * encrypted-at-rest; otherwise the plaintext column is used (the read
 * path falls back automatically so key rotation never bricks reads).
 *
 * @example
 * ```ts
 * import { createJournalEntryRouter } from '@molecule/api-resource-journal-entry'
 * import express from 'express'
 *
 * const app = express()
 * app.use('/api/journal', createJournalEntryRouter())
 * ```
 *
 * @remarks
 * Schema lives in `__setup__/journal_entries.sql` — two tables:
 * `journal_entries` + `mood_entries`. Mood rows are upserted per
 * (user, day) so multiple entries in a day share one mood row.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
