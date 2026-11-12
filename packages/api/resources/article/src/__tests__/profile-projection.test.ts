/** Collection projections use a fixed number of relationship reads, without sharing request state. */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { createPool, createStore } from '@molecule/api-database-sqlite'

import { getFollowedIds } from '../../../follow/src/service.js'
import { getPublicProfiles } from '../../../user/src/profiles.js'

let directory: string
let pool: ReturnType<typeof createPool>
let store: ReturnType<typeof createStore>

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'collection-profiles-'))
  pool = createPool({ path: join(directory, 'app.db') })
  store = createStore(pool)
  setStore(store)
  await pool.query(`CREATE TABLE users (
    id TEXT PRIMARY KEY, username TEXT, name TEXT, bio TEXT, avatar TEXT,
    email TEXT, oauthData TEXT, planKey TEXT
  )`)
  await pool.query(`CREATE TABLE follows (
    id TEXT PRIMARY KEY, followerId TEXT, targetType TEXT, targetId TEXT
  )`)
  await pool.query(`INSERT INTO users VALUES
    ('writer', 'writer', 'A Writer', NULL, '/avatar.png', 'private@example.test', 'secret', 'paid'),
    ('reviewer', 'reviewer', NULL, 'Reader', NULL, 'reader@example.test', 'secret', 'free')`)
  await pool.query(`INSERT INTO follows VALUES
    ('one', 'viewer', 'user', 'writer'),
    ('two', 'other-viewer', 'user', 'reviewer'),
    ('three', 'viewer', 'collection', 'reviewer')`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await pool.end()
  rmSync(directory, { recursive: true, force: true })
})

/** Count provider reads, including the single-row reads used by a per-item projection. */
const readSpies = () => [
  vi.spyOn(store, 'findById'),
  vi.spyOn(store, 'findOne'),
  vi.spyOn(store, 'findMany'),
]

describe('batched collection profiles', () => {
  it('projects repeated authors with two reads, independent of collection size', async () => {
    const reads = readSpies()
    const items = Array.from({ length: 30 }, (_, id) => ({
      id,
      authorId: id % 2 ? 'writer' : 'reviewer',
    }))
    const ids = items.map((item) => item.authorId)
    const [profiles, followed] = await Promise.all([
      getPublicProfiles(ids),
      getFollowedIds('viewer', 'user', ids),
    ])
    const projected = items.map((item) => ({
      ...item,
      author: profiles.get(item.authorId),
      following: followed.has(item.authorId),
    }))
    expect(projected).toHaveLength(30)
    expect(projected[0]).toMatchObject({ author: { username: 'reviewer' }, following: false })
    expect(projected[1]).toMatchObject({ author: { username: 'writer' }, following: true })
    expect(reads.reduce((sum, spy) => sum + spy.mock.calls.length, 0)).toBe(2)
    expect(reads[2]).toHaveBeenNthCalledWith(1, 'users', {
      where: [{ field: 'id', operator: 'in', value: ['reviewer', 'writer'] }],
      select: ['id', 'username', 'name', 'bio', 'avatar'],
    })
  })

  it('uses public display fields and omits missing users', async () => {
    const profiles = await getPublicProfiles(['writer', 'missing', 'writer'])
    expect([...profiles.keys()]).toEqual(['writer'])
    expect(profiles.get('writer')).toEqual({
      id: 'writer',
      username: 'writer',
      name: 'A Writer',
      bio: null,
      avatar: '/avatar.png',
    })
  })

  it('does no reads for an empty collection or a visitor with no session', async () => {
    const reads = readSpies()
    expect(await getPublicProfiles([])).toEqual(new Map())
    expect(await getFollowedIds('viewer', 'user', [])).toEqual(new Set())
    expect(await getFollowedIds(null, 'user', ['writer'])).toEqual(new Set())
    expect(await getFollowedIds(undefined, 'user', ['writer'])).toEqual(new Set())
    expect(reads.every((spy) => spy.mock.calls.length === 0)).toBe(true)
  })

  it('supports a renamed directory and non-user targets in a library application', async () => {
    await pool.query('ALTER TABLE users RENAME TO contributors')
    const profiles = await getPublicProfiles(['reviewer'], { tableName: 'contributors' })
    expect(profiles.get('reviewer')?.bio).toBe('Reader')
    expect(await getFollowedIds('viewer', 'collection', ['reviewer', 'writer'])).toEqual(
      new Set(['reviewer']),
    )
    expect(await getFollowedIds('other-viewer', 'collection', ['reviewer'])).toEqual(new Set())
  })

  it("reads fresh data after updates and never reuses another viewer's follow state", async () => {
    expect((await getPublicProfiles(['writer'])).get('writer')?.bio).toBeNull()
    expect(await getFollowedIds('viewer', 'user', ['writer'])).toEqual(new Set(['writer']))
    await store.updateById('users', 'writer', { bio: 'Updated' })
    await pool.query('DELETE FROM follows WHERE id = $1', ['one'])
    expect((await getPublicProfiles(['writer'])).get('writer')?.bio).toBe('Updated')
    expect(await getFollowedIds('viewer', 'user', ['writer'])).toEqual(new Set())
    expect(await getFollowedIds('other-viewer', 'user', ['reviewer'])).toEqual(
      new Set(['reviewer']),
    )
  })

  it('does not truncate a collection to the paginated following-list default', async () => {
    const ids = Array.from({ length: 35 }, (_, i) => `topic-${i}`)
    for (const [i, id] of ids.entries()) {
      await pool.query('INSERT INTO follows VALUES ($1, $2, $3, $4)', [
        `edge-${i}`,
        'viewer',
        'topic',
        id,
      ])
    }
    const reads = readSpies()
    expect(await getFollowedIds('viewer', 'topic', ids)).toEqual(new Set(ids))
    expect(reads.reduce((sum, spy) => sum + spy.mock.calls.length, 0)).toBe(1)
  })

  it('propagates a provider failure instead of replacing profiles with empty results', async () => {
    await pool.query('DROP TABLE users')
    await expect(getPublicProfiles(['writer'])).rejects.toThrow()
  })
})
