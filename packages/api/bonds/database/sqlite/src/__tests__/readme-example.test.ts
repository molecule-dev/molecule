/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — against a real SQLite file, no mocks.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { create, findMany, setPool, setStore, updateById } from '@molecule/api-database'

import { createMigrator, pool, store } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  const originalPath = process.env.SQLITE_PATH
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'sqlite-readme-'))
    await mkdir(join(root, 'migrations'))
    await writeFile(
      join(root, 'migrations/001_posts.sql'),
      `CREATE TABLE IF NOT EXISTS "posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "status" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
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

  it('migrates, bonds and runs create → update → findMany on the SQLITE_PATH file', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await createMigrator(join(process.cwd(), 'migrations'))()
    setPool(pool)
    setStore(store)

    interface Post {
      id: string
      title: string
      status: 'draft' | 'published'
    }

    const { data: draft } = await create<Post>('posts', { title: 'Hello SQLite', status: 'draft' })
    expect(draft?.id).toMatch(/^[0-9a-f-]{36}$/)
    if (draft) {
      await updateById<Post>('posts', draft.id, { status: 'published' })
    }

    const published = await findMany<Post>('posts', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      orderBy: [{ field: 'title', direction: 'asc' }],
      limit: 20,
    })

    expect(published).toHaveLength(1)
    expect(published[0]).toMatchObject({
      id: draft?.id,
      title: 'Hello SQLite',
      status: 'published',
    })
  })
})
