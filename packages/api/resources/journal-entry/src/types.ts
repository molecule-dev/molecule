/**
 * Shared types for the journal-entry resource.
 *
 * @module
 */

/** Discrete mood-level labels mapped to a 1..5 score. */
export type MoodLevel = 'radiant' | 'good' | 'neutral' | 'low' | 'struggling'

/** Row shape persisted in `journal_entries`. */
export interface JournalEntryRow {
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

/** Row shape persisted in `mood_entries`. */
export interface MoodEntryRow {
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

/** Public-facing decrypted entry (returned by the service / routes). */
export interface PublicJournalEntry {
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

export const SCORE_BY_LEVEL: Record<MoodLevel, number> = {
  radiant: 5,
  good: 4,
  neutral: 3,
  low: 2,
  struggling: 1,
}

/** Round + clamp a raw score and return its discrete label. */
export function levelByScore(score: number | null | undefined): MoodLevel {
  const n = Math.max(1, Math.min(5, Math.round(Number(score ?? 3))))
  return ['struggling', 'low', 'neutral', 'good', 'radiant'][n - 1] as MoodLevel
}

/** Normalize a 1..5 score to 0..1 (useful for sparkline charts). */
export function normalizeScore(score: number | null | undefined): number {
  if (score == null) return 0.5
  return Math.max(0, Math.min(1, (Number(score) - 1) / 4))
}
