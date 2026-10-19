/**
 * Comment numbers against a real SQLite database through the real migrator:
 * the table SQL this package ships, the CRUD helpers, and the default create
 * path — `createComment()` must number every comment it writes, so a caller
 * that lists with `commentNumbers()` and deletes by that number never sees a
 * silent `0` (X0 m207).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  create as dbCreate,
  type DatabasePool,
  deleteById,
  setPool,
  setStore,
} from '@molecule/api-database'
import { createMigrator, createPool, createStore } from '@molecule/api-database-sqlite'

import {
  commentNumbers,
  createNumberedComment,
  getCommentByNumber,
  numberComment,
} from '../numbers.js'
import { createComment, deleteComment, getCommentsByResource } from '../service.js'

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
  it('createComment numbers every comment, so list + commentNumbers gives 1..n', async () => {
    const a = await createComment('article', RESOURCE, USER, { body: 'first' })
    const b = await createComment('article', RESOURCE, USER, { body: 'second' })
    const c = await createComment('article', RESOURCE, USER, { body: 'third' })
    expect([a.number, b.number, c.number]).toEqual([1, 2, 3])

    const listed = await getCommentsByResource('article', RESOURCE)
    const numbers = await commentNumbers(listed.data.map((comment) => comment.id))
    expect(listed.data.map((comment) => numbers.get(comment.id)).sort()).toEqual([1, 2, 3])
    expect((await getCommentByNumber(2))?.body).toBe('second')
    expect(await getCommentByNumber(99)).toBeNull()
  })

  it('deletes by number: find it, then delete its UUID, and the number is gone', async () => {
    const numbered = await getCommentByNumber(2)
    expect(numbered?.body).toBe('second')

    expect(await deleteComment(numbered!.id, USER)).toBe(true)

    expect(await getCommentByNumber(2)).toBeNull()
    const listed = await getCommentsByResource('article', RESOURCE)
    expect(listed.total).toBe(2)
    expect(listed.data.map((comment) => comment.body).sort()).toEqual(['first', 'third'])
  })

  it('createNumberedComment is the same default create, keeping its name', async () => {
    const d = await createNumberedComment('article', RESOURCE, USER, { body: 'fourth' })
    expect(d.number).toBe(4)
  })

  it('numbers a comment inserted straight into the table, once, and never as 0', async () => {
    const inserted = await dbCreate<{ id: string }>('comments', {
      resourceType: 'article',
      resourceId: RESOURCE,
      userId: USER,
      parentId: null,
      body: 'raw',
      editedAt: null,
    })
    const id = inserted.data!.id

    // A raw row is the one case with no number; it must read as ABSENT, not 0.
    expect((await commentNumbers([id])).get(id)).toBeUndefined()
    expect(await numberComment(id)).toBe(5)
    expect(await numberComment(id)).toBe(5)
    expect((await commentNumbers([id])).get(id)).toBe(5)

    await deleteById('comments', id)
  })

  it('numbers concurrent creates uniquely', async () => {
    const made = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createNumberedComment('article', RESOURCE, USER, { body: `c${i}` }),
      ),
    )
    const numbers = made.map((m) => m.number)
    expect(new Set(numbers).size).toBe(5)
    // Deleted rows release their number, so just assert the sequence moved on.
    expect(Math.min(...numbers)).toBeGreaterThan(4)
  })
})
