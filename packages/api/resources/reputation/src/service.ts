/**
 * Reputation persistence service.
 *
 * Combines the pure {@link computeLevel} engine with abstract
 * `DataStore` calls (no raw SQL) to read and write reputation state
 * from the bound database provider.
 *
 * Tables:
 *  - `reputation_scores` — one row per user (PK `userId`).
 *  - `reputation_events` — append-only audit log.
 *  - `badges` — idempotent `(userId, kind)` awards.
 *
 * @module
 */

import {
  create as dbCreate,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'

import { computeLevel } from './engine.js'
import type { Badge, ReputationEvent, ReputationEventSource, ReputationScore } from './types.js'

const SCORES_TABLE = 'reputation_scores'
const EVENTS_TABLE = 'reputation_events'
const BADGES_TABLE = 'badges'

/**
 * Persisted score row shape (matches `__setup__/reputation_scores.sql`).
 *
 * `updatedAt` is `string` here because most database providers
 * serialise timestamps as ISO strings.
 */
interface ReputationScoreRow {
  userId: string
  score: number
  level: number
  updatedAt: string
}

/**
 * Persisted event row shape (matches `__setup__/reputation_events.sql`).
 */
interface ReputationEventRow {
  id: string
  userId: string
  kind: string
  delta: number
  sourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

/**
 * Persisted badge row shape (matches `__setup__/badges.sql`).
 */
interface BadgeRow {
  id: string
  userId: string
  kind: string
  awardedAt: string
}

/**
 * Converts a stored score row to the public {@link ReputationScore}.
 *
 * @param row - Stored row.
 * @returns Public score.
 */
function rowToScore(row: ReputationScoreRow): ReputationScore {
  return {
    userId: row.userId,
    score: row.score,
    level: row.level,
    updatedAt: new Date(row.updatedAt),
  }
}

/**
 * Converts a stored event row to the public {@link ReputationEvent}.
 *
 * @param row - Stored row.
 * @returns Public event.
 */
function rowToEvent(row: ReputationEventRow): ReputationEvent {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    delta: row.delta,
    sourceId: row.sourceId,
    metadata: row.metadata,
    createdAt: new Date(row.createdAt),
  }
}

/**
 * Converts a stored badge row to the public {@link Badge}.
 *
 * @param row - Stored row.
 * @returns Public badge.
 */
function rowToBadge(row: BadgeRow): Badge {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    awardedAt: new Date(row.awardedAt),
  }
}

/**
 * Returns a zeroed score for a user with no recorded events.
 *
 * @param userId - The user identifier.
 * @returns A zeroed {@link ReputationScore}.
 */
function zeroedScore(userId: string): ReputationScore {
  return {
    userId,
    score: 0,
    level: 0,
    updatedAt: new Date(0),
  }
}

/**
 * Reads the persisted score row for a user, or `null` when none exists.
 *
 * @param userId - The user identifier.
 * @returns The stored row, or `null`.
 */
async function findScoreRow(userId: string): Promise<ReputationScoreRow | null> {
  return findOne<ReputationScoreRow>(SCORES_TABLE, [
    { field: 'userId', operator: '=', value: userId },
  ])
}

/**
 * Records a reputation event and atomically bumps the user's score.
 *
 * Appends a row to `reputation_events` and then upserts the user's
 * row in `reputation_scores`. The new level is recomputed from the
 * resulting score using {@link computeLevel}.
 *
 * @param userId - The user identifier.
 * @param kind - Domain-specific event kind (e.g. `vote`, `like`).
 * @param delta - Signed integer applied to the user's score.
 * @param source - Optional source descriptor (`sourceId`, `metadata`).
 * @returns The updated {@link ReputationScore}.
 */
export async function recordEvent(
  userId: string,
  kind: string,
  delta: number,
  source?: ReputationEventSource,
): Promise<ReputationScore> {
  const now = new Date()

  await dbCreate(EVENTS_TABLE, {
    userId,
    kind,
    delta,
    sourceId: source?.sourceId ?? null,
    metadata: source?.metadata ?? null,
    createdAt: now,
  })

  const existing = await findScoreRow(userId)
  if (!existing) {
    const nextScore = delta
    const nextLevel = computeLevel(nextScore)
    const result = await dbCreate<ReputationScoreRow>(SCORES_TABLE, {
      userId,
      score: nextScore,
      level: nextLevel,
      updatedAt: now,
    })
    return result.data
      ? rowToScore(result.data)
      : { userId, score: nextScore, level: nextLevel, updatedAt: now }
  }

  const nextScore = existing.score + delta
  const nextLevel = computeLevel(nextScore)
  const result = await updateById<ReputationScoreRow>(SCORES_TABLE, userId, {
    score: nextScore,
    level: nextLevel,
    updatedAt: now,
  })
  return result.data
    ? rowToScore(result.data)
    : { userId, score: nextScore, level: nextLevel, updatedAt: now }
}

/**
 * Reads the current score for a user. Returns a zeroed score when no
 * row exists.
 *
 * @param userId - The user identifier.
 * @returns The current {@link ReputationScore}.
 */
export async function getScore(userId: string): Promise<ReputationScore> {
  const row = await findScoreRow(userId)
  return row ? rowToScore(row) : zeroedScore(userId)
}

/**
 * Reads recent reputation events for a user, newest first.
 *
 * @param userId - The user identifier.
 * @param limit - Maximum number of events to return (default `50`).
 * @returns An array of {@link ReputationEvent}s.
 */
export async function getEvents(userId: string, limit = 50): Promise<ReputationEvent[]> {
  const rows = await findMany<ReputationEventRow>(EVENTS_TABLE, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit,
  })
  return rows.map(rowToEvent)
}

/**
 * Awards a badge to a user. Idempotent: if a badge of the same kind
 * already exists, the existing record is returned unchanged.
 *
 * @param userId - The user identifier.
 * @param badgeKind - Badge kind (e.g. `first-post`, `top-1-percent`).
 * @returns The (possibly pre-existing) {@link Badge}.
 */
export async function awardBadge(userId: string, badgeKind: string): Promise<Badge> {
  const existing = await findOne<BadgeRow>(BADGES_TABLE, [
    { field: 'userId', operator: '=', value: userId },
    { field: 'kind', operator: '=', value: badgeKind },
  ])
  if (existing) return rowToBadge(existing)

  const now = new Date()
  const result = await dbCreate<BadgeRow>(BADGES_TABLE, {
    userId,
    kind: badgeKind,
    awardedAt: now,
  })
  if (result.data) return rowToBadge(result.data)

  return { id: '', userId, kind: badgeKind, awardedAt: now }
}

/**
 * Lists all badges awarded to a user, newest first.
 *
 * @param userId - The user identifier.
 * @returns An array of {@link Badge}s.
 */
export async function listBadges(userId: string): Promise<Badge[]> {
  const rows = await findMany<BadgeRow>(BADGES_TABLE, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'awardedAt', direction: 'desc' }],
  })
  return rows.map(rowToBadge)
}

/**
 * Revokes a badge from a user. No-op when the badge is not present.
 *
 * @param userId - The user identifier.
 * @param badgeKind - Badge kind to revoke.
 * @returns `true` when a badge was removed, `false` otherwise.
 */
export async function revokeBadge(userId: string, badgeKind: string): Promise<boolean> {
  const result = await deleteMany(BADGES_TABLE, [
    { field: 'userId', operator: '=', value: userId },
    { field: 'kind', operator: '=', value: badgeKind },
  ])
  return result.affected > 0
}
