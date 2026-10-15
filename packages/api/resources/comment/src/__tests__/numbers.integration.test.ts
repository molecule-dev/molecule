/**
 * Comment numbers against a real SQLite database through the real migrator:
 * the table SQL this package ships, the CRUD helpers, `withTransaction`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type DatabasePool, setPool, setStore } from '@molecule/api-database'
import { createMigrator, createPool, createStore } from '@molecule/api-database-sqlite'

import {
  commentNumbers,
  createNumberedComment,
  getCommentByNumber,
  numberComment,
} from '../numbers.js'
import { createComment } from '../service.js'

let dir: string
let pool: DatabasePool
let prevSqlitePath: string | undefined
const RESOURCE = '7c3f0d2e-0000-4000-8000-000000000001'
const USER = '7c3f0d2e-0000-4000-8000-000000000002'

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'comment-numbers-'))
  const migrations = join(dir, 'migrations')
  const setup = join(import.meta.dirname, '..', '__setup__')
  mkdirSync(migrations)
  writeFileSync(join(migrations, '0001_comments.sql'), readFileSync(join(setup, 'comments.sql')))
  writeFileSync(
    join(migrations, '0002_comment_numbers.sql'),
    readFileSync(join(setup, 'comment_numbers.sql')),
  )
  // The migrator reads the database path from SQLITE_PATH, like an app does.
  prevSqlitePath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = join(dir, 'app.db')
  await createMigrator(migrations)()
  pool = createPool({ path: join(dir, 'app.db') })
  setPool(pool)
  setStore(createStore(pool))
})
afterAll(async () => {
  await pool.end()
  if (prevSqlitePath === undefined) delete process.env.SQLITE_PATH
  else process.env.SQLITE_PATH = prevSqlitePath
  rmSync(dir, { recursive: true, force: true })
})

describe('comment numbers', () => {
  it('numbers new comments 1, 2, 3 and finds each by its number', async () => {
    const a = await createNumberedComment('article', RESOURCE, USER, { body: 'first' })
    const b = await createNumberedComment('article', RESOURCE, USER, { body: 'second' })
    expect([a.number, b.number]).toEqual([1, 2])
    expect((await getCommentByNumber(2))?.body).toBe('second')
    expect(await getCommentByNumber(99)).toBeNull()
  })

  it('gives an existing comment one number, however often it is asked', async () => {
    const c = await createComment('article', RESOURCE, USER, { body: 'later' })
    const n = await numberComment(c.id)
    expect(n).toBe(3)
    expect(await numberComment(c.id)).toBe(3)
    expect((await commentNumbers([c.id])).get(c.id)).toBe(3)
  })

  it('numbers concurrent creates uniquely', async () => {
    const made = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createNumberedComment('article', RESOURCE, USER, { body: `c${i}` }),
      ),
    )
    expect(new Set(made.map((m) => m.number)).size).toBe(5)
    expect(Math.min(...made.map((m) => m.number))).toBe(4)
  })
})
