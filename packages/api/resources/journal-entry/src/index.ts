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
 * ```typescript
 * import express from 'express'
 *
 * import { setPool, setStore } from '@molecule/api-database'
 * import { pool, store } from '@molecule/api-database-postgresql'
 * import {
 *   computeStreak,
 *   createEntryForOwner,
 *   createJournalEntryRouter,
 * } from '@molecule/api-resource-journal-entry'
 *
 * // Startup: bond BOTH the DataStore and the raw pool (mood upserts and the streak use raw
 * // SQL). The postgresql bond reads DATABASE_URL. Mount AFTER the global auth middleware that
 * // sets res.locals.session (else every call 401s).
 * setPool(pool)
 * setStore(store)
 * const app = express()
 * app.use(express.json())
 * app.use('/api/journal', createJournalEntryRouter()) // /entries, /entries/:id, /streak, /export/:format
 *
 * // Server-side equivalent of POST /api/journal/entries, as the SESSION user:
 * const userId = 'user-123'
 * const entry = await createEntryForOwner(userId, {
 *   title: 'Morning pages',
 *   body: 'Slept well and went for a run before work.',
 *   mood: 'good', // 'radiant' | 'good' | 'neutral' | 'low' | 'struggling'
 *   tags: ['sleep', 'exercise'],
 * })
 * console.log(entry?.mood, entry?.word_count) // 'good' 9
 * console.log(await computeStreak(userId)) // consecutive UTC days with an entry, e.g. 1
 * ```
 *
 * @remarks
 * - **Bond `setPool(pool)` as well as `setStore(store)`.** Writing with a `mood`
 *   and `computeStreak` / `GET /streak` call raw `query()` from
 *   `@molecule/api-database`, and that SQL is PostgreSQL-only (`::date`,
 *   `to_char`) — with only a store bonded those paths throw.
 * - Schema lives in `__setup__/journal_entries.sql` — two tables:
 *   `journal_entries` + `mood_entries`. Mood rows are upserted per
 *   (user, day) so multiple entries in a day share one mood row.
 * - **Encryption does not remove the plaintext.** With `@molecule/api-encryption`
 *   bonded, `body_encrypted` is written — but the plaintext `body` column is
 *   still written too. Without a bond, only plaintext is stored.
 * - Everything is owner-scoped: service functions take the session `userId`
 *   first and return `null`/`false` for rows the caller doesn't own. The list
 *   endpoint returns a bare array (newest first, `?limit` 1–200, default 100),
 *   not a paginated envelope. `mood` is a word, not a number (`SCORE_BY_LEVEL`
 *   maps it to 1–5).
 * - `GET /export/:format` takes `json`, `csv` or `txt` (400 otherwise) and
 *   streams a download, not a JSON envelope.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual journal screens/flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip. This is a PRIVATE journal, so privacy is the defining requirement:
 * - [ ] Writing an entry persists its real fields — title, body, mood
 *   (radiant/good/neutral/low/struggling), tags, and date (written_at) — and
 *   the entry then appears in the author's journal list dated correctly (the
 *   list is newest-first by written_at) with a word_count matching the body.
 * - [ ] Editing an entry (title / body / mood / tags) and deleting one both
 *   reflect in the UI immediately AND survive a reload — the change persisted
 *   server-side, not just local state.
 * - [ ] If the UI filters or searches the list (by tag, mood, or date), only
 *   matching entries come back, and the mood shown per entry matches the mood
 *   saved for that day (mood rows upsert once per user per day).
 * - [ ] If a write streak or count is shown, it equals the number of
 *   consecutive distinct days the author actually wrote, counted on the UTC
 *   day boundary and ending today or yesterday — add or remove entries across
 *   a day boundary and confirm it recomputes; a JSON/CSV/TXT export downloads
 *   only the author's own entries.
 * - [ ] PRIVACY / AUTHORIZATION — entries are visible ONLY to their author.
 *   There is no sharing and no cross-user read path: signed in as a second
 *   user, requesting another user's entry id returns 404 (not-owned and truly
 *   missing are indistinguishable, so existence is never leaked), and the list
 *   and export return only your own rows — no admin or global view surfaces
 *   another user's entries. The owner is always the session user, never a
 *   userId taken from the request body, and journal content is never written
 *   to logs in the clear.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
