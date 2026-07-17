/**
 * Schema portability tests — proves the shipped `__setup__` DDL is genuinely
 * dialect-agnostic by executing it VERBATIM (no dialect translation) against an
 * in-memory SQLite database and round-tripping rows.
 *
 * SQLite is the strictest of the three official bonds for *this* DDL: unlike
 * MySQL (whose bond rewrites `UUID`/`TIMESTAMPTZ`/partial indexes at migrate
 * time) SQLite applies the .sql raw, so anything Postgres-only (`now()`,
 * `gen_random_uuid()`) would throw here. The DDL therefore uses only portable
 * SQL — ids are supplied by the app/DataStore, timestamps default via the
 * standard `CURRENT_TIMESTAMP`.
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'

const DDL = readFileSync(
  fileURLToPath(new URL('../__setup__/leaderboard_events.sql', import.meta.url)),
  'utf-8',
)

describe('@molecule/api-leaderboard schema portability', () => {
  it('executes the shipped DDL verbatim on SQLite (no dialect translation) and creates both tables + the partial index', () => {
    const db = new Database(':memory:')
    try {
      expect(() => db.exec(DDL)).not.toThrow()

      const tables = (
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
          name: string
        }[]
      ).map((r) => r.name)
      expect(tables).toEqual(expect.arrayContaining(['leaderboard_events', 'leaderboard_rollups']))

      const indexes = (
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as {
          name: string
        }[]
      ).map((r) => r.name)
      // The partial index (`WHERE scope_key IS NOT NULL`) is the most
      // dialect-sensitive object — assert it applied.
      expect(indexes).toContain('idx_leaderboard_events_scope')
    } finally {
      db.close()
    }
  })

  it('round-trips an event row: app-supplied id persists and the createdAt CURRENT_TIMESTAMP default fires', () => {
    const db = new Database(':memory:')
    try {
      db.exec(DDL)
      const id = randomUUID()
      // Mirrors what the DataStore writes in recordMetric (id injected by the
      // store, createdAt left to the column default).
      db.prepare(
        'INSERT INTO "leaderboard_events" ("id", "user_id", "metric", "value", "scope_key", "occurred_at") VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, randomUUID(), 'xp', 42.5, null, '2026-05-01T12:00:00.000Z')

      const row = db.prepare('SELECT * FROM "leaderboard_events" WHERE "id" = ?').get(id) as Record<
        string,
        unknown
      >
      expect(row.id).toBe(id)
      expect(row.metric).toBe('xp')
      expect(row.value).toBe(42.5)
      expect(row.occurred_at).toBe('2026-05-01T12:00:00.000Z')
      // No createdAt was supplied — the portable DEFAULT CURRENT_TIMESTAMP must
      // have populated it.
      expect(row.createdAt).toBeTruthy()
    } finally {
      db.close()
    }
  })

  it('round-trips a rollup row and enforces the composite window UNIQUE constraint', () => {
    const db = new Database(':memory:')
    try {
      db.exec(DDL)
      const insert = db.prepare(
        'INSERT INTO "leaderboard_rollups" ("id", "metric", "window_kind", "window_start", "window_end", "scope_key", "user_id", "score", "rank") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      insert.run(
        randomUUID(),
        'xp',
        'weekly',
        '2026-04-27T00:00:00.000Z',
        '2026-05-04T00:00:00.000Z',
        'cohort-a',
        'user-1',
        30,
        1,
      )

      const stored = db
        .prepare('SELECT "score", "rank" FROM "leaderboard_rollups" WHERE "user_id" = ?')
        .get('user-1') as { score: number; rank: number }
      expect(stored.score).toBe(30)
      expect(stored.rank).toBe(1)

      // Same (metric, window_kind, window_start, scope_key, user_id) tuple must
      // collide on the UNIQUE constraint (non-null scope_key so the NULL-distinct
      // rule doesn't apply).
      expect(() =>
        insert.run(
          randomUUID(),
          'xp',
          'weekly',
          '2026-04-27T00:00:00.000Z',
          '2026-05-04T00:00:00.000Z',
          'cohort-a',
          'user-1',
          99,
          2,
        ),
      ).toThrow()
    } finally {
      db.close()
    }
  })
})
