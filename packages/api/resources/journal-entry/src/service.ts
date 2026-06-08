/**
 * Pure service-layer helpers for the journal-entry resource. Usable
 * outside of HTTP contexts (background jobs, exports, AI pipelines).
 *
 * @module
 */

import { create, deleteById, findById, findMany, query, updateById } from '@molecule/api-database'
import { decrypt, encrypt, hasProvider as hasEncryption } from '@molecule/api-encryption'

import {
  type JournalEntryRow,
  levelByScore,
  type MoodEntryRow,
  type MoodLevel,
  type PublicJournalEntry,
  SCORE_BY_LEVEL,
} from './types.js'

const TABLE = 'journal_entries'
const MOOD_TABLE = 'mood_entries'

/** Coerce a date-like value to an ISO-8601 string, defaulting to now. */
function toIso(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString()
  return new Date(d).toISOString()
}

/** Parse a JSON string into a typed array, returning `[]` on invalid input. */
function toJsonArray<T = unknown>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch (_error) {
      // raw is not valid JSON — safe to return an empty array
      return []
    }
  }
  return []
}

/** Trim an entry body to a 200-character preview, collapsing whitespace. */
function previewText(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= 200) return collapsed
  return collapsed.slice(0, 197) + '…'
}

/** Decrypt the entry body if encryption is bonded; otherwise return plaintext. */
export async function decryptIfNeeded(row: JournalEntryRow): Promise<string> {
  if (row.body_encrypted && hasEncryption()) {
    try {
      return await decrypt(row.body_encrypted, row.user_id)
    } catch (_error) {
      // Decryption failed — fall back to the plaintext column so the entry remains readable
    }
  }
  return row.body ?? ''
}

/** Resolve the mood level for a journal entry by looking up its linked mood row. */
async function moodLevelForEntry(entry: JournalEntryRow): Promise<MoodLevel> {
  if (entry.mood_id) {
    const mood = await findById<MoodEntryRow>(MOOD_TABLE, entry.mood_id)
    if (mood) return levelByScore(mood.score)
  }
  return 'neutral'
}

/** Shape a row into the public-facing representation. */
export async function shapeEntry(
  entry: JournalEntryRow,
  body: string,
): Promise<PublicJournalEntry> {
  return {
    id: entry.id,
    date: toIso(entry.written_at),
    title: entry.title ?? '',
    preview: previewText(body),
    body,
    mood: await moodLevelForEntry(entry),
    tags: toJsonArray<string>(entry.tags),
    word_count: entry.word_count,
    ai_summary: entry.ai_summary,
    ai_themes: toJsonArray<string>(entry.ai_themes),
    prompt: entry.prompt_id,
  }
}

/** List the most-recent entries for an owner. */
export async function listEntriesForOwner(
  userId: string,
  limit = 100,
): Promise<PublicJournalEntry[]> {
  const rows = await findMany<JournalEntryRow>(TABLE, {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'written_at', direction: 'desc' }],
    limit,
  })
  const out: PublicJournalEntry[] = []
  for (const row of rows) out.push(await shapeEntry(row, await decryptIfNeeded(row)))
  return out
}

/** Owner-scoped read — returns null when missing or not owned. */
export async function getEntryForOwner(
  userId: string,
  id: string,
): Promise<PublicJournalEntry | null> {
  const row = await findById<JournalEntryRow>(TABLE, id)
  if (!row || row.user_id !== userId) return null
  return shapeEntry(row, await decryptIfNeeded(row))
}

/** Input fields accepted when creating a new journal entry. */
export interface CreateEntryInput {
  mood?: MoodLevel
  title?: string
  body: string
  tags?: string[]
  prompt_id?: string | null
  written_at?: string | Date
}

/**
 * Create a journal entry and, if `mood` is provided, upsert today's
 * `mood_entries` row + link it to the journal entry.
 */
export async function createEntryForOwner(
  userId: string,
  input: CreateEntryInput,
): Promise<PublicJournalEntry | null> {
  let moodId: string | null = null
  if (input.mood) {
    const score = SCORE_BY_LEVEL[input.mood]
    const sameDay = await query<{ id: string }>(
      `SELECT id FROM ${MOOD_TABLE}
         WHERE user_id = $1 AND recorded_at::date = NOW()::date
         ORDER BY recorded_at DESC LIMIT 1`,
      [userId],
    )
    if (sameDay.rows.length > 0) {
      moodId = sameDay.rows[0].id
      await updateById(MOOD_TABLE, moodId, { score, label: input.mood })
    } else {
      const created = await create<MoodEntryRow>(MOOD_TABLE, {
        user_id: userId,
        score,
        label: input.mood,
        activities: '[]',
        recorded_at: new Date(),
        created_at: new Date(),
      })
      moodId = (created.data as { id?: string } | null)?.id ?? null
    }
  }

  const writtenAt = input.written_at ? new Date(input.written_at) : new Date()
  const wordCount = input.body.split(/\s+/).filter(Boolean).length

  let bodyEncrypted: string | null = null
  if (hasEncryption()) {
    bodyEncrypted = await encrypt(input.body, userId)
  }

  const result = await create<JournalEntryRow>(TABLE, {
    user_id: userId,
    title: input.title ?? null,
    body: input.body,
    body_encrypted: bodyEncrypted,
    body_iv: null,
    mood_id: moodId,
    prompt_id: input.prompt_id ?? null,
    activity_ids: '[]',
    tags: JSON.stringify(input.tags ?? []),
    word_count: wordCount,
    ai_summary: null,
    ai_themes: null,
    is_private: true,
    written_at: writtenAt,
    created_at: new Date(),
  })
  const entryId = (result.data as { id?: string } | null)?.id ?? null
  if (moodId && entryId) {
    await updateById(MOOD_TABLE, moodId, { journal_entry_id: entryId })
  }
  if (!entryId) return null
  const full = await findById<JournalEntryRow>(TABLE, entryId)
  if (!full) return null
  return shapeEntry(full, await decryptIfNeeded(full))
}

