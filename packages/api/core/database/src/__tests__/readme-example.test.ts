/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the SQLite bond against a
 * real database file in a temp dir (no mocks: better-sqlite3 runs in-process).
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createMigrator, pool, store } from '@molecule/api-database-sqlite'

import { count, create, deleteById, findMany, findOne, setPool, setStore } from '../index.js'

interface Note {
  id: string
  user_id: string
  title: string
  status: 'open' | 'done'
}

describe('README @example', () => {
  const originalCwd = process.cwd()
  const originalPath = process.env.SQLITE_PATH
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'database-core-readme-'))
    await mkdir(join(root, 'migrations'))
    await writeFile(
      join(root, 'migrations/001_notes.sql'),
      `CREATE TABLE IF NOT EXISTS "notes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" text NOT NULL,
        "status" text NOT NULL
      );`,
    )
    process.chdir(root)
    process.env.SQLITE_PATH = join(root, 'data/app.db')
  })

  afterAll(async () => {
    await pool.end()
    process.chdir(originalCwd)
    if (originalPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = originalPath
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('migrates, bonds, and runs owner-scoped create → findMany → count → findOne → delete', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await createMigrator(join(process.cwd(), 'migrations'))()
    setPool(pool)
    setStore(store)

    const userId = '5b0f6f3e-2c1a-4a8e-9a57-6d2f1c0e7b11'
    const otherUser = '9d1c2b3a-0000-4000-8000-000000000002'
    await create<Note>('notes', { user_id: otherUser, title: 'Not yours', status: 'open' })
    const { data: note } = await create<Note>('notes', {
      user_id: userId,
      title: 'Buy milk',
      status: 'open',
    })
    expect(note?.id).toMatch(/^[0-9a-f-]{36}$/)

    const mine = await findMany<Note>('notes', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'title', direction: 'asc' }],
      limit: 50,
    })
    expect(mine.map((row) => row.title)).toEqual(['Buy milk'])

    const openCount = await count('notes', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'open' },
    ])
    expect(openCount).toBe(1)

    const noteId = note?.id ?? ''
    const owned = await findOne<Note>('notes', [
      { field: 'id', operator: '=', value: noteId },
      { field: 'user_id', operator: '=', value: userId },
    ])
    expect(owned?.title).toBe('Buy milk')
    if (owned) await deleteById('notes', owned.id)

    expect(await count('notes', [{ field: 'user_id', operator: '=', value: userId }])).toBe(0)
    // The other user's row is untouched.
    expect(await count('notes')).toBe(1)
  })
})