/** Fields that can be patched on an existing journal entry. */
export interface UpdateEntryInput {
  mood?: MoodLevel
  title?: string
  body?: string
  tags?: string[]
}

/** Owner-scoped patch update — returns null when missing or not owned. */
export async function updateEntryForOwner(
  userId: string,
  id: string,
  input: UpdateEntryInput,
): Promise<PublicJournalEntry | null> {
  const existing = await findById<JournalEntryRow>(TABLE, id)
  if (!existing || existing.user_id !== userId) return null
  const patch: Record<string, unknown> = { updated_at: new Date() }
  if (input.title !== undefined) patch.title = input.title
  if (input.body !== undefined) {
    patch.body = input.body
    patch.word_count = input.body.split(/\s+/).filter(Boolean).length
    if (hasEncryption()) patch.body_encrypted = await encrypt(input.body, userId)
  }
  if (input.tags !== undefined) patch.tags = JSON.stringify(input.tags)
  if (input.mood) {
    const score = SCORE_BY_LEVEL[input.mood]
    if (existing.mood_id) {
      await updateById(MOOD_TABLE, existing.mood_id, { score, label: input.mood })
    } else {
      const created = await create<MoodEntryRow>(MOOD_TABLE, {
        user_id: userId,
        score,
        label: input.mood,
        activities: '[]',
        recorded_at: new Date(),
        created_at: new Date(),
        journal_entry_id: id,
      })
      patch.mood_id = (created.data as { id?: string } | null)?.id ?? null
    }
  }
  await updateById(TABLE, id, patch)
  const updated = await findById<JournalEntryRow>(TABLE, id)
  if (!updated) return null
  return shapeEntry(updated, await decryptIfNeeded(updated))
}

/** Owner-scoped delete — true if it deleted, false if not owned / missing. */
export async function deleteEntryForOwner(userId: string, id: string): Promise<boolean> {
  const existing = await findById<JournalEntryRow>(TABLE, id)
  if (!existing || existing.user_id !== userId) return false
  await deleteById(TABLE, id)
  return true
}

/** Daily-write streak: consecutive distinct UTC days ending today/yesterday. */
export async function computeStreak(userId: string): Promise<number> {
  const { rows } = await query<{ day: string }>(
    `SELECT DISTINCT to_char(written_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
       FROM ${TABLE}
       WHERE user_id = $1
       ORDER BY day DESC
       LIMIT 365`,
    [userId],
  )
  if (rows.length === 0) return 0
  const set = new Set(rows.map((r) => r.day))
  let streak = 0
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10)
    if (set.has(iso)) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else if (i === 0) {
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else {
      break
    }
  }
  return streak
}

/** Flattened, export-friendly representation of a single journal entry. */
export interface ExportRecord {
  id: string
  date: string
  title: string
  mood: MoodLevel
  tags: string[]
  word_count: number
  body: string
}

/** Serialize all entries for an owner into an export-friendly array. */
export async function exportEntries(userId: string, max = 10_000): Promise<ExportRecord[]> {
  const entries = await findMany<JournalEntryRow>(TABLE, {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'written_at', direction: 'desc' }],
    limit: max,
  })
  const decrypted = await Promise.all(entries.map((entry) => decryptIfNeeded(entry)))
  return Promise.all(
    entries.map(async (entry, i) => ({
      id: entry.id,
      date: toIso(entry.written_at),
      title: entry.title ?? '',
      mood: await moodLevelForEntry(entry),
      tags: toJsonArray<string>(entry.tags),
      word_count: entry.word_count,
      body: decrypted[i],
    })),
  )
}

/** Escape a value for inclusion in a CSV cell, quoting if necessary. */
function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Format export records as JSON / CSV / TXT. */
export function formatExport(
  records: ExportRecord[],
  format: 'json' | 'csv' | 'txt',
): { contentType: string; body: string } {
  if (format === 'json') {
    return {
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ exported_at: new Date().toISOString(), records }, null, 2),
    }
  }
  if (format === 'csv') {
    const headers = ['id', 'date', 'title', 'mood', 'tags', 'word_count', 'body']
    const lines = [headers.join(',')]
    for (const r of records) {
      lines.push(
        [r.id, r.date, r.title, r.mood, r.tags.join('|'), String(r.word_count), r.body]
          .map(csvEscape)
          .join(','),
      )
    }
    return { contentType: 'text/csv; charset=utf-8', body: lines.join('\n') }
  }
  const out: string[] = [`Journal export — ${new Date().toISOString()}`, '']
  for (const r of records) {
    out.push(`# ${r.date}  •  ${r.mood.toUpperCase()}`)
    if (r.title) out.push(`## ${r.title}`)
    out.push('')
    out.push(r.body)
    if (r.tags.length > 0) out.push(`Tags: ${r.tags.join(', ')}`)
    out.push('')
    out.push('-----')
    out.push('')
  }
  return { contentType: 'text/plain; charset=utf-8', body: out.join('\n') }
}
